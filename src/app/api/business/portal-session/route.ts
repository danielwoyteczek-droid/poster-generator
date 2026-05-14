import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'

/**
 * PROJ-50: Erzeugt eine Stripe Customer Portal Session. Der Portal handhabt
 * Plan-Wechsel, Karten-Update, Kuendigung, Rechnungs-Download — alles
 * out-of-the-box von Stripe gehostet.
 *
 * Voraussetzung: User hat (oder hatte) ein B2B-Abo, also gibt es einen
 * Stripe-Customer-Id. Free-User ohne Vorgeschichte kriegen 404 mit Hinweis.
 */

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  const admin = createAdminClient()
  const { data: sub } = await admin
    .from('b2b_subscriptions')
    .select('stripe_customer_id')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!sub?.stripe_customer_id) {
    return NextResponse.json(
      { error: 'No subscription history found. Please subscribe first.' },
      { status: 404 },
    )
  }

  const origin = req.headers.get('origin') ?? new URL(req.url).origin
  const locale = req.cookies.get('NEXT_LOCALE')?.value ?? 'de'

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: sub.stripe_customer_id,
      return_url: `${origin}/${locale}/account`,
    })

    return NextResponse.json({ url: session.url })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Portal session creation failed'
    console.error('[business/portal-session] stripe error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
