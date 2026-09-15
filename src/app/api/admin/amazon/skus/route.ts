/**
 * PROJ-31: Admin-API für die Zuordnung Amazon-SKU → Design-Preset.
 *
 * GET  — alle SKUs mit Preset, Schema-Zustand und Bestellzahlen.
 *        Offene Zuordnungen stehen oben, damit eine neu aufgetauchte
 *        Artikelnummer nicht untergeht.
 * POST — eine SKU von Hand anlegen (die meisten kommen von selbst beim
 *        Eingang einer Bestellung).
 */

import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase-admin'
import { LQ_DEFAULT_SCHEMA, LQ_FIELD_KEYS } from '@/lib/amazon/sku-schema'
import { readPresetBlocks, type PresetBlock } from '@/lib/amazon/field-mapping'

export interface SkuRow {
  id: string
  sku: string
  asin: string | null
  variant_label: string | null
  preset_id: string | null
  preset_name: string | null
  has_custom_schema: boolean
  /** Das gepflegte Schema, damit der Editor es ohne zweiten Aufruf zeigt. */
  personalization_schema: unknown | null
  notes: string | null
  orders_total: number
  orders_waiting: number
  updated_at: string
}

export interface SkusResponse {
  items: SkuRow[]
  presets: Array<{
    id: string
    name: string
    poster_type: string
    mask: string | null
    /** Die Textblöcke des Presets — Auswahl für die Feldzuordnung. */
    blocks: PresetBlock[]
  }>
  default_schema: typeof LQ_DEFAULT_SCHEMA
  field_keys: Record<string, string>
}

export async function GET() {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: 'Forbidden' }, { status: auth.status })

  const supabase = createAdminClient()

  const { data: mappings, error } = await supabase
    .from('amazon_sku_mappings')
    .select('id, sku, asin, variant_label, preset_id, personalization_schema, notes, updated_at')
    .order('sku')
    .limit(500)
  if (error) {
    return NextResponse.json({ error: `Lesen fehlgeschlagen: ${error.message}` }, { status: 500 })
  }

  const { data: presets } = await supabase
    .from('presets')
    .select('id, name, poster_type, config_json')
    .eq('poster_type', 'map')
    .order('name')
    .limit(200)

  // Bestellzahlen je SKU — eine Abfrage statt einer pro Zeile.
  const { data: orders } = await supabase
    .from('amazon_custom_orders')
    .select('sku, queue_status, printed_at')
    .limit(5000)

  const counts = new Map<string, { total: number; waiting: number }>()
  for (const o of (orders ?? []) as Array<{ sku: string; queue_status: string; printed_at: string | null }>) {
    const c = counts.get(o.sku) ?? { total: 0, waiting: 0 }
    c.total += 1
    if (!o.printed_at && o.queue_status !== 'storniert') c.waiting += 1
    counts.set(o.sku, c)
  }

  const presetName = new Map(
    (presets ?? []).map((p) => [p.id as string, p.name as string]),
  )

  const items: SkuRow[] = (mappings ?? []).map((m) => {
    const c = counts.get(m.sku as string) ?? { total: 0, waiting: 0 }
    return {
      id: m.id as string,
      sku: m.sku as string,
      asin: (m.asin as string) ?? null,
      variant_label: (m.variant_label as string) ?? null,
      preset_id: (m.preset_id as string) ?? null,
      preset_name: m.preset_id ? presetName.get(m.preset_id as string) ?? '(gelöscht)' : null,
      has_custom_schema: Boolean(m.personalization_schema),
      personalization_schema: m.personalization_schema ?? null,
      notes: (m.notes as string) ?? null,
      orders_total: c.total,
      orders_waiting: c.waiting,
      updated_at: m.updated_at as string,
    }
  })

  // Offene Zuordnungen zuerst, danach die mit den meisten wartenden
  // Bestellungen — das ist die Reihenfolge, in der sie Arbeit machen.
  items.sort((a, b) => {
    if (!a.preset_id !== !b.preset_id) return a.preset_id ? 1 : -1
    if (b.orders_waiting !== a.orders_waiting) return b.orders_waiting - a.orders_waiting
    return a.sku.localeCompare(b.sku)
  })

  const response: SkusResponse = {
    items,
    presets: (presets ?? []).map((p) => ({
      id: p.id as string,
      name: p.name as string,
      poster_type: p.poster_type as string,
      mask: ((p.config_json as Record<string, unknown>)?.maskKey as string) ?? null,
      blocks: readPresetBlocks(p.config_json),
    })),
    default_schema: LQ_DEFAULT_SCHEMA,
    field_keys: LQ_FIELD_KEYS,
  }
  return NextResponse.json(response)
}

const CreateSchema = z.object({
  sku: z.string().min(1).max(128),
  asin: z.string().max(32).nullish(),
  variant_label: z.string().max(200).nullish(),
  notes: z.string().max(2000).nullish(),
})

export async function POST(request: Request) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: 'Forbidden' }, { status: auth.status })

  let raw: unknown
  try {
    raw = await request.json()
  } catch {
    return NextResponse.json({ error: 'Rumpf ist kein gültiges JSON' }, { status: 400 })
  }
  const parsed = CreateSchema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ') },
      { status: 400 },
    )
  }

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('amazon_sku_mappings')
    .insert({
      sku: parsed.data.sku.trim(),
      asin: parsed.data.asin ?? null,
      variant_label: parsed.data.variant_label ?? null,
      notes: parsed.data.notes ?? null,
    })
    .select('id, sku')
    .single()

  if (error) {
    const known = error.message.includes('duplicate') || error.code === '23505'
    return NextResponse.json(
      { error: known ? 'Diese SKU ist bereits angelegt.' : `Anlegen fehlgeschlagen: ${error.message}` },
      { status: known ? 409 : 500 },
    )
  }
  return NextResponse.json(data, { status: 201 })
}
