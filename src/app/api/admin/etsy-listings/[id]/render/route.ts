import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase-admin'
import { bakePaletteIntoConfig, type PresetConfig } from '@/lib/image-generator/palette-bake'

// PROJ-53: Render-Trigger (Ansatz A — Preset-Klon je Palette).
// Pro gewählter Palette wird ein Preset-Klon erzeugt/aktualisiert:
//  - Palette als customPalette EINGEBACKEN (paletteId='custom'), damit der
//    Headless-Render die Farben trifft OHNE den dort nicht gewärmten DB-
//    Paletten-Cache (sonst Fallback auf MAP_PALETTES[0] → alles mint).
//  - optionaler Ort-Override (marker/lat/lng/zoom) — nur Kartenausschnitt.
//  - render_status='pending' → Render-Worker (PROJ-30/52) übernimmt.
// Re-Render-fähig: bestehende Klone werden AKTUALISIERT (nicht übersprungen),
// damit Paletten-/Ort-Änderungen und Fixes beim erneuten Klick greifen.

export async function POST(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: 'Forbidden' }, { status: auth.status })

  const { id } = await context.params
  const admin = createAdminClient()

  const { data: def, error: defErr } = await admin
    .from('etsy_listing_defs')
    .select('id, name, base_preset_id, palette_ids, mockup_set_ids, location_lat, location_lng, location_zoom, listing_image_set_id')
    .eq('id', id)
    .single()
  if (defErr || !def) return NextResponse.json({ error: 'Listing-Definition nicht gefunden' }, { status: 404 })

  // PROJ-54: Wenn ein Listing-Image-Set zugewiesen ist, alle DM-Mockups, die
  // dort in Items referenziert werden, automatisch zu mockup_set_ids hinzufügen
  // — damit der Worker sie pro Palette vorrendert und der Listing-Image-Set-
  // Compositor sie später aus preset_renders lesen kann. Lokale Mockups
  // brauchen das nicht (composite passiert direkt aus dem PNG).
  let effectiveMockupSetIds: string[] = (def.mockup_set_ids as string[]) ?? []
  if (def.listing_image_set_id) {
    const { data: items } = await admin
      .from('listing_image_set_items')
      .select('mockup_set_id')
      .eq('listing_image_set_id', def.listing_image_set_id)
    const itemMockupIds = Array.from(new Set((items ?? []).map((i) => i.mockup_set_id as string)))
    if (itemMockupIds.length > 0) {
      const { data: dmMockups } = await admin
        .from('mockup_sets')
        .select('id')
        .in('id', itemMockupIds)
        .eq('provider', 'dynamic_mockups')
      const dmIds = (dmMockups ?? []).map((m) => m.id as string)
      effectiveMockupSetIds = Array.from(new Set([...effectiveMockupSetIds, ...dmIds]))
    }
  }

  if (!def.palette_ids?.length) {
    return NextResponse.json({ error: 'Keine Paletten ausgewählt' }, { status: 400 })
  }

  const locOverride =
    def.location_lat != null && def.location_lng != null
      ? { lat: def.location_lat as number, lng: def.location_lng as number, zoom: def.location_zoom as number | null }
      : null

  const { data: base, error: baseErr } = await admin
    .from('presets')
    .select('name, description, poster_type, config_json, display_order')
    .eq('id', def.base_preset_id)
    .single()
  if (baseErr || !base) return NextResponse.json({ error: 'Basis-Preset nicht gefunden' }, { status: 404 })

  // Paletten-Farben laden → als customPalette einbacken (headless-sicher).
  const { data: paletteRows } = await admin
    .from('map_palettes')
    .select('id, colors')
    .in('id', def.palette_ids as string[])
  const paletteColors = new Map(
    (paletteRows ?? []).map((p) => [p.id as string, p.colors as Record<string, string> | null]),
  )

  const { data: existing } = await admin
    .from('etsy_listing_variants')
    .select('palette_id, cloned_preset_id')
    .eq('listing_def_id', id)
  const variantByPalette = new Map(
    (existing ?? []).map((v) => [v.palette_id, v.cloned_preset_id as string | null]),
  )

  const buildConfig = (paletteId: string): PresetConfig => {
    const config = bakePaletteIntoConfig(base.config_json as PresetConfig, paletteId, paletteColors.get(paletteId))
    if (locOverride) {
      const marker = (config.marker as Record<string, unknown> | undefined) ?? {}
      config.marker = { ...marker, lat: locOverride.lat, lng: locOverride.lng }
      config.lat = locOverride.lat
      config.lng = locOverride.lng
      if (locOverride.zoom != null) config.zoom = locOverride.zoom
    }
    return config
  }

  const created: string[] = []
  const updated: string[] = []

  for (const paletteId of def.palette_ids as string[]) {
    const presetFields = {
      name: `${def.name} · ${paletteId}`.slice(0, 200),
      description: base.description,
      poster_type: base.poster_type,
      config_json: buildConfig(paletteId),
      display_order: base.display_order,
      status: 'draft',
      mockup_set_ids: effectiveMockupSetIds,
      render_status: 'pending',
      render_status_a4: 'pending',
      render_status_a3: 'pending',
      render_status_a2: 'pending',
    }

    const existingPresetId = variantByPalette.get(paletteId)

    if (existingPresetId) {
      const { error: updErr } = await admin.from('presets').update(presetFields).eq('id', existingPresetId)
      if (updErr) {
        return NextResponse.json(
          { error: `Update für Palette "${paletteId}" fehlgeschlagen: ${updErr.message}`, created, updated },
          { status: 500 },
        )
      }
      updated.push(paletteId)
    } else {
      const { data: clone, error: cloneErr } = await admin
        .from('presets')
        .insert(presetFields)
        .select('id')
        .single()
      if (cloneErr || !clone) {
        return NextResponse.json(
          { error: `Klon für Palette "${paletteId}" fehlgeschlagen: ${cloneErr?.message}`, created, updated },
          { status: 500 },
        )
      }
      const { error: varErr } = await admin
        .from('etsy_listing_variants')
        .insert({ listing_def_id: id, palette_id: paletteId, cloned_preset_id: clone.id })
      if (varErr) {
        return NextResponse.json(
          { error: `Variant-Eintrag für "${paletteId}" fehlgeschlagen: ${varErr.message}`, created, updated },
          { status: 500 },
        )
      }
      created.push(paletteId)
    }
  }

  return NextResponse.json({ created, updated })
}
