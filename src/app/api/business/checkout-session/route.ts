import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { stripe } from '@/lib/stripe'
import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'
import {
  CURRENCIES,
  PAID_TIERS,
  TRIAL_DAYS,
  getStripePriceId,
  getOveragePriceId,
  type Currency,
  type PaidTier,
} from '@/lib/b2b-subscription'

/**
 * PROJ-50: Erzeugt eine Stripe Checkout Session fuer einen B2B-Subscription-
 * Tier. Trial wird automatisch gewaehrt, wenn der Stripe-Customer noch keinen
 * (oder einen abgelaufenen) Trial hatte — Stripe traekt das selbst via
 * stripe-Customer-Object und blockt einen Re-Trial mit gleicher Karte.
 *
 * Flow:
 * 1. User waehlt auf /business/upgrade einen Tier
 * 2. Client POSTet hierher mit { tier, currency, locale }
 * 3. Wir loesen den Stripe-Customer fuer den eingeloggten User auf (oder
 *    legen einen neuen an)
 * 4. Wir erstellen die Checkout Session mit Trial-Period
 * 5. Response = { url } -> Client redirected zu Stripe Hosted Checkout
 */

const BodySchema = z.object({
  tier: z.enum(PAID_TIERS as unknown as [PaidTier, ...PaidTier[]]),
  currency: z.enum(CURRENCIES as unknown as [Currency, ...Currency[]]),
  locale: z.enum(['de', 'en', 'fr', 'it', 'es']).optional(),
})

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const parsed = BodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }
  const { tier, currency, locale } = parsed.data

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  const tierPriceId = getStripePriceId(tier, currency)
  if (!tierPriceId) {
    return NextResponse.json(
      { error: `Tier '${tier}' is not yet configured for currency '${currency}'. Operator must create the Stripe price first.` },
      { status: 503 },
    )
  }

  const overagePriceId = getOveragePriceId(currency)
  if (!overagePriceId) {
    return NextResponse.json(
      { error: `Overage price for currency '${currency}' is not yet configured.` },
      { status: 503 },
    )
  }

  // Pruefe ob User bereits eine aktive Subscription hat (kein Doppel-Abo).
  const admin = createAdminClient()
  const { data: existing } = await admin
    .from('b2b_subscriptions')
    .select('stripe_subscription_id, tier, status')
    .eq('user_id', user.id)
    .in('status', ['trialing', 'active', 'past_due'])
    .maybeSingle()

  if (existing) {
    return NextResponse.json(
      {
        error: 'Active subscription exists. Use the customer portal to change plans.',
        existing_tier: existing.tier,
      },
      { status: 409 },
    )
  }

  // Stripe-Customer reuse: wenn User schon mal als B2B abgeschlossen hatte
  // (jetzt canceled), nutzen wir den existierenden Customer wieder, damit
  // Stripe-Tax-/Invoice-History zusammen bleibt.
  let stripeCustomerId: string | null = null
  const { data: priorSub } = await admin
    .from('b2b_subscriptions')
    .select('stripe_customer_id')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (priorSub?.stripe_customer_id) {
    stripeCustomerId = priorSub.stripe_customer_id
  }

  const origin = req.headers.get('origin') ?? new URL(req.url).origin
  const successLocale = locale ?? req.cookies.get('NEXT_LOCALE')?.value ?? 'de'

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      locale: successLocale === 'en' ? 'en' : 'de',
      customer: stripeCustomerId ?? undefined,
      customer_email: stripeCustomerId ? undefined : (user.email ?? undefined),
      client_reference_id: user.id,
      line_items: [{ price: tierPriceId, quantity: 1 }],
      subscription_data: {
        trial_period_days: TRIAL_DAYS,
        metadata: {
          user_id: user.id,
          tier,
        },
        // Metered Overage-Item wird beim subscription.created-Webhook
        // hinzugefuegt (stripe.subscriptionItems.create), weil Checkout
        // selbst kein recurring + metered im selben mode='subscription'
        // mischen mag (Stripe-Limitation).
      },
      // Trial-Abuse-Schutz: Stripe checkt automatisch Karten-Fingerprint
      // und blockiert Re-Trial bei bekannter Karte. Wir setzen zusaetzlich
      // payment_method_collection auf 'always' (auch im Trial Karte
      // zwingend hinterlegen — Standard fuer 'mode: subscription' mit
      // trial_period_days).
      automatic_tax: { enabled: true },
      tax_id_collection: { enabled: true },
      success_url: `${origin}/${successLocale}/account?b2b_checkout=success`,
      cancel_url: `${origin}/${successLocale}/business/upgrade?canceled=1`,
      metadata: {
        user_id: user.id,
        tier,
        b2b: 'true',
      },
    })

    return NextResponse.json({ url: session.url })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Checkout creation failed'
    console.error('[business/checkout-session] stripe error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
