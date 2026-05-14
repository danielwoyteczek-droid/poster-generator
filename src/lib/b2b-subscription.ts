/**
 * PROJ-50: B2B Credits-Abo — Tier definitions, types, and credit-state
 * helpers. Server-side only (uses Stripe and admin Supabase client).
 *
 * Tier-Mapping zu Stripe-Price-IDs lebt in ENV-Variablen, damit der
 * Operator die Preise im Stripe-Dashboard aendern kann ohne Code-Deploy.
 * Initial sind die Price-IDs leer; der Code blockt Checkout-Calls fuer
 * unkonfigurierte Tiers mit einer klaren Fehlermeldung.
 */

import type Stripe from 'stripe'

// ---------------------------------------------------------------------
// Tier-Konfiguration
// ---------------------------------------------------------------------

export type PaidTier = 'starter' | 'pro' | 'business'
export type TrialTier = 'trial_starter' | 'trial_pro' | 'trial_business'
export type Tier = 'free' | PaidTier | TrialTier

export type Currency = 'eur' | 'usd' | 'gbp'

export const PAID_TIERS: readonly PaidTier[] = ['starter', 'pro', 'business'] as const
export const CURRENCIES: readonly Currency[] = ['eur', 'usd', 'gbp'] as const

/**
 * Initial-Credits pro Tier. Werte sind hier als Single-Source-of-Truth, weil
 * Stripe selbst keine "Credits"-Semantik kennt — wir leiten beim Renewal-
 * Webhook ueber den Stripe-Price-ID -> Tier-Mapping ab, wieviele Credits
 * der User bekommt.
 *
 * Aenderbar (z.B. wenn Wettbewerbsanalyse ergibt, dass Pro 150 Credits braucht
 * statt 100). Bestehende Abos behalten ihren initialen Tier-Wert bis Stripe
 * den Price wechselt.
 */
export const TIER_MONTHLY_CREDITS: Record<PaidTier, number> = {
  starter: 25,
  pro: 100,
  business: 300,
}

/**
 * Trial-Credits sind tier-unabhaengig. Spec: 3 Credits / 7 Tage.
 */
export const TRIAL_CREDITS = 3

/**
 * Trial-Dauer in Tagen.
 */
export const TRIAL_DAYS = 7

/**
 * Free-Tier-Credits pro Rolling-30d-Period. Quelle: PROJ-50 Spec.
 * Auch in der SQL-Function authorize_export() hartkodiert (v_free_limit).
 * Aenderung erfordert Migration UND Code-Update.
 */
export const FREE_TIER_MONTHLY_CREDITS = 3

/**
 * Roll-Over-Cap: nicht verbrauchte Credits bleiben N Tage erhalten.
 * 30 = ein voller Folge-Zyklus.
 */
export const ROLLOVER_VALIDITY_DAYS = 30

// ---------------------------------------------------------------------
// Stripe-Price-ID-Resolver
// ---------------------------------------------------------------------

/**
 * ENV-Pattern: STRIPE_PRICE_B2B_<TIER>_<CURRENCY>
 * Beispiel: STRIPE_PRICE_B2B_PRO_EUR=price_1Ab...
 *
 * Leer = Tier ist (noch) nicht in Stripe konfiguriert. Checkout-Aufrufe
 * fuer leere Konfigurationen werfen einen Fehler.
 */
export function getStripePriceId(tier: PaidTier, currency: Currency): string | null {
  const key = `STRIPE_PRICE_B2B_${tier.toUpperCase()}_${currency.toUpperCase()}`
  const value = process.env[key]
  return value && value.trim().length > 0 ? value : null
}

/**
 * Overage-Metered-Price: 20 Cent (oder Aequivalent) pro zusaetzlichem Export
 * ueber Credit-Limit hinaus. Wird via stripe.billing.meterEvents an die
 * zugehoerige Subscription gemeldet.
 *
 * ENV-Pattern: STRIPE_PRICE_B2B_OVERAGE_<CURRENCY>
 */
export function getOveragePriceId(currency: Currency): string | null {
  const key = `STRIPE_PRICE_B2B_OVERAGE_${currency.toUpperCase()}`
  const value = process.env[key]
  return value && value.trim().length > 0 ? value : null
}

/**
 * Reverse-Mapping: Stripe-Price-ID -> Tier. Wird vom Webhook gebraucht, um
 * bei subscription.created/updated den Tier-Namen zu bestimmen. O(n*m) ueber
 * 9 Eintraege (3 tiers x 3 currencies) — kein Index noetig.
 */
export function tierFromStripePriceId(priceId: string): PaidTier | null {
  for (const tier of PAID_TIERS) {
    for (const currency of CURRENCIES) {
      if (getStripePriceId(tier, currency) === priceId) {
        return tier
      }
    }
  }
  return null
}

// ---------------------------------------------------------------------
// Stripe-Status -> DB-Status-Mapping
// ---------------------------------------------------------------------

export type SubscriptionStatus =
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'canceled'
  | 'incomplete'
  | 'paused'

/**
 * Stripe nutzt einige Status-Werte, die wir nicht 1:1 spiegeln (z.B.
 * 'unpaid', 'incomplete_expired'). Wir mappen sie auf das engere Set
 * aus der DB-CHECK-Constraint.
 *
 * 'past_due' triggert Account-Pause (spec: sofort pausieren bei 1.
 * Fehlschlag) — wir kuerzen den Stripe-Smart-Retry-Pfad bewusst ab.
 */
export function mapStripeStatus(stripeStatus: Stripe.Subscription.Status): SubscriptionStatus {
  switch (stripeStatus) {
    case 'trialing':
      return 'trialing'
    case 'active':
      return 'active'
    case 'past_due':
    case 'unpaid':
      return 'past_due'
    case 'canceled':
    case 'incomplete_expired':
      return 'canceled'
    case 'incomplete':
      return 'incomplete'
    case 'paused':
      return 'paused'
    default:
      // Defensive: unbekannter Status -> behandeln wie incomplete
      return 'incomplete'
  }
}

/**
 * Trialing-Subscription auf Trial-Tier mappen. Wenn Stripe sagt der User
 * trialing-t einen Pro-Plan, ist sein effektiver Tier 'trial_pro' (gleicher
 * Funktionsumfang wie Pro, aber 3 Trial-Credits statt 100).
 */
export function toTierWithTrial(paidTier: PaidTier, isTrialing: boolean): Tier {
  return isTrialing ? (`trial_${paidTier}` as TrialTier) : paidTier
}

/**
 * Tier-Detection von einem Tier-Wert: ist das eine Trial-Variante?
 */
export function isTrialTier(tier: Tier): tier is TrialTier {
  return tier.startsWith('trial_')
}

/**
 * Trial-Variante zurueck auf Basis-Tier mappen (z.B. fuer Display-Namen).
 */
export function stripTrialPrefix(tier: Tier): PaidTier | 'free' {
  if (tier === 'free') return 'free'
  if (isTrialTier(tier)) {
    return tier.replace('trial_', '') as PaidTier
  }
  return tier as PaidTier
}

// ---------------------------------------------------------------------
// Authorize-Export-Response (von SQL-Function)
// ---------------------------------------------------------------------

export interface AuthorizeExportResult {
  ok: boolean
  watermark: boolean
  is_re_export: boolean
  credit_source: 'free' | 'regular' | 'rollover' | 'overage' | 'trial' | 're_export' | null
  tier_at_time: Tier | null
  reason: 'free_exhausted' | 'trial_exhausted' | 'invalid_format' | null
}
