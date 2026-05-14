/**
 * PROJ-50: B2B-spezifische Stripe-Webhook-Handler. Vom haupt-Webhook-Route
 * dispatched.
 *
 * Idempotenz wird im Aufrufer (route.ts) via stripe_event_log gehandhabt —
 * jeder Handler hier kann davon ausgehen, dass das Event noch nie verarbeitet
 * wurde.
 */

import type Stripe from 'stripe'
import type { SupabaseClient } from '@supabase/supabase-js'
import { stripe } from './stripe'
import {
  TIER_MONTHLY_CREDITS,
  TRIAL_CREDITS,
  ROLLOVER_VALIDITY_DAYS,
  mapStripeStatus,
  tierFromStripePriceId,
  toTierWithTrial,
  getOveragePriceId,
  type Tier,
  type Currency,
} from './b2b-subscription'

type Admin = SupabaseClient

/**
 * Wird vom Webhook-Dispatcher aufgerufen, um zu entscheiden ob ein
 * checkout.session.completed-Event B2B-Charakter hat. B2B-Sessions duerfen
 * NICHT durch den bestehenden Order-Handler laufen (es gibt keinen
 * orders-Row dafuer).
 */
export function isB2BCheckoutSession(session: Stripe.Checkout.Session): boolean {
  return session.mode === 'subscription' && session.metadata?.b2b === 'true'
}

/**
 * subscription.created — feuert nach erfolgreichem Checkout (auch bei
 * Trial-Start ohne Belastung).
 *
 * Aufgaben:
 * 1. b2b_subscriptions-Row anlegen mit Tier/Status/Period/Credits
 * 2. Metered Overage Subscription-Item hinzufuegen (Stripe-Limitation: kann
 *    in Checkout mode='subscription' nicht zusammen mit dem Tier-Item
 *    angelegt werden)
 *
 * Im Trial-State setzen wir credits_remaining = TRIAL_CREDITS (3), nicht
 * den vollen Tier-Wert. Nach Trial-Ende kommt invoice.payment_succeeded
 * und gibt die vollen Tier-Credits.
 */
export async function handleSubscriptionCreated(
  admin: Admin,
  subscription: Stripe.Subscription,
): Promise<void> {
  const userId = subscription.metadata?.user_id
  if (!userId) {
    console.error('[b2b-webhook] subscription.created without user_id metadata', subscription.id)
    return
  }

  const tierItem = subscription.items.data.find(
    (item) => item.price.recurring?.usage_type !== 'metered',
  )
  if (!tierItem) {
    console.error('[b2b-webhook] subscription.created without tier item', subscription.id)
    return
  }

  const paidTier = tierFromStripePriceId(tierItem.price.id)
  if (!paidTier) {
    console.error(
      '[b2b-webhook] subscription.created with unknown price id',
      tierItem.price.id,
      '— check STRIPE_PRICE_B2B_* envs',
    )
    return
  }

  const isTrialing = subscription.status === 'trialing'
  const effectiveTier = toTierWithTrial(paidTier, isTrialing)
  const initialCredits = isTrialing ? TRIAL_CREDITS : TIER_MONTHLY_CREDITS[paidTier]

  const { error } = await admin.from('b2b_subscriptions').insert({
    user_id: userId,
    stripe_customer_id: typeof subscription.customer === 'string'
      ? subscription.customer
      : subscription.customer.id,
    stripe_subscription_id: subscription.id,
    stripe_price_id: tierItem.price.id,
    tier: effectiveTier,
    status: mapStripeStatus(subscription.status),
    current_period_start: new Date(tierItem.current_period_start * 1000).toISOString(),
    current_period_end: new Date(tierItem.current_period_end * 1000).toISOString(),
    trial_end: subscription.trial_end
      ? new Date(subscription.trial_end * 1000).toISOString()
      : null,
    cancel_at_period_end: subscription.cancel_at_period_end,
    credits_remaining: initialCredits,
    rollover_credits: 0,
    rollover_expires_at: null,
  })

  if (error) {
    console.error('[b2b-webhook] failed to insert b2b_subscriptions:', error)
    return
  }

  // Metered Overage-Item attachen, wenn noch nicht vorhanden.
  await ensureMeteredOverageItem(subscription, tierItem.price.currency as Currency)
}

/**
 * Stellt sicher, dass die Subscription ein Metered Overage Subscription-
 * Item hat. Idempotent — wenn schon vorhanden, no-op.
 */
async function ensureMeteredOverageItem(
  subscription: Stripe.Subscription,
  currency: Currency,
): Promise<void> {
  const alreadyHasMetered = subscription.items.data.some(
    (item) => item.price.recurring?.usage_type === 'metered',
  )
  if (alreadyHasMetered) return

  const overagePriceId = getOveragePriceId(currency)
  if (!overagePriceId) {
    console.warn(
      `[b2b-webhook] no overage price configured for currency '${currency}'; overage will silently fail`,
    )
    return
  }

  try {
    await stripe.subscriptionItems.create({
      subscription: subscription.id,
      price: overagePriceId,
    })
    console.log('[b2b-webhook] attached metered overage item to', subscription.id)
  } catch (err) {
    console.error('[b2b-webhook] failed to attach metered overage item:', err)
  }
}

