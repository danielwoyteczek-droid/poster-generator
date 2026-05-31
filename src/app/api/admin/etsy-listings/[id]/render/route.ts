import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase-admin'

// PROJ-53: Render-Trigger (Ansatz A — Preset-Klon je Palette).
// Pro Palette ohne bestehende Variant-Zeile: Basis-Preset klonen mit
// config_json.paletteId überschrieben, mockup_set_ids gesetzt, render_status
// = 'pending' (+ per-Format) → der Render-Worker (PROJ-30/52) übernimmt.
// Idempotent über die unique(listing_def_id, palette_id)-Constraint.

interface PresetConfig {
  [key: string]: unknown
}

export async function POST(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: 'Forbidden' }, { status: auth.status })

  const { id } = await context.params
  const admin = createAdminClient()

  const { data: def, error: defErr } = await admin
    .from('etsy_listing_defs')
    .select('id, name, base_preset_id, palette_ids, mockup_set_ids')
    .eq('id', id)
    .single()
  if (defErr || !def) return NextResponse.json({ error: 'Listing-Definition nicht gefunden' }, { status: 404 })

  if (!def.palette_ids?.length) {
    return NextResponse.json({ error: 'Keine Paletten ausgewählt' }, { status: 400 })
  }

  const { data: base, error: baseErr } = await admin
    .from('presets')
    .select('name, description, poster_type, config_json, display_order')
    .eq('id', def.base_preset_id)
    .single()
  if (baseErr || !base) return NextResponse.json({ error: 'Basis-Preset nicht gefunden' }, { status: 404 })

  const { data: existing } = await admin
    .from('etsy_listing_variants')
    .select('palette_id')
    .eq('listing_def_id', id)
  const alreadyCloned = new Set((existing ?? []).map((v) => v.palette_id))

  const created: { paletteId: string; presetId: string }[] = []
  const skipped: string[] = []

  for (const paletteId of def.palette_ids as string[]) {
    if (alreadyCloned.has(paletteId)) {
      skipped.push(paletteId)
      continue
    }

    const config: PresetConfig = { ...((base.config_json as PresetConfig) ?? {}), paletteId }

    const { data: clone, error: cloneErr } = await admin
      .from('presets')
      .insert({
        name: `${def.name} · ${paletteId}`.slice(0, 200),
        description: base.description,
        poster_type: base.poster_type,
        config_json: config,
        display_order: base.display_order,
        status: 'draft',
        mockup_set_ids: def.mockup_set_ids ?? [],
        render_status: 'pending',
        render_status_a4: 'pending',
        render_status_a3: 'pending',
        render_status_a2: 'pending',
      })
      .select('id')
      .single()

    if (cloneErr || !clone) {
      return NextResponse.json(
        { error: `Klon für Palette "${paletteId}" fehlgeschlagen: ${cloneErr?.message}`, created },
        { status: 500 },
      )
    }

    const { error: varErr } = await admin
      .from('etsy_listing_variants')
      .insert({ listing_def_id: id, palette_id: paletteId, cloned_preset_id: clone.id })
    if (varErr) {
      return NextResponse.json(
        { error: `Variant-Eintrag für "${paletteId}" fehlgeschlagen: ${varErr.message}`, created },
        { status: 500 },
      )
    }

    created.push({ paletteId, presetId: clone.id })
  }

  return NextResponse.json({ created, skipped })
}
