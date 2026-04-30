import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { stripe } from '@/lib/stripe'
import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'
import { PRODUCTS, getStripePriceId } from '@/lib/products'
import { getProductCatalog } from '@/lib/stripe-catalog'

const CartItemSchema = z.object({
  productId: z.enum(['download', 'poster', 'frame']),
  format: z.enum(['a4', 'a3']),
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
})

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const parsed = CheckoutBodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid cart' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Resolve current prices from Stripe (cached) for persisting order totals
  const catalog = await getProductCatalog()

  const items = parsed.data.items.map((item) => {
    const product = PRODUCTS.find((p) => p.id === item.productId)
    const priceId = getStripePriceId(item.productId, item.format)
    const catalogPrice = catalog[item.productId]?.[item.format]
    if (!product || !priceId || !catalogPrice) {
      throw new Error(`Unknown product / price: ${item.productId}/${item.format}`)
    }
    return {
      ...item,
      priceCents: catalogPrice.unitAmount,
      productLabel: product.label,
      stripePriceId: priceId,
    }
  })

  const totalCents = items.reduce((sum, i) => sum + i.priceCents, 0)
  const hasPhysical = items.some((i) => i.productId !== 'download')
  const hasDigital = items.some((i) => i.productId === 'download')

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

  const admin = createAdminClient()
  const { data: order, error: insertErr } = await admin
    .from('orders')
    .insert({
      user_id: user?.id ?? null,
      status: 'pending',
      total_cents: totalCents,
      currency: 'eur',
      items,
      locale,
      digital_consent_at: hasDigital ? new Date().toISOString() : null,
    })
    .select('id, access_token')
    .single()

  if (insertErr || !order) {
    return NextResponse.json({ error: 'Failed to create order' }, { status: 500 })
  }

  const origin = req.headers.get('origin') ?? new URL(req.url).origin

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      locale,
      line_items: items.map((item) => ({
        quantity: 1,
        price: item.stripePriceId,
      })),
      success_url: `${origin}/${locale}/orders/${order.id}?token=${order.access_token}&success=1`,
      cancel_url: `${origin}/${locale}/cart`,
      customer_email: user?.email,
      allow_promotion_codes: true,
      shipping_address_collection: hasPhysical
        ? { allowed_countries: ['DE', 'AT', 'CH'] }
        : undefined,
      metadata: { order_id: order.id },
    })

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
