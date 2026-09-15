/**
 * PROJ-31: Die Arbeitsliste — importierte Amazon-Positionen.
 *
 * Eine Zeile je Bestellposition, gefiltert nach Zustand. Was Arbeit macht,
 * steht oben: erst was zur Prüfung liegt, dann was auf eine Zuordnung
 * wartet, dann das Druckfertige.
 *
 * Bewusst ohne Käufertexte in der Liste. Die stehen in der Detailansicht —
 * eine Übersicht, die Namen und Adressen ausbreitet, will man nicht offen
 * auf dem Bildschirm liegen haben.
 */

import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase-admin'

export const ORDER_STATUSES = [
  'neu',
  'preset_fehlt',
  'pruefung',
  'bereit',
  'entwurf',
  'gedruckt',
  'storniert',
] as const

export type AmazonQueueStatus = (typeof ORDER_STATUSES)[number]

export interface AmazonOrderRow {
  id: string
  amazon_order_id: string
  order_item_id: string
  position: number
  sku: string
  variant_label: string | null
  purchase_date: string | null
  quantity: number
  order_state: string
  queue_status: AmazonQueueStatus
  preset_name: string | null
  /** Anzahl erkannter Felder — zeigt auf einen Blick, ob die Auswertung trug. */
  fields_found: number
  parse_ok: boolean | null
  has_preview: boolean
  map_place: string | null
  warnings: string[]
  printed_at: string | null
  first_seen_at: string
}

export interface AmazonOrdersResponse {
  items: AmazonOrderRow[]
  total: number
  status_counts: Record<string, number>
  last_ingest_at: string | null
}

export async function GET(request: Request) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: 'Forbidden' }, { status: auth.status })

  const url = new URL(request.url)
  const status = url.searchParams.get('status') ?? 'offen'
  const limit = Math.min(Number.parseInt(url.searchParams.get('limit') ?? '100', 10) || 100, 300)

  const supabase = createAdminClient()

  let query = supabase
    .from('amazon_custom_orders')
    .select(
      'id, amazon_order_id, order_item_id, position, sku, purchase_date, quantity, order_state, queue_status, preset_id, parse_result, preview_path, map_place, ingest_warnings, resolve_warnings, printed_at, first_seen_at',
    )
    .order('purchase_date', { ascending: false, nullsFirst: false })
    .limit(limit)

  if (status === 'offen') {
    // Der Normalfall beim Öffnen: alles, was noch Arbeit ist.
    query = query.in('queue_status', ['neu', 'preset_fehlt', 'pruefung', 'bereit', 'entwurf'])
  } else if (status !== 'alle') {
    query = query.eq('queue_status', status)
  }

  const { data: rows, error } = await query
  if (error) {
    return NextResponse.json({ error: `Lesen fehlgeschlagen: ${error.message}` }, { status: 500 })
  }

  // Zählung über alle Zeilen, unabhängig vom Filter — sonst zeigten die
  // Filter-Chips immer nur das, was gerade gefiltert ist.
  const { data: alle } = await supabase
    .from('amazon_custom_orders')
    .select('queue_status')
    .limit(5000)

  const counts: Record<string, number> = {}
  for (const r of (alle ?? []) as Array<{ queue_status: string }>) {
    counts[r.queue_status] = (counts[r.queue_status] ?? 0) + 1
  }
  counts.alle = (alle ?? []).length
  counts.offen = ['neu', 'preset_fehlt', 'pruefung', 'bereit', 'entwurf'].reduce(
    (n, s) => n + (counts[s] ?? 0),
    0,
  )

  const presetIds = [...new Set((rows ?? []).map((r) => r.preset_id).filter(Boolean))] as string[]
  const presetName = new Map<string, string>()
  if (presetIds.length > 0) {
    const { data: presets } = await supabase.from('presets').select('id, name').in('id', presetIds)
    for (const p of presets ?? []) presetName.set(p.id as string, p.name as string)
  }

  const skus = [...new Set((rows ?? []).map((r) => r.sku))] as string[]
  const variant = new Map<string, string | null>()
  if (skus.length > 0) {
    const { data: maps } = await supabase
      .from('amazon_sku_mappings')
      .select('sku, variant_label')
      .in('sku', skus)
    for (const m of maps ?? []) variant.set(m.sku as string, (m.variant_label as string) ?? null)
  }

  const { data: letzter } = await supabase
    .from('amazon_custom_orders')
    .select('first_seen_at')
    .order('first_seen_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const items: AmazonOrderRow[] = (rows ?? []).map((r) => {
    const parse = r.parse_result as { ok?: boolean; parsed?: Record<string, string> } | null
    return {
      id: r.id as string,
      amazon_order_id: r.amazon_order_id as string,
      order_item_id: r.order_item_id as string,
      position: (r.position as number) ?? 1,
      sku: r.sku as string,
      variant_label: variant.get(r.sku as string) ?? null,
      purchase_date: (r.purchase_date as string) ?? null,
      quantity: (r.quantity as number) ?? 1,
      order_state: r.order_state as string,
      queue_status: r.queue_status as AmazonQueueStatus,
      preset_name: r.preset_id ? presetName.get(r.preset_id as string) ?? '(gelöscht)' : null,
      fields_found: parse?.parsed ? Object.keys(parse.parsed).length : 0,
      parse_ok: parse ? Boolean(parse.ok) : null,
      has_preview: Boolean(r.preview_path),
      map_place: (r.map_place as string) ?? null,
      warnings: [
        ...((r.ingest_warnings as string[]) ?? []),
        ...((r.resolve_warnings as string[]) ?? []),
      ],
      printed_at: (r.printed_at as string) ?? null,
      first_seen_at: r.first_seen_at as string,
    }
  })

  const response: AmazonOrdersResponse = {
    items,
    total: items.length,
    status_counts: counts,
    last_ingest_at: (letzter?.first_seen_at as string) ?? null,
  }
  return NextResponse.json(response)
}
