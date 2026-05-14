import type Stripe from 'stripe'

/**
 * PROJ-48 — Voucher / Stripe-Promotion-Code Validation.
 *
 * The shape of a validated voucher response, returned both from the
 * /api/voucher/validate endpoint and stored in the client-side voucher
 * store (sessionStorage). Carries everything the cart needs to display
 * the discount and the checkout route needs to pass to Stripe.
 */
export interface AppliedVoucher {
  code: string
  promotionCodeId: string
  couponId: string
  /** Preview discount in cents — Stripe is authoritative at checkout. */
  discountCents: number
}

export type VoucherInvalidReason =
  | 'not_found'
  | 'expired'
  | 'max_reached'
  | 'min_not_met'
  | 'not_applicable'
  | 'currency_mismatch'

export interface VoucherValidationOk {
  valid: true
  voucher: AppliedVoucher
}

export interface VoucherValidationFail {
  valid: false
  reason: VoucherInvalidReason
  /** For min_not_met: how many cents are still missing to qualify. */
  minAmountMissingCents?: number
}

export type VoucherValidationResult = VoucherValidationOk | VoucherValidationFail

/**
 * Cart line item shape needed for discount validation. Intentionally
 * narrower than CartItem so this function stays testable without the
 * full cart-store types.
 */
export interface VoucherCartLine {
  /** Stripe Price ID of this line (already tier-expanded — frame markup
   *  appears as its own line at /api/checkout/route time, but for the
   *  validation preview we approximate using the line's product). */
  stripePriceId: string
  /** Stripe Product ID that the price belongs to. Needed for the
   *  applies_to.products check. */
  stripeProductId: string
  /** Net amount this line contributes in cents (pre-discount). */
  amountCents: number
}

interface ValidateInput {
  promotionCode: Stripe.PromotionCode
  cartLines: VoucherCartLine[]
  /** Currency code, lowercase (e.g. 'eur'). */
  currency: string
  /** Cart total in cents, pre-discount. Used for `min_amount` check. */
  subtotalCents: number
  /** Server clock (ms since epoch). Injectable for tests. */
  now?: number
}

/**
 * Validates a Stripe Promotion Code against the customer's cart.
 *
 * Stripe is the authoritative source at checkout time — we only do a
 * preview here. Mismatches are acceptable for display; the actual
 * discount written to orders.discount_cents comes from the webhook's
 * session.total_details.amount_discount.
 */
export function validateVoucher(input: ValidateInput): VoucherValidationResult {
  const { promotionCode, cartLines, currency, subtotalCents } = input
  const now = input.now ?? Date.now()

  // Promotion code level checks (the wrapping that holds the human code).
  if (!promotionCode.active) {
    return { valid: false, reason: 'not_found' }
  }
  if (promotionCode.expires_at && promotionCode.expires_at * 1000 < now) {
    return { valid: false, reason: 'expired' }
  }
  if (
    promotionCode.max_redemptions != null &&
    promotionCode.times_redeemed >= promotionCode.max_redemptions
  ) {
    return { valid: false, reason: 'max_reached' }
  }

  // Coupon level checks (the actual discount definition).
  // Stripe API 2026-03-25 nested the coupon under `promotion`. Callers must
  // pass `expand: ['data.promotion.coupon']` to receive a hydrated Coupon
  // object; otherwise it's just a string ID and validation can't proceed.
  const couponRef = promotionCode.promotion?.coupon
  const coupon = couponRef && typeof couponRef !== 'string' ? couponRef : null
  if (!coupon || !coupon.valid) {
    return { valid: false, reason: 'expired' }
  }

  // Currency: amount_off coupons are currency-specific; percent_off is universal.
  if (coupon.amount_off != null && coupon.currency && coupon.currency !== currency) {
    return { valid: false, reason: 'currency_mismatch' }
  }

  // Minimum amount — Stripe stores it on the PromotionCode restrictions.
  const minAmount = promotionCode.restrictions?.minimum_amount
  if (minAmount != null && subtotalCents < minAmount) {
    return {
      valid: false,
      reason: 'min_not_met',
      minAmountMissingCents: minAmount - subtotalCents,
    }
  }

  // Applies_to.products restriction → coupon only applies to specific
  // Stripe Products. Check that the cart contains at least one matching
  // line. Coupons without applies_to apply to the whole order.
  const restrictedProducts = coupon.applies_to?.products
  let applicableSubtotal = subtotalCents
  if (restrictedProducts && restrictedProducts.length > 0) {
    const applicableLines = cartLines.filter((l) =>
      restrictedProducts.includes(l.stripeProductId),
    )
    if (applicableLines.length === 0) {
      return { valid: false, reason: 'not_applicable' }
    }
    applicableSubtotal = applicableLines.reduce((sum, l) => sum + l.amountCents, 0)
  }

  // Discount-Vorschau berechnen.
  let discountCents = 0
  if (coupon.percent_off != null) {
    discountCents = Math.round((applicableSubtotal * coupon.percent_off) / 100)
  } else if (coupon.amount_off != null) {
    // Fixed amount, capped to the applicable subtotal so we don't go negative.
    discountCents = Math.min(coupon.amount_off, applicableSubtotal)
  }

  return {
    valid: true,
    voucher: {
      code: promotionCode.code,
      promotionCodeId: promotionCode.id,
      couponId: coupon.id,
      discountCents,
    },
  }
}
