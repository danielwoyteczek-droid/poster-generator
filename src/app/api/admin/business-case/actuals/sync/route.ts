import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase-admin'
import { mapOrderItemToTier } from '@/lib/business-case/defaults'

interface OrderItem {
  productId?: string
  format?: string
  priceCents?: number
}

interface PaidOrder {
  id: string
  paid_at: string
  items: OrderItem[] | null
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: 'Forbidden' }, { status: auth.status })

  const yearParam = req.nextUrl.searchParams.get('year')
  const year = yearParam ? parseInt(yearParam, 10) : new Date().getUTCFullYear()
  if (!Number.isInteger(year) || year < 2020 || year > 2100) {
    return NextResponse.json({ error: 'Invalid year' }, { status: 400 })
  }

  const startOfYear = `${year}-01-01T00:00:00Z`
  const startOfNextYear = `${year + 1}-01-01T00:00:00Z`

  const admin = createAdminClient()
  const { data: orders, error: ordersErr } = await admin
    .from('orders')
    .select('id, paid_at, items')
    .eq('status', 'paid')
    .gte('paid_at', startOfYear)
    .lt('paid_at', startOfNextYear)
    .limit(50000)

  if (ordersErr) return NextResponse.json({ error: ordersErr.message }, { status: 500 })

  const buckets = new Map<
    string,
    { month: number; tier_key: string; orders_count: number; revenue_cents: number }
  >()

  for (const order of (orders ?? []) as PaidOrder[]) {
    if (!order.paid_at) continue
    const month = new Date(order.paid_at).getUTCMonth() + 1
    const items = order.items ?? []
    for (const item of items) {
      const tier = mapOrderItemToTier(item.productId ?? '', item.format ?? null)
      if (!tier) continue
      const k = `${month}|${tier}`
      const existing = buckets.get(k)
      if (existing) {
        existing.orders_count += 1
        existing.revenue_cents += item.priceCents ?? 0
      } else {
        buckets.set(k, {
          month,
          tier_key: tier,
          orders_count: 1,
          revenue_cents: item.priceCents ?? 0,
        })
      }
    }
  }

  // Idempotent re-sync: delete all rows for the year, then insert new aggregates.
  const { error: deleteErr } = await admin
    .from('business_actuals')
    .delete()
    .eq('year', year)
  if (deleteErr) return NextResponse.json({ error: `Delete failed: ${deleteErr.message}` }, { status: 500 })

  const now = new Date().toISOString()
  const inserts = Array.from(buckets.values()).map((b) => ({
    year,
    month: b.month,
    tier_key: b.tier_key,
    orders_count: b.orders_count,
    revenue_cents: b.revenue_cents,
    synced_at: now,
    source: 'orders_table',
  }))

  if (inserts.length > 0) {
    const { error: insertErr } = await admin.from('business_actuals').insert(inserts)
    if (insertErr) return NextResponse.json({ error: `Insert failed: ${insertErr.message}` }, { status: 500 })
  }

  return NextResponse.json({
    year,
    syncedAt: now,
    ordersConsidered: orders?.length ?? 0,
    rowsWritten: inserts.length,
  })
}