/**
 * subscription.updated — feuert bei Tier-Wechseln, Status-Aenderungen
 * (paused/canceled-at-period-end), Trial-zu-Paid-Transitions.
 *
 * Period-Renewal-Logik (Rollover) passiert NICHT hier sondern in
 * invoice.payment_succeeded — weil "updated" feuert oft, ohne dass
 * tatsaechlich Geld geflossen ist.
 */
export async function handleSubscriptionUpdated(
  admin: Admin,
  subscription: Stripe.Subscription,
): Promise<void> {
  const tierItem = subscription.items.data.find(
    (item) => item.price.recurring?.usage_type !== 'metered',
  )
  if (!tierItem) {
    console.error('[b2b-webhook] subscription.updated without tier item', subscription.id)
    return
  }

  const paidTier = tierFromStripePriceId(tierItem.price.id)
  if (!paidTier) {
    console.error('[b2b-webhook] subscription.updated with unknown price id', tierItem.price.id)
    return
  }

  const isTrialing = subscription.status === 'trialing'
  const effectiveTier: Tier = toTierWithTrial(paidTier, isTrialing)

  const { error } = await admin
    .from('b2b_subscriptions')
    .update({
      tier: effectiveTier,
      status: mapStripeStatus(subscription.status),
      stripe_price_id: tierItem.price.id,
      current_period_start: new Date(tierItem.current_period_start * 1000).toISOString(),
      current_period_end: new Date(tierItem.current_period_end * 1000).toISOString(),
      trial_end: subscription.trial_end
        ? new Date(subscription.trial_end * 1000).toISOString()
        : null,
      cancel_at_period_end: subscription.cancel_at_period_end,
    })
    .eq('stripe_subscription_id', subscription.id)

  if (error) {
    console.error('[b2b-webhook] failed to update b2b_subscriptions:', error)
  }
}

/**
 * subscription.deleted — final cancellation (nach Periodenende ODER sofort
 * bei Operator-Manual-Cancel).
 *
 * Wir loeschen die Zeile NICHT, sondern markieren sie als 'canceled' damit
 * die History fuer den User sichtbar bleibt. Beim naechsten Checkout legen
 * wir eine neue Zeile an.
 *
 * Account faellt damit automatisch auf Free-Tier zurueck (keine
 * 'active'/'trialing'-Row -> authorize_export geht Free-Pfad).
 */
export async function handleSubscriptionDeleted(
  admin: Admin,
  subscription: Stripe.Subscription,
): Promise<void> {
  const { error } = await admin
    .from('b2b_subscriptions')
    .update({
      status: 'canceled',
      credits_remaining: 0,
      rollover_credits: 0,
    })
    .eq('stripe_subscription_id', subscription.id)

  if (error) {
    console.error('[b2b-webhook] failed to mark subscription canceled:', error)
  }
}

/**
 * invoice.payment_succeeded — der "echte" Period-Tick. Triggert:
 * - bei Erst-Trial-Conversion: Tier-Credits einfuellen, Tier-Status auf active
 * - bei normalem Renewal: Roll-Over alter Credits + neue Tier-Credits einfuellen
 * - bei Overage-Invoice am Periodenende: nichts (Stripe rechnet die metered
 *   usage automatisch ab; unsere Ledger-Eintraege liegen schon)
 */
