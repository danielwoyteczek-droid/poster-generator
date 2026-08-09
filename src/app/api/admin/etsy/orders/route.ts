/**
 * PROJ-49: Admin order-queue listing API.
 *
 * Supports optional filters via query params:
 *   - status: one of the etsy_orders status enum values (or 'all')
 *   - limit:  default 50, max 200
 *   - offset: default 0
 *
 * Used by /private/admin/etsy/orders to render the queue table.
 */

import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase-admin'

const ALL_STATUSES = [
  'pending_parse',
  'pending_mapping',
  'pending_render',
  'imported',
  'manual_review',
  'failed',
  'cancelled',
] as const

export type EtsyOrderStatus = (typeof ALL_STATUSES)[number]

export interface EtsyOrderRow {
  id: string
  etsy_receipt_id: number
  purchase_date: string
  was_paid: boolean
  was_shipped: boolean
  was_canceled: boolean
  status: EtsyOrderStatus
  shipping_city: string | null
  shipping_country: string | null
  items_count: number
  items_ok: number
  items_failed: number
  items_no_mapping: number
  imported_at: string | null
  error_message: string | null
}

export interface EtsyOrdersResponse {
  total: number
  items: EtsyOrderRow[]
  status_counts: Record<EtsyOrderStatus, number>
  last_sync_at: string | null
}

interface ParsedItem {
  status: 'ok' | 'manual_review' | 'no_mapping'
}

interface RawAddress {
  city?: string | null
  country_iso?: string | null
}

function deriveCounts(parsedItems: unknown): {
  count: number
  ok: number
  failed: number
  no_mapping: number
} {
  if (!Array.isArray(parsedItems)) return { count: 0, ok: 0, failed: 0, no_mapping: 0 }
  let ok = 0
  let failed = 0
  let noMapping = 0
  for (const raw of parsedItems) {
    const item = raw as ParsedItem
    if (item.status === 'ok') ok += 1
    else if (item.status === 'manual_review') failed += 1
    else if (item.status === 'no_mapping') noMapping += 1
  }
  return { count: parsedItems.length, ok, failed, no_mapping: noMapping }
}

export async function GET(request: Request) {
  const auth = await requireAdmin()
  if (!auth.ok) {
    return NextResponse.json({ error: 'Forbidden' }, { status: auth.status })
  }

  const url = new URL(request.url)
  const status = url.searchParams.get('status')
  const limitRaw = parseInt(url.searchParams.get('limit') ?? '50', 10)
  const limit = Math.min(Math.max(Number.isFinite(limitRaw) ? limitRaw : 50, 1), 200)
  const offsetRaw = parseInt(url.searchParams.get('offset') ?? '0', 10)
  const offset = Math.max(Number.isFinite(offsetRaw) ? offsetRaw : 0, 0)

  const supabase = createAdminClient()

  let query = supabase
    .from('etsy_orders')
    .select(
      'id, etsy_receipt_id, purchase_date, was_paid, was_shipped, was_canceled, status, shipping_address, parsed_items, imported_at, error_message',
      { count: 'exact' },
    )
    .order('purchase_date', { ascending: false })
    .range(offset, offset + limit - 1)

  if (status && status !== 'all') {
    if (!ALL_STATUSES.includes(status as EtsyOrderStatus)) {
      return NextResponse.json({ error: 'Invalid status filter' }, { status: 400 })
    }
    query = query.eq('status', status)
  }

  const { data, count, error } = await query
  if (error) {
    return NextResponse.json(
      { error: `Query failed: ${error.message}` },
      { status: 500 },
    )
  }

  const items: EtsyOrderRow[] = (data ?? []).map((row) => {
    const addr = (row.shipping_address ?? null) as RawAddress | null
    const counts = deriveCounts(row.parsed_items)
    return {
      id: row.id as string,
      etsy_receipt_id: row.etsy_receipt_id as number,
      purchase_date: row.purchase_date as string,
      was_paid: row.was_paid as boolean,
      was_shipped: row.was_shipped as boolean,
      was_canceled: row.was_canceled as boolean,
      status: row.status as EtsyOrderStatus,
      shipping_city: addr?.city ?? null,
      shipping_country: addr?.country_iso ?? null,
      items_count: counts.count,
      items_ok: counts.ok,
      items_failed: counts.failed,
      items_no_mapping: counts.no_mapping,
      imported_at: row.imported_at as string | null,
      error_message: row.error_message as string | null,
    }
  })

  // Status counts across all rows (ignores filters) for the filter chip badges.
  const { data: counts } = await supabase
    .from('etsy_orders')
    .select('status', { count: 'exact', head: false })
  const statusCounts: Record<EtsyOrderStatus, number> = Object.fromEntries(
    ALL_STATUSES.map((s) => [s, 0]),
  ) as Record<EtsyOrderStatus, number>
  for (const r of counts ?? []) {
    const s = r.status as EtsyOrderStatus
    if (s in statusCounts) statusCounts[s] += 1
  }

  const { data: lastRun } = await supabase
    .from('etsy_sync_runs')
    .select('completed_at')
    .eq('kind', 'order_pull')
    .order('completed_at', { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle()

  const payload: EtsyOrdersResponse = {
    total: count ?? 0,
    items,
    status_counts: statusCounts,
    last_sync_at: (lastRun?.completed_at as string | null) ?? null,
  }
  return NextResponse.json(payload)
}
