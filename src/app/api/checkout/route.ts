import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { stripe } from '@/lib/stripe'
import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'
import { PRODUCTS } from '@/lib/products'
import { PRINT_FORMATS } from '@/lib/print-formats'

const CartItemSchema = z.object({
  productId: z.enum(['download', 'poster', 'frame']),
  format: z.enum(['a4', 'a3', 'a2']),
  posterType: z.enum(['map', 'star-map']),
  title: z.string().min(1).max(200),
  projectId: z.string().uuid().nullable().optional(),
  snapshot: z.record(z.string(), z.unknown()),
})

const CheckoutBodySchema = z.object({
  items: z.array(CartItemSchema).min(1).max(20),
  digitalConsent: z.boolean().optional(),
})

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const parsed = CheckoutBodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid cart' }, { status: 400 })
  }

  // Optional auth — guest checkout allowed
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Validate prices server-side (never trust client)
  const items = parsed.data.items.map((item) => {
    const product = PRODUCTS.find((p) => p.id === item.productId)
    if (!product) throw new Error(`Unknown product ${item.productId}`)
    const priceCents = product.prices[item.format]
    if (!priceCents) throw new Error(`No price for ${item.productId}/${item.format}`)
    return { ...item, priceCents, productLabel: product.label }
  })

  const totalCents = items.reduce((sum, i) => sum + i.priceCents, 0)
  const hasPhysical = items.some((i) => i.productId !== 'download')
  const hasDigital = items.some((i) => i.productId === 'download')

  // Digital downloads require explicit consent to waive 14-day withdrawal right (§ 356 Abs. 5 BGB)
  if (hasDigital && !parsed.data.digitalConsent) {
    return NextResponse.json(
      { error: 'Zustimmung zum sofortigen Download-Beginn erforderlich' },
      { status: 400 },
    )
  }

  // Persist pending order (bypassing RLS via service role)
  const admin = createAdminClient()
  const { data: order, error: insertErr } = await admin
    .from('orders')
    .insert({
      user_id: user?.id ?? null,
      status: 'pending',
      total_cents: totalCents,
      currency: 'eur',
      items,
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
      locale: 'de',
      line_items: items.map((item) => ({
        quantity: 1,
        price_data: {
          currency: 'eur',
          unit_amount: item.priceCents,
          product_data: {
            name: `${item.productLabel} · ${PRINT_FORMATS[item.format].label} · ${item.title}`,
            description: item.posterType === 'star-map' ? 'Sternenposter' : 'Stadtposter',
          },
        },
      })),
      success_url: `${origin}/orders/${order.id}?token=${order.access_token}&success=1`,
      cancel_url: `${origin}/cart`,
      customer_email: user?.email,
      allow_promotion_codes: true,
      shipping_address_collection: hasPhysical
        ? { allowed_countries: ['DE', 'AT', 'CH'] }
        : undefined,
      metadata: { order_id: order.id },
    })

    // Link session to order
    await admin
      .from('orders')
      .update({ stripe_session_id: session.id })
      .eq('id', order.id)

    return NextResponse.json({ url: session.url })
  } catch (err) {
    // Mark order failed so it doesn't sit as pending forever
    await admin.from('orders').update({ status: 'failed' }).eq('id', order.id)
    const message = err instanceof Error ? err.message : 'Checkout failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
