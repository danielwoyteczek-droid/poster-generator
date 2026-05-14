import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { stripe } from '@/lib/stripe'
import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'
import type { AuthorizeExportResult } from '@/lib/b2b-subscription'

/**
 * PROJ-50: Atomic Credit-Check + Burn. Der KRITISCHE Hot-Path, der vor JEDEM
 * Export aufgerufen wird (Free, Trial, B2B, Re-Export). Server-side ist die
 * einzige vertrauenswuerdige Stelle — die Watermark-Antwort fuer den Client
 * kommt ausschliesslich von hier.
 *
 * Aufrufer: useMapExport/useStarMapExport/usePhotoExport
 * Liefert: { ok, watermark, isReExport, reason, tier }
 *
 * Bei Overage (credit_source='overage') wird zusaetzlich ein
 * stripe.billing.meterEvents-Record geschickt, damit Stripe das
 * Usage-Based-Billing am Periodenende abrechnet. Failt das, ist der
 * lokale Ledger-Eintrag bereits geschrieben — wir reporten den Fehler,
 * lassen den Export aber durch (Customer-friendly; Operator kann's manuell
 * nachreichen).
 */

const BodySchema = z.object({
  projectId: z.string().uuid(),
  format: z.enum(['png', 'pdf']),
})

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const parsed = BodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }
  const { projectId, format } = parsed.data

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  // Project-Ownership pruefen, bevor wir Credits abbuchen. RLS auf projects
  // sollte das eh schon erzwingen, aber eine explizite Pruefung gibt eine
  // klarere Fehlermeldung als ein leeres Ergebnis von authorize_export.
  const { data: project, error: projectErr } = await supabase
    .from('projects')
    .select('id')
    .eq('id', projectId)
    .maybeSingle()

  if (projectErr || !project) {
    return NextResponse.json({ error: 'Project not found or access denied' }, { status: 404 })
  }

  // Atomic RPC: pruefe Eligibility + buche ab in EINER Transaktion.
  // SECURITY DEFINER auf der Function umgeht RLS damit die Function alle
  // benoetigten Tabellen anfassen kann; wir nutzen createAdminClient() um
  // den authenticated-Role nicht ueberraschend zu erweitern.
  const admin = createAdminClient()
  const { data, error } = await admin.rpc('authorize_export', {
    p_user_id: user.id,
    p_project_id: projectId,
    p_format: format,
  })

  if (error) {
    console.error('[business/authorize-export] rpc error:', error)
    return NextResponse.json({ error: 'Authorization check failed' }, { status: 500 })
  }

  const rows = (data ?? []) as AuthorizeExportResult[]
  const result = rows[0]
  if (!result) {
    return NextResponse.json({ error: 'No authorization result returned' }, { status: 500 })
  }

  // Overage-Path: melde Stripe einen Usage-Record fuer den Metered-Plan.
  // Wir fragen erst hier nach der Subscription, um den Customer/Subscription
  // Item zu finden — passiert ja nur in <5% der Aufrufe.
  if (result.ok && result.credit_source === 'overage') {
    try {
      const { data: sub } = await admin
        .from('b2b_subscriptions')
        .select('stripe_subscription_id, stripe_customer_id')
        .eq('user_id', user.id)
        .in('status', ['active', 'trialing'])
        .maybeSingle()

      if (sub?.stripe_subscription_id && sub.stripe_customer_id) {
        // Finde das Metered-Subscription-Item auf der Stripe-Subscription.
        // Wir caching hier bewusst nicht — die Subscription hat max 2 Items
        // (Tier + Overage), der Lookup ist trivial.
        const stripeSub = await stripe.subscriptions.retrieve(sub.stripe_subscription_id)
        const meteredItem = stripeSub.items.data.find(
          (item) => item.price.recurring?.usage_type === 'metered',
        )
        if (meteredItem) {
          await stripe.billing.meterEvents.create({
            event_name: 'b2b_export_overage',
            payload: {
              stripe_customer_id: sub.stripe_customer_id,
              value: '1',
            },
            identifier: `overage_${user.id}_${projectId}_${Date.now()}`,
          })
        } else {
          console.warn(
            '[business/authorize-export] overage triggered but no metered item on subscription',
            sub.stripe_subscription_id,
          )
        }
      }
    } catch (err) {
      // Don't fail the export — customer-friendly. Operator gets alerted via
      // log monitoring. Manual reconciliation is possible via the ledger.
      console.error('[business/authorize-export] stripe meter event failed:', err)
    }
  }

  return NextResponse.json({
    ok: result.ok,
    watermark: result.watermark,
    isReExport: result.is_re_export,
    creditSource: result.credit_source,
    tier: result.tier_at_time,
    reason: result.reason,
  })
}
