import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { stripe } from '@/lib/stripe'
import { getProductCatalog } from '@/lib/stripe-catalog'
import { tierToStripeLineItems } from '@/lib/tier-expansion'
import { getClientIp, rateLimitDb } from '@/lib/rate-limit'
import {
  validateVoucher,
  type VoucherCartLine,
} from '@/lib/voucher-validation'
import type { PrintFormat } from '@/lib/print-formats'

/**
 * PROJ-48 — POST /api/voucher/validate
 *
 * Validates a Stripe Promotion Code against the customer's current cart.
 * Returns either a discount preview (valid=true) or a structured reason
 * (valid=false, reason='not_found'|'expired'|...).
 *
 * Rate-limited: 10 attempts per IP per 15 minutes, via the DB-backed
 * limiter (`check_rate_limit` Postgres function) so all Vercel instances
 * share one counter. Fails open if the DB is unreachable.
 *
 * Stripe is authoritative at checkout — this endpoint produces a preview
 * for the cart UI. The webhook writes the actual discount_cents on
 * session.completed from session.total_details.amount_discount.
 */

const RATE_LIMIT_PER_WINDOW = 10
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000

const ItemSchema = z.object({
  productId: z.enum(['download', 'poster']),
  withFrame: z.boolean().default(false),
  format: z.enum(['a4', 'a3', 'a2']),
})

const BodySchema = z.object({
  code: z.string().trim().min(1).max(64),
  items: z.array(ItemSchema).min(1).max(20),
})

export async function POST(req: NextRequest) {
  // 1) Rate limit BEFORE doing any Stripe work.
  const ip = getClientIp(req)
  const rl = await rateLimitDb(`voucher-validate:${ip}`, RATE_LIMIT_PER_WINDOW, RATE_LIMIT_WINDOW_MS)
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'Too many attempts. Please try again later.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds) } },
    )
  }

  // 2) Body validation.
  const body = await req.json().catch(() => null)
  const parsed = BodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  // 3) Expand cart items to Stripe-Line-Items (price IDs + amounts) and
  //    resolve each line to its Stripe Product ID, so applies_to.products
  //    restrictions can be evaluated.
  const catalog = await getProductCatalog()
  const cartLines: VoucherCartLine[] = []
  let subtotalCents = 0
  try {
    for (const item of parsed.data.items) {
      const expandedLines = tierToStripeLineItems(item.productId, item.withFrame, item.format)
      for (const line of expandedLines) {
        const catalogEntry =
          catalog.products[item.productId]?.[item.format as PrintFormat]?.stripePriceId === line.stripePriceId
            ? catalog.products[item.productId]?.[item.format as PrintFormat]
            : catalog.frameMarkup[item.format as PrintFormat]?.stripePriceId === line.stripePriceId
            ? catalog.frameMarkup[item.format as PrintFormat]
            : null
        if (!catalogEntry) continue

        // Resolve product ID via Stripe-Price-API (one call per unique price).
        // Cheap because Stripe returns the product reference inline.
        const price = await stripe.prices.retrieve(catalogEntry.stripePriceId)
        const stripeProductId = typeof price.product === 'string' ? price.product : price.product?.id
        if (!stripeProductId) continue

        const amountCents = catalogEntry.unitAmount * line.quantity
        subtotalCents += amountCents
        cartLines.push({
          stripePriceId: catalogEntry.stripePriceId,
          stripeProductId,
          amountCents,
        })
      }
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Cart expansion failed'
    return NextResponse.json({ error: msg }, { status: 400 })
  }

  // 4) Look up the Promotion Code in Stripe.
  // Stripe's list filter is exact match on `code`; only one active code
  // per name can exist, so limit=1 is safe.
  let promotionCode
  try {
    const list = await stripe.promotionCodes.list({
      code: parsed.data.code,
      active: true,
      limit: 1,
      // Hydrate the nested coupon AND its applies_to restriction.
      // Stripe API 2026-03-25 doesn't return `applies_to` by default
      // even when set — without this expand the coupon looks unrestricted.
      expand: ['data.promotion.coupon.applies_to'],
    })
    promotionCode = list.data[0]
  } catch (err) {
    console.error('[voucher/validate] Stripe lookup failed:', err)
    return NextResponse.json(
      { valid: false, reason: 'not_found' },
      { status: 200 },
    )
  }

  if (!promotionCode) {
    return NextResponse.json(
      { valid: false, reason: 'not_found' },
      { status: 200 },
    )
  }

  // 5) Run the pure validator.
  const result = validateVoucher({
    promotionCode,
    cartLines,
    currency: 'eur',
    subtotalCents,
  })

  return NextResponse.json(result, { status: 200 })
}
