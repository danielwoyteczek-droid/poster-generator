import { describe, expect, it } from 'vitest'
import type Stripe from 'stripe'
import { validateVoucher, type VoucherCartLine } from './voucher-validation'

// ─── Test fixtures ────────────────────────────────────────────────────────────

const NOW = new Date('2026-05-14T12:00:00Z').getTime()
const PAST = new Date('2026-01-01T00:00:00Z').getTime() / 1000
const FUTURE = new Date('2027-01-01T00:00:00Z').getTime() / 1000

function makeCoupon(overrides: Partial<Stripe.Coupon> = {}): Stripe.Coupon {
  return {
    id: 'coupon_xyz',
    object: 'coupon',
    valid: true,
    amount_off: null,
    percent_off: 10,
    currency: null,
    duration: 'once',
    metadata: {},
    livemode: false,
    name: null,
    created: PAST,
    times_redeemed: 0,
    max_redemptions: null,
    redeem_by: null,
    applies_to: undefined,
    ...overrides,
  } as Stripe.Coupon
}

interface PromoOverrides extends Partial<Omit<Stripe.PromotionCode, 'promotion'>> {
  coupon?: Stripe.Coupon
}

function makePromo(overrides: PromoOverrides = {}): Stripe.PromotionCode {
  const { coupon: couponOverride, ...rest } = overrides
  const coupon = couponOverride ?? makeCoupon()
  return {
    id: 'promo_abc',
    object: 'promotion_code',
    active: true,
    code: 'TESTCODE',
    promotion: { coupon, type: 'coupon' },
    created: PAST,
    customer: null,
    customer_account: null,
    expires_at: null,
    livemode: false,
    max_redemptions: null,
    metadata: {},
    restrictions: {
      first_time_transaction: false,
      minimum_amount: null,
      minimum_amount_currency: null,
    },
    times_redeemed: 0,
    ...rest,
  } as Stripe.PromotionCode
}

const POSTER_LINE: VoucherCartLine = {
  stripePriceId: 'price_poster_a4',
  stripeProductId: 'prod_poster',
  amountCents: 2490,
}
const FRAME_LINE: VoucherCartLine = {
  stripePriceId: 'price_frame_markup_a4',
  stripeProductId: 'prod_frame_markup',
  amountCents: 1000,
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('validateVoucher', () => {
  it('accepts a valid 10%-off coupon and returns preview discount', () => {
    const result = validateVoucher({
      promotionCode: makePromo(),
      cartLines: [POSTER_LINE],
      currency: 'eur',
      subtotalCents: 2490,
      now: NOW,
    })
    expect(result.valid).toBe(true)
    if (result.valid) {
      expect(result.voucher.code).toBe('TESTCODE')
      expect(result.voucher.discountCents).toBe(249) // 10% of 2490
    }
  })

  it('accepts a fixed amount_off coupon capped to subtotal', () => {
    const result = validateVoucher({
      promotionCode: makePromo({
        coupon: makeCoupon({ amount_off: 5000, percent_off: null, currency: 'eur' }),
      }),
      cartLines: [POSTER_LINE],
      currency: 'eur',
      subtotalCents: 2490,
      now: NOW,
    })
    expect(result.valid).toBe(true)
    if (result.valid) {
      expect(result.voucher.discountCents).toBe(2490) // cap at subtotal
    }
  })

  it('rejects inactive promotion code as not_found', () => {
    const result = validateVoucher({
      promotionCode: makePromo({ active: false }),
      cartLines: [POSTER_LINE],
      currency: 'eur',
      subtotalCents: 2490,
      now: NOW,
    })
    expect(result.valid).toBe(false)
    if (!result.valid) expect(result.reason).toBe('not_found')
  })

  it('rejects expired promotion code', () => {
    const result = validateVoucher({
      promotionCode: makePromo({ expires_at: PAST }),
      cartLines: [POSTER_LINE],
      currency: 'eur',
      subtotalCents: 2490,
      now: NOW,
    })
    expect(result.valid).toBe(false)
    if (!result.valid) expect(result.reason).toBe('expired')
  })

  it('accepts a code whose expires_at is in the future', () => {
    const result = validateVoucher({
      promotionCode: makePromo({ expires_at: FUTURE }),
      cartLines: [POSTER_LINE],
      currency: 'eur',
      subtotalCents: 2490,
      now: NOW,
    })
    expect(result.valid).toBe(true)
  })

  it('rejects when max_redemptions reached', () => {
    const result = validateVoucher({
      promotionCode: makePromo({ max_redemptions: 100, times_redeemed: 100 }),
      cartLines: [POSTER_LINE],
      currency: 'eur',
      subtotalCents: 2490,
      now: NOW,
    })
    expect(result.valid).toBe(false)
    if (!result.valid) expect(result.reason).toBe('max_reached')
  })

  it('rejects when cart total under minimum_amount', () => {
    const result = validateVoucher({
      promotionCode: makePromo({
        restrictions: {
          first_time_transaction: false,
          minimum_amount: 5000,
          minimum_amount_currency: 'eur',
        },
      }),
      cartLines: [POSTER_LINE],
      currency: 'eur',
      subtotalCents: 2490,
      now: NOW,
    })
    expect(result.valid).toBe(false)
    if (!result.valid) {
      expect(result.reason).toBe('min_not_met')
      expect(result.minAmountMissingCents).toBe(2510)
    }
  })

  it('rejects when applies_to.products has no matching cart line', () => {
    const result = validateVoucher({
      promotionCode: makePromo({
        coupon: makeCoupon({
          applies_to: { products: ['prod_frame_markup'] },
        }),
      }),
      cartLines: [POSTER_LINE], // poster only — no frame
      currency: 'eur',
      subtotalCents: 2490,
      now: NOW,
    })
    expect(result.valid).toBe(false)
    if (!result.valid) expect(result.reason).toBe('not_applicable')
  })

  it('applies discount only to the matching product subtotal when restricted', () => {
    // "Free Frame" coupon: 100% off, restricted to frame_markup product
    const result = validateVoucher({
      promotionCode: makePromo({
        coupon: makeCoupon({
          percent_off: 100,
          applies_to: { products: ['prod_frame_markup'] },
        }),
      }),
      cartLines: [POSTER_LINE, FRAME_LINE], // €24.90 + €10.00
      currency: 'eur',
      subtotalCents: 3490,
      now: NOW,
    })
    expect(result.valid).toBe(true)
    if (result.valid) {
      expect(result.voucher.discountCents).toBe(1000) // only frame line discounted
    }
  })

  it('rejects amount_off coupon with currency mismatch', () => {
    const result = validateVoucher({
      promotionCode: makePromo({
        coupon: makeCoupon({ amount_off: 500, percent_off: null, currency: 'usd' }),
      }),
      cartLines: [POSTER_LINE],
      currency: 'eur',
      subtotalCents: 2490,
      now: NOW,
    })
    expect(result.valid).toBe(false)
    if (!result.valid) expect(result.reason).toBe('currency_mismatch')
  })

  it('rejects when the underlying coupon is invalid', () => {
    const result = validateVoucher({
      promotionCode: makePromo({
        coupon: makeCoupon({ valid: false }),
      }),
      cartLines: [POSTER_LINE],
      currency: 'eur',
      subtotalCents: 2490,
      now: NOW,
    })
    expect(result.valid).toBe(false)
    if (!result.valid) expect(result.reason).toBe('expired')
  })
})
