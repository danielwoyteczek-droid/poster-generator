import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { stripe } from '@/lib/stripe'
import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'
import { type ProductId } from '@/lib/products'
import { getProductCatalog } from '@/lib/stripe-catalog'
import { tierToStripeLineItems } from '@/lib/tier-expansion'
import type { PrintFormat } from '@/lib/print-formats'

const CartItemSchema = z.object({
  productId: z.enum(['download', 'poster']),
  /**
   * PROJ-48: only meaningful when productId='poster'. When true, the
   * checkout route expands the cart item to two Stripe line items
   * (poster_<fmt> + frame_markup_<fmt>).
   */
  withFrame: z.boolean().default(false),
  format: z.enum(['a4', 'a3', 'a2']),
  posterType: z.enum(['map', 'star-map', 'photo']),
  title: z.string().min(1).max(200),
  projectId: z.string().uuid().nullable().optional(),
  snapshot: z.record(z.string(), z.unknown()),
})

const CheckoutBodySchema = z.object({
  items: z.array(CartItemSchema).min(1).max(20),
  digitalConsent: z.boolean().optional(),
  /**
   * Active editor locale at checkout time (PROJ-20). Stored on the order
   * so post-purchase mails (confirmation, shipping, review request) go
   * out in the same language the customer bought in. Falls back to the
   * NEXT_LOCALE cookie or 'de' when the client hasn't passed it.
   */
  locale: z.enum(['de', 'en', 'fr', 'it', 'es']).optional(),
  /**
   * PROJ-48: optional voucher (Stripe Promotion Code) applied in the cart.
   * When set, we pass `discounts: [{ promotion_code }]` to the Stripe
   * Session AND switch `allow_promotion_codes` to false so the customer
   * does not enter a second code in Stripe's UI on top of ours.
   * The Stripe Session is the authoritative source for the actual
   * discount amount written to orders.discount_cents (via webhook).
   */
  voucher: z
    .object({
      code: z.string().trim().min(1).max(64),
      promotionCodeId: z.string().trim().min(1),
    })
    .optional(),
})

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const parsed = CheckoutBodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid cart' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Resolve current prices from Stripe (cached) so we can compute the
  // authoritative per-item total (base + frame markup if applicable).
  const catalog = await getProductCatalog()

  // PROJ-48: expand each cart item to its Stripe line items. A single
  // CartItem with productId='poster' + withFrame=true becomes two Stripe
  // line items so a "Free frame" coupon can zero out just the markup.
  type ExpandedItem = {
    productId: ProductId
    withFrame: boolean
    format: PrintFormat
    posterType: 'map' | 'star-map' | 'photo'
    title: string
    projectId?: string | null
    snapshot: Record<string, unknown>
    priceCents: number
    stripeLineItems: Array<{ stripePriceId: string; quantity: number }>
  }

  let expanded: ExpandedItem[]
  try {
    expanded = parsed.data.items.map((item) => {
      const lineItems = tierToStripeLineItems(item.productId, item.withFrame, item.format)
      const priceCents = lineItems.reduce((sum, li) => {
        const unitAmount =
          catalog.products[item.productId]?.[item.format]?.stripePriceId === li.stripePriceId
            ? (catalog.products[item.productId]?.[item.format]?.unitAmount ?? 0)
            : catalog.frameMarkup[item.format]?.stripePriceId === li.stripePriceId
            ? (catalog.frameMarkup[item.format]?.unitAmount ?? 0)
            : 0
        return sum + unitAmount * li.quantity
      }, 0)
      return {
        ...item,
        priceCents,
        stripeLineItems: lineItems,
      }
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Invalid product configuration'
    return NextResponse.json({ error: msg }, { status: 400 })
  }

  const totalCents = expanded.reduce((sum, i) => sum + i.priceCents, 0)
  const hasPhysical = expanded.some((i) => i.productId !== 'download')
  const hasDigital = expanded.some((i) => i.productId === 'download')

  if (hasDigital && !parsed.data.digitalConsent) {
    return NextResponse.json(
      { error: 'Zustimmung zum sofortigen Download-Beginn erforderlich' },
      { status: 400 },
    )
  }

  // Pick locale from explicit body field, then NEXT_LOCALE cookie, then DE
  const cookieLocale = req.cookies.get('NEXT_LOCALE')?.value
  const locale = parsed.data.locale
    ?? (cookieLocale === 'en' ? 'en' : cookieLocale === 'de' ? 'de' : 'de')

  // Persist the raw cart-item shape (with withFrame), not the expanded
  // line items. orders.items stays the single source of truth for
  // fulfillment, downloads and order display.
  const persistedItems = expanded.map((e) => ({
    productId: e.productId,
    withFrame: e.withFrame,
    format: e.format,
    posterType: e.posterType,
    title: e.title,
    projectId: e.projectId ?? null,
    snapshot: e.snapshot,
    priceCents: e.priceCents,
  }))

  const admin = createAdminClient()
  // PROJ-48: persist the voucher code (not the amount — Stripe is
  // authoritative). discount_cents stays 0 until the webhook reads it
  // from session.total_details.amount_discount.
  const { data: order, error: insertErr } = await admin
    .from('orders')
    .insert({
      user_id: user?.id ?? null,
      status: 'pending',
      total_cents: totalCents,
      currency: 'eur',
      items: persistedItems,
      locale,
      digital_consent_at: hasDigital ? new Date().toISOString() : null,
      discount_code: parsed.data.voucher?.code ?? null,
    })
    .select('id, access_token')
    .single()

  if (insertErr || !order) {
    return NextResponse.json({ error: 'Failed to create order' }, { status: 500 })
  }

  const origin = req.headers.get('origin') ?? new URL(req.url).origin

  // Flatten all expanded line items into the Stripe-friendly format.
  const stripeLineItems = expanded.flatMap((e) =>
    e.stripeLineItems.map((li) => ({
      quantity: li.quantity,
      price: li.stripePriceId,
    })),
  )

  // PROJ-48: when a cart-side voucher is applied, pass it to Stripe via
  // the `discounts` parameter and disable the native promotion-code field
  // (Stripe forbids both at once and our cart UX is the entry point).
  // Without a cart voucher, leave the field open as a fallback.
  const hasCartVoucher = !!parsed.data.voucher
  const sessionParams: Parameters<typeof stripe.checkout.sessions.create>[0] = {
    mode: 'payment',
    locale,
    line_items: stripeLineItems,
    success_url: `${origin}/${locale}/orders/${order.id}?token=${order.access_token}&success=1`,
    cancel_url: `${origin}/${locale}/cart`,
    customer_email: user?.email,
    allow_promotion_codes: hasCartVoucher ? undefined : true,
    shipping_address_collection: hasPhysical
      ? { allowed_countries: ['DE', 'AT', 'CH'] }
      : undefined,
    metadata: { order_id: order.id },
  }
  if (hasCartVoucher && parsed.data.voucher) {
    sessionParams.discounts = [{ promotion_code: parsed.data.voucher.promotionCodeId }]
  }

  try {
    const session = await stripe.checkout.sessions.create(sessionParams)

    await admin
      .from('orders')
      .update({ stripe_session_id: session.id })
      .eq('id', order.id)

    return NextResponse.json({ url: session.url })
  } catch (err) {
    await admin.from('orders').update({ status: 'failed' }).eq('id', order.id)
    const message = err instanceof Error ? err.message : 'Checkout failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
