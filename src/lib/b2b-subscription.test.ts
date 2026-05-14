/**
 * PROJ-50: Unit tests for pure helpers in b2b-subscription.ts.
 *
 * API-route + RPC + webhook-handler tests would require Stripe + Supabase
 * mocking that isn't established in this repo — those scenarios are covered
 * in the /qa phase with a live (test-mode) Stripe and the local Supabase.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  CURRENCIES,
  PAID_TIERS,
  TIER_MONTHLY_CREDITS,
  TRIAL_CREDITS,
  FREE_TIER_MONTHLY_CREDITS,
  ROLLOVER_VALIDITY_DAYS,
  TRIAL_DAYS,
  getStripePriceId,
  getOveragePriceId,
  tierFromStripePriceId,
  mapStripeStatus,
  toTierWithTrial,
  isTrialTier,
  stripTrialPrefix,
} from './b2b-subscription'

describe('Tier constants', () => {
  it('has 3 paid tiers in expected order', () => {
    expect(PAID_TIERS).toEqual(['starter', 'pro', 'business'])
  })

  it('has 3 currencies', () => {
    expect(CURRENCIES).toEqual(['eur', 'usd', 'gbp'])
  })

  it('has conservative monthly credits per tier', () => {
    expect(TIER_MONTHLY_CREDITS.starter).toBe(25)
    expect(TIER_MONTHLY_CREDITS.pro).toBe(100)
    expect(TIER_MONTHLY_CREDITS.business).toBe(300)
  })

  it('has 3 trial credits per spec', () => {
    expect(TRIAL_CREDITS).toBe(3)
  })

  it('has 7-day trial window', () => {
    expect(TRIAL_DAYS).toBe(7)
  })

  it('has 3 free credits per month', () => {
    expect(FREE_TIER_MONTHLY_CREDITS).toBe(3)
  })

  it('has 30-day rollover validity (= 1 full follow-up cycle)', () => {
    expect(ROLLOVER_VALIDITY_DAYS).toBe(30)
  })
})

describe('getStripePriceId', () => {
  const ORIGINAL_ENV = { ...process.env }

  beforeEach(() => {
    // Clear any test envs that might bleed in
    for (const tier of PAID_TIERS) {
      for (const currency of CURRENCIES) {
        delete process.env[`STRIPE_PRICE_B2B_${tier.toUpperCase()}_${currency.toUpperCase()}`]
      }
    }
  })

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV }
  })

  it('returns the env value when configured', () => {
    process.env.STRIPE_PRICE_B2B_PRO_EUR = 'price_test_pro_eur'
    expect(getStripePriceId('pro', 'eur')).toBe('price_test_pro_eur')
  })

  it('returns null when env is missing', () => {
    expect(getStripePriceId('pro', 'eur')).toBeNull()
  })

  it('returns null when env is empty string', () => {
    process.env.STRIPE_PRICE_B2B_PRO_EUR = ''
    expect(getStripePriceId('pro', 'eur')).toBeNull()
  })

  it('returns null when env is whitespace only', () => {
    process.env.STRIPE_PRICE_B2B_PRO_EUR = '   '
    expect(getStripePriceId('pro', 'eur')).toBeNull()
  })

  it('uses tier and currency case-insensitively in env name', () => {
    process.env.STRIPE_PRICE_B2B_STARTER_USD = 'price_starter_usd'
    expect(getStripePriceId('starter', 'usd')).toBe('price_starter_usd')
  })
})

describe('getOveragePriceId', () => {
  const ORIGINAL_ENV = { ...process.env }

  beforeEach(() => {
    for (const currency of CURRENCIES) {
      delete process.env[`STRIPE_PRICE_B2B_OVERAGE_${currency.toUpperCase()}`]
    }
  })

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV }
  })

  it('returns the env value when configured', () => {
    process.env.STRIPE_PRICE_B2B_OVERAGE_EUR = 'price_overage_eur'
    expect(getOveragePriceId('eur')).toBe('price_overage_eur')
  })

  it('returns null when env is missing', () => {
    expect(getOveragePriceId('eur')).toBeNull()
  })
})

describe('tierFromStripePriceId', () => {
  const ORIGINAL_ENV = { ...process.env }

  beforeEach(() => {
    for (const tier of PAID_TIERS) {
      for (const currency of CURRENCIES) {
        delete process.env[`STRIPE_PRICE_B2B_${tier.toUpperCase()}_${currency.toUpperCase()}`]
      }
    }
  })

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV }
  })

  it('reverse-maps a configured price id to its tier', () => {
    process.env.STRIPE_PRICE_B2B_PRO_EUR = 'price_pro_eur_xyz'
    process.env.STRIPE_PRICE_B2B_STARTER_USD = 'price_starter_usd_xyz'

    expect(tierFromStripePriceId('price_pro_eur_xyz')).toBe('pro')
    expect(tierFromStripePriceId('price_starter_usd_xyz')).toBe('starter')
  })

  it('returns null for an unknown price id', () => {
    process.env.STRIPE_PRICE_B2B_PRO_EUR = 'price_pro_eur_xyz'
    expect(tierFromStripePriceId('price_some_unknown_id')).toBeNull()
  })

  it('returns null when no prices are configured at all', () => {
    expect(tierFromStripePriceId('price_anything')).toBeNull()
  })
})

describe('mapStripeStatus', () => {
  it('maps trialing -> trialing', () => {
    expect(mapStripeStatus('trialing')).toBe('trialing')
  })

  it('maps active -> active', () => {
    expect(mapStripeStatus('active')).toBe('active')
  })

  it('coalesces unpaid into past_due (we want sub paused on first fail)', () => {
    expect(mapStripeStatus('past_due')).toBe('past_due')
    expect(mapStripeStatus('unpaid')).toBe('past_due')
  })

  it('coalesces incomplete_expired into canceled (terminal state)', () => {
    expect(mapStripeStatus('canceled')).toBe('canceled')
    expect(mapStripeStatus('incomplete_expired')).toBe('canceled')
  })

  it('keeps incomplete distinct (recoverable)', () => {
    expect(mapStripeStatus('incomplete')).toBe('incomplete')
  })

  it('maps paused -> paused', () => {
    expect(mapStripeStatus('paused')).toBe('paused')
  })
})

describe('toTierWithTrial', () => {
  it('wraps paid tier with trial_ prefix when trialing', () => {
    expect(toTierWithTrial('starter', true)).toBe('trial_starter')
    expect(toTierWithTrial('pro', true)).toBe('trial_pro')
    expect(toTierWithTrial('business', true)).toBe('trial_business')
  })

  it('returns plain tier when not trialing', () => {
    expect(toTierWithTrial('pro', false)).toBe('pro')
  })
})

describe('isTrialTier', () => {
  it('returns true for trial_X', () => {
    expect(isTrialTier('trial_starter')).toBe(true)
    expect(isTrialTier('trial_pro')).toBe(true)
    expect(isTrialTier('trial_business')).toBe(true)
  })

  it('returns false for free and paid tiers', () => {
    expect(isTrialTier('free')).toBe(false)
    expect(isTrialTier('starter')).toBe(false)
    expect(isTrialTier('pro')).toBe(false)
    expect(isTrialTier('business')).toBe(false)
  })
})

describe('stripTrialPrefix', () => {
  it('strips trial_ prefix from trial tiers', () => {
    expect(stripTrialPrefix('trial_starter')).toBe('starter')
    expect(stripTrialPrefix('trial_pro')).toBe('pro')
    expect(stripTrialPrefix('trial_business')).toBe('business')
  })

  it('passes through paid tiers', () => {
    expect(stripTrialPrefix('starter')).toBe('starter')
    expect(stripTrialPrefix('pro')).toBe('pro')
    expect(stripTrialPrefix('business')).toBe('business')
  })

  it('passes through free', () => {
    expect(stripTrialPrefix('free')).toBe('free')
  })
})