export async function handleInvoicePaymentSucceeded(
  admin: Admin,
  invoice: Stripe.Invoice,
): Promise<void> {
  // 'subscription' ist nur auf Subscription-Invoices gesetzt; ueberspringe
  // alles andere (z.B. One-Time-Payments, die im selben Stripe-Konto laufen).
  // Stripe-API typings vary — robust via field access.
  const invoiceSub = (invoice as Stripe.Invoice & { subscription?: string | Stripe.Subscription | null })
    .subscription
  const subscriptionId =
    typeof invoiceSub === 'string'
      ? invoiceSub
      : invoiceSub?.id ?? null
  if (!subscriptionId) {
    return
  }

  const { data: dbSub } = await admin
    .from('b2b_subscriptions')
    .select('id, tier, credits_remaining, rollover_credits, current_period_start')
    .eq('stripe_subscription_id', subscriptionId)
    .maybeSingle()

  if (!dbSub) {
    console.warn('[b2b-webhook] invoice.payment_succeeded for unknown subscription', subscriptionId)
    return
  }

  // Stripe-Subscription frisch ziehen, damit wir die aktuellen Period-Daten
  // haben (invoice.lines reichen nicht immer).
  const subscription = await stripe.subscriptions.retrieve(subscriptionId)
  const tierItem = subscription.items.data.find(
    (item) => item.price.recurring?.usage_type !== 'metered',
  )
  if (!tierItem) return

  const paidTier = tierFromStripePriceId(tierItem.price.id)
  if (!paidTier) return

  const wasTrialing = (dbSub.tier as Tier).startsWith('trial_')
  const isTrialing = subscription.status === 'trialing'

  // Roll-Over-Logik: aktuelle credits_remaining werden zur Rollover-Bucket,
  // alte rollover_credits verfallen (die haetten bei expires_at sowieso
  // verfallen, aber zur Sicherheit ueberschreiben wir).
  // Bei Trial-zu-Paid-Transition: KEIN Rollover (Trial-Credits verfallen).
  const isTrialToPaidTransition = wasTrialing && !isTrialing

  const newRollover = isTrialToPaidTransition ? 0 : dbSub.credits_remaining
  const newCredits = isTrialing ? TRIAL_CREDITS : TIER_MONTHLY_CREDITS[paidTier]
  const rolloverExpiresAt = newRollover > 0
    ? new Date(Date.now() + ROLLOVER_VALIDITY_DAYS * 24 * 60 * 60 * 1000).toISOString()
    : null

  const effectiveTier = toTierWithTrial(paidTier, isTrialing)

  const { error } = await admin
    .from('b2b_subscriptions')
    .update({
      tier: effectiveTier,
      status: mapStripeStatus(subscription.status),
      credits_remaining: newCredits,
      rollover_credits: newRollover,
      rollover_expires_at: rolloverExpiresAt,
      current_period_start: new Date(tierItem.current_period_start * 1000).toISOString(),
      current_period_end: new Date(tierItem.current_period_end * 1000).toISOString(),
    })
    .eq('id', dbSub.id)

  if (error) {
    console.error('[b2b-webhook] failed to refresh credits on renewal:', error)
  }
}

/**
 * invoice.payment_failed — Spec: "Sofort pausieren bei 1. Fehlschlag".
 * Wir setzen status auf 'past_due' und nullen Credits, damit der User keine
 * Exports mehr triggern kann bis er die Karte aktualisiert.
 *
 * Stripe selbst macht Smart-Retries; wenn der naechste Retry klappt,
 * kommt invoice.payment_succeeded und der status wird wieder 'active'.
 */
export async function handleInvoicePaymentFailed(
  admin: Admin,
  invoice: Stripe.Invoice,
): Promise<void> {
  const invoiceSub = (invoice as Stripe.Invoice & { subscription?: string | Stripe.Subscription | null })
    .subscription
  const subscriptionId =
    typeof invoiceSub === 'string'
      ? invoiceSub
      : invoiceSub?.id ?? null
  if (!subscriptionId) return

  const { error } = await admin
    .from('b2b_subscriptions')
    .update({
      status: 'past_due',
      credits_remaining: 0,
      rollover_credits: 0,
    })
    .eq('stripe_subscription_id', subscriptionId)

  if (error) {
    console.error('[b2b-webhook] failed to mark subscription past_due:', error)
  }
}

/**
 * Dispatcher: routet Event-Type zum passenden Handler.
 * Liefert true wenn das Event B2B-relevant war (auch wenn der Handler kein-op
 * gemacht hat), damit der Aufrufer entscheiden kann, ob er weitere Handler
 * fuer nicht-B2B-Logik aufrufen soll.
 */
export async function dispatchB2BWebhookEvent(
  admin: Admin,
  event: Stripe.Event,
): Promise<boolean> {
  switch (event.type) {
    case 'customer.subscription.created':
      await handleSubscriptionCreated(admin, event.data.object as Stripe.Subscription)
      return true

    case 'customer.subscription.updated':
      await handleSubscriptionUpdated(admin, event.data.object as Stripe.Subscription)
      return true

    case 'customer.subscription.deleted':
      await handleSubscriptionDeleted(admin, event.data.object as Stripe.Subscription)
      return true

    case 'invoice.payment_succeeded':
      await handleInvoicePaymentSucceeded(admin, event.data.object as Stripe.Invoice)
      return true

    case 'invoice.payment_failed':
      await handleInvoicePaymentFailed(admin, event.data.object as Stripe.Invoice)
      return true

    case 'customer.subscription.trial_will_end':
      // Reserved fuer Mail-Notification an User ("Trial endet in 3 Tagen").
      // Implementierung in PROJ-50 ausgeklammert — Stripe schickt
      // automatisch eine eigene Mail. Eigene Mail kann in PROJ-51 mit
      // gebrandetem Template nachgeliefert werden.
      console.log('[b2b-webhook] trial_will_end:', (event.data.object as Stripe.Subscription).id)
      return true

    default:
      return false
  }
}
