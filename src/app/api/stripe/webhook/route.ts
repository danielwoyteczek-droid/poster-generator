import { NextRequest, NextResponse } from 'next/server'
import type Stripe from 'stripe'
import { stripe } from '@/lib/stripe'
import { createAdminClient } from '@/lib/supabase-admin'
import { sendOrderConfirmation, sendAdminNewOrderNotification } from '@/lib/email'
import { dispatchB2BWebhookEvent, isB2BCheckoutSession } from '@/lib/b2b-webhook-handlers'

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

    // PROJ-50: Idempotency via stripe_event_log. Stripe re-sends webhooks bei
    // Timeout — wir verarbeiten jedes Event nur einmal. Insert-Conflict =
    // bereits gesehen, fruehzeitig 200 zurueck.
    const { error: idempErr } = await admin
      .from('stripe_event_log')
      .insert({
        event_id: event.id,
        event_type: event.type,
        payload: event.data.object as unknown as Record<string, unknown>,
      })

    if (idempErr) {
      // 23505 = unique_violation -> Event bereits gesehen
      const isDuplicate = 'code' in idempErr && idempErr.code === '23505'
      if (isDuplicate) {
        console.log('[webhook] duplicate event ignored:', event.id)
        return NextResponse.json({ received: true, duplicate: true })
      }
      console.error('[webhook] event log insert failed (non-duplicate):', idempErr)
      // Continue anyway — event_log ist Best-Effort, kein Hard-Block.
    }

    // PROJ-50: B2B-Subscription-Events vor dem bestehenden B2C-Handler
    // dispatchen. dispatchB2BWebhookEvent liefert true wenn es das Event
    // konsumiert hat — dann ueberspringen wir die B2C-Logik unten.
    const wasB2B = await dispatchB2BWebhookEvent(admin, event)
    if (wasB2B) {
      return NextResponse.json({ received: true })
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session

      // PROJ-50: B2B-Subscription-Checkouts gehen NICHT durch den Order-Handler.
      // Subscription-State wird via subscription.created-Event verwaltet (s.o.).
      if (isB2BCheckoutSession(session)) {
        return NextResponse.json({ received: true })
      }
      const shipping = (session as Stripe.Checkout.Session & {
        shipping_details?: { address?: Stripe.Address; name?: string } | null
      }).shipping_details

      // PROJ-48: extract authoritative discount from Stripe.
      // total_details.amount_discount is the actual amount Stripe deducted —
      // this is the source of truth, not anything the client may have stored.
      // We also resolve the promotion-code ID back to its human name so the
      // order record stays readable in admin/marketing reporting.
      const discountCents = session.total_details?.amount_discount ?? 0
      let resolvedDiscountCode: string | null = null
      const sessionWithDiscounts = session as Stripe.Checkout.Session & {
        discounts?: Array<{ promotion_code?: string | null }>
      }
      const promoId = sessionWithDiscounts.discounts?.[0]?.promotion_code
      if (promoId && discountCents > 0) {
        try {
          const promo = await stripe.promotionCodes.retrieve(promoId)
          resolvedDiscountCode = promo.code
        } catch (err) {
          console.warn('[webhook] could not resolve promotion code', promoId, err)
        }
      }

      const { data: updated, error: updateErr } = await admin
        .from('orders')
        .update({
          status: 'paid',
          paid_at: new Date().toISOString(),
          email: session.customer_details?.email ?? null,
          shipping_address: shipping?.address
            ? { ...shipping.address, name: shipping.name ?? null }
            : null,
          discount_cents: discountCents,
          // Only overwrite discount_code if Stripe resolved one — otherwise
          // keep whatever the checkout route stored when it created the order.
          ...(resolvedDiscountCode ? { discount_code: resolvedDiscountCode } : {}),
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
          const orderLocale = (updated as { locale?: 'de' | 'en' | 'fr' | 'it' | 'es' }).locale ?? 'de'
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
