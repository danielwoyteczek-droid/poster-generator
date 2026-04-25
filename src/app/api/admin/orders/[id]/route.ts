import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase-admin'
import { sendShipmentNotification } from '@/lib/email'

const PatchSchema = z.object({
  fulfillment_status: z.enum(['new', 'in_production', 'shipped', 'completed']).optional(),
  tracking_number: z.string().trim().min(1).max(200).optional(),
})

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: 'Forbidden' }, { status: auth.status })

  const { id } = await context.params
  const admin = createAdminClient()

  const { data: order, error } = await admin
    .from('orders')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !order) {
    return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 })
  }

  const { data: exports_ } = await admin
    .from('order_exports')
    .select('id, item_index, file_type, storage_path, file_size_bytes, created_at')
    .eq('order_id', id)

  return NextResponse.json({ order, exports: exports_ ?? [] })
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: 'Forbidden' }, { status: auth.status })

  const { id } = await context.params
  const body = await req.json().catch(() => null)
  const parsed = PatchSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid body' }, { status: 400 })

  const updates: Record<string, unknown> = { ...parsed.data }
  const becomesShipped = parsed.data.fulfillment_status === 'shipped'
  if (becomesShipped) updates.shipped_at = new Date().toISOString()

  const admin = createAdminClient()
  const { data: order, error } = await admin
    .from('orders')
    .update(updates)
    .eq('id', id)
    .select('id, email, items, total_cents, tracking_number, fulfillment_status, access_token, locale')
    .single()

  if (error || !order) {
    return NextResponse.json({ error: error?.message || 'Update fehlgeschlagen' }, { status: 500 })
  }

  // Notify customer when marked as shipped
  if (becomesShipped && order.email && order.tracking_number) {
    const origin =
      req.headers.get('origin') ??
      process.env.NEXT_PUBLIC_APP_URL ??
      new URL(req.url).origin
    const baseUrl = origin.startsWith('http') ? origin : `https://${origin}`
    try {
      await sendShipmentNotification({
        to: order.email,
        orderId: order.id,
        accessToken: order.access_token,
        trackingNumber: order.tracking_number,
        origin: baseUrl,
        locale: ((order as { locale?: 'de' | 'en' }).locale ?? 'de'),
      })
    } catch (err) {
      console.error('[admin] shipment email failed:', err)
    }
  }

  return NextResponse.json({ order })
}
