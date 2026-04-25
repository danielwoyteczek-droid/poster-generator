import { NextRequest, NextResponse } from 'next/server'
import type Stripe from 'stripe'
import { stripe } from '@/lib/stripe'
import { createAdminClient } from '@/lib/supabase-admin'
import { sendOrderConfirmation, sendAdminNewOrderNotification } from '@/lib/email'

export async function POST(req: NextRequest) {
  try {
    const signature = req.headers.get('stripe-signature')
    if (!signature) {
      return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
    }

    const body = await req.text()
    let event: Stripe.Event
    try {
      event = stripe.webhooks.constructEvent(
        body,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET!,
      )
    } catch (err) {
      console.error('[webhook] signature verification failed:', err)
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
    }

    console.log('[webhook] event:', event.type, event.id)
    const admin = createAdminClient()

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session
      const shipping = (session as Stripe.Checkout.Session & {
        shipping_details?: { address?: Stripe.Address; name?: string } | null
      }).shipping_details

      const { data: updated, error: updateErr } = await admin
        .from('orders')
        .update({
          status: 'paid',
          paid_at: new Date().toISOString(),
          email: session.customer_details?.email ?? null,
          shipping_address: shipping?.address
            ? { ...shipping.address, name: shipping.name ?? null }
            : null,
        })
        .eq('stripe_session_id', session.id)
        .select('id, access_token, total_cents, items, email, shipping_address')
        .single()

      if (updateErr) {
        console.error('[webhook] order update failed:', updateErr)
      } else {
        console.log('[webhook] order updated to paid:', updated?.id)
      }

      // Lock all projects referenced by this order's items
      if (updated?.items) {
        const items = updated.items as Array<{ projectId?: string | null }>
        const projectIds = [...new Set(items.map((i) => i.projectId).filter((id): id is string => !!id))]
        if (projectIds.length > 0) {
          const { error: lockErr } = await admin
            .from('projects')
            .update({ is_locked: true })
            .in('id', projectIds)
          if (lockErr) {
            console.error('[webhook] project lock failed:', lockErr)
          } else {
            console.log('[webhook] locked projects:', projectIds)
          }
        }
      }

      if (updated?.email) {
        const origin =
          req.headers.get('origin') ??
          process.env.NEXT_PUBLIC_APP_URL ??
          new URL(req.url).origin
        const baseUrl = origin.startsWith('http') ? origin : `https://${origin}`
        try {
          const orderLocale = (updated as { locale?: 'de' | 'en' }).locale ?? 'de'
          await sendOrderConfirmation({
            to: updated.email,
            orderId: updated.id,
            accessToken: updated.access_token,
            items: updated.items,
            totalCents: updated.total_cents,
            origin: baseUrl,
            locale: orderLocale,
          })
          console.log('[webhook] confirmation email sent to', updated.email)
        } catch (err) {
          console.error('[webhook] order email failed:', err)
        }

        const adminEmail = process.env.ADMIN_EMAIL
        if (adminEmail) {
          const items = updated.items as Array<{ productId: string }>
          const hasPhysical = items.some((i) => i.productId !== 'download')
          try {
            await sendAdminNewOrderNotification({
              to: adminEmail,
              orderId: updated.id,
              items: updated.items,
              totalCents: updated.total_cents,
              email: updated.email,
              shippingAddress: (updated as { shipping_address?: Record<string, unknown> | null }).shipping_address ?? null,
              hasPhysical,
              origin: baseUrl,
            })
            console.log('[webhook] admin notification sent to', adminEmail)
          } catch (err) {
            console.error('[webhook] admin notification failed:', err)
          }
        }
      }
    } else if (event.type === 'checkout.session.expired') {
      const session = event.data.object as Stripe.Checkout.Session
      await admin
        .from('orders')
        .update({ status: 'cancelled' })
        .eq('stripe_session_id', session.id)
    }

    return NextResponse.json({ received: true })
  } catch (err) {
    console.error('[webhook] unexpected error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 },
    )
  }
}
