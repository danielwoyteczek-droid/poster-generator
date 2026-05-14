import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'
import {
  FREE_TIER_MONTHLY_CREDITS,
  TIER_MONTHLY_CREDITS,
  TRIAL_CREDITS,
  isTrialTier,
  stripTrialPrefix,
  type Tier,
} from '@/lib/b2b-subscription'

/**
 * PROJ-50: Liefert den aktuellen Subscription-Status fuer den eingeloggten
 * User. Wird vom Editor-Credit-Chip und vom Account-Panel konsumiert.
 *
 * Antwort enthaelt:
 * - effective tier (free / starter / pro / business / trial_X)
 * - credits-remaining im aktuellen Zyklus (separates Feld fuer Rollover)
 * - rollover-credits + Verfallsdatum
 * - tier-monthly-quota (zur Anzeige "X/Y Credits")
 * - period-end (naechstes Renewal-Datum)
 * - trial-end (falls Trial aktiv)
 * - cancel-at-period-end (Banner "Dein Abo laeuft am ... aus")
 */

export async function GET(_req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  const admin = createAdminClient()

  // 1. Paid/Trial-Subscription pruefen (status in trialing/active/past_due).
  // Explicit row type because supabase-js generic without database.types.ts
  // returns a union with GenericStringError that doesn't narrow on truthy-check.
  type SubRow = {
    tier: string
    status: string
    credits_remaining: number
    rollover_credits: number
    rollover_expires_at: string | null
    current_period_end: string
    trial_end: string | null
    cancel_at_period_end: boolean
  }

  const subResult = await admin
    .from('b2b_subscriptions')
    .select('tier, status, credits_remaining, rollover_credits, rollover_expires_at, current_period_end, trial_end, cancel_at_period_end')
    .eq('user_id', user.id)
    .in('status', ['trialing', 'active', 'past_due'])
    .maybeSingle<SubRow>()

  const sub = subResult.data

  if (sub) {
    const dbTier = sub.tier as Tier
    const effectiveTier: Tier = sub.status === 'trialing' && !isTrialTier(dbTier)
      ? (`trial_${stripTrialPrefix(dbTier)}` as Tier)
      : dbTier

    const baseTier = stripTrialPrefix(effectiveTier)
    const monthlyQuota = baseTier === 'free' ? 0 : (TIER_MONTHLY_CREDITS[baseTier] ?? 0)

    return NextResponse.json({
      tier: effectiveTier,
      status: sub.status,
      creditsRemaining: sub.credits_remaining,
      rolloverCredits: sub.rollover_credits,
      rolloverExpiresAt: sub.rollover_expires_at,
      monthlyQuota: isTrialTier(effectiveTier) ? TRIAL_CREDITS : monthlyQuota,
      currentPeriodEnd: sub.current_period_end,
      trialEnd: sub.trial_end,
      cancelAtPeriodEnd: sub.cancel_at_period_end,
    })
  }

  // 2. Free-Tier-Status. Wenn noch keine Zeile existiert, ist der User
  // technisch "Free, 0 Credits verbraucht in aktueller Period (= Account-
  // Erstellung)". Wir erzeugen die Zeile NICHT hier — das passiert lazy
  // beim ersten Free-Export via authorize_export(). Das spart einen Write
  // fuer Browser-only-Visitors.
  const { data: freeUsage } = await admin
    .from('free_tier_usage')
    .select('period_start, credits_used')
    .eq('user_id', user.id)
    .maybeSingle()

  let creditsUsed = freeUsage?.credits_used ?? 0
  let periodStart = freeUsage?.period_start ?? null

  // Lazy-Reset: wenn period_start > 30 Tage her ist, ist die Server-Period
  // implizit vorbei. Anzeige reflektiert das schon ohne DB-Write.
  if (periodStart) {
    const ageMs = Date.now() - new Date(periodStart).getTime()
    if (ageMs > 30 * 24 * 60 * 60 * 1000) {
      creditsUsed = 0
      periodStart = null  // wird beim naechsten Export neu gesetzt
    }
  }

  const creditsRemaining = Math.max(0, FREE_TIER_MONTHLY_CREDITS - creditsUsed)
  const nextResetAt = periodStart
    ? new Date(new Date(periodStart).getTime() + 30 * 24 * 60 * 60 * 1000).toISOString()
    : null

  return NextResponse.json({
    tier: 'free' as const,
    status: 'active' as const,
    creditsRemaining,
    rolloverCredits: 0,
    rolloverExpiresAt: null,
    monthlyQuota: FREE_TIER_MONTHLY_CREDITS,
    currentPeriodEnd: nextResetAt,
    trialEnd: null,
    cancelAtPeriodEnd: false,
  })
}
