import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase-admin'
import { getListingTemplate, type TemplateKey } from '@/lib/etsy/listing-templates'
import { buildVelaCsv, skuSlug, type ColorLook, type ListingInput } from '@/lib/etsy/vela-csv'

// PROJ-53: Vela-CSV-Export für eine Listing-Definition.
// 409, wenn nicht alle benötigten Flat-Renders 'done' sind — keine still
// unvollständige CSV.

export async function GET(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: 'Forbidden' }, { status: auth.status })

  const { id } = await context.params
  const admin = createAdminClient()

  const { data: def, error: defErr } = await admin
    .from('etsy_listing_defs')
    .select('id, name, template_key, palette_ids, listing_image_set_id, main_palette_id')
    .eq('id', id)
    .single()
  if (defErr || !def) return NextResponse.json({ error: 'Listing-Definition nicht gefunden' }, { status: 404 })

  const template = getListingTemplate(def.template_key as TemplateKey)

  const { data: variants } = await admin
    .from('etsy_listing_variants')
    .select('palette_id, cloned_preset_id')
    .eq('listing_def_id', id)
  if (!variants || variants.length === 0) {
    return NextResponse.json({ error: 'Noch keine Varianten gerendert — erst „Render starten".' }, { status: 409 })
  }

  // Preset-Klone (flaches A4-Render + Status) laden
  const presetIds = variants.map((v) => v.cloned_preset_id).filter(Boolean) as string[]
  const { data: presets } = await admin
    .from('presets')
    .select('id, preview_image_url_a4, render_status_a4')
    .in('id', presetIds)
  const presetById = new Map((presets ?? []).map((p) => [p.id, p]))

  // Palettennamen (V2 Option)
  const { data: palettes } = await admin
    .from('map_palettes')
    .select('id, name')
    .in('id', def.palette_ids as string[])
  const paletteName = new Map((palettes ?? []).map((p) => [p.id, p.name as string]))

  const variantByPalette = new Map(variants.map((v) => [v.palette_id, v]))

  // colorLooks in der Reihenfolge der Definition; fehlende Renders sammeln
  const colorLooks: ColorLook[] = []
  const missing: string[] = []
  for (const paletteId of def.palette_ids as string[]) {
    const variant = variantByPalette.get(paletteId)
    const preset = variant?.cloned_preset_id ? presetById.get(variant.cloned_preset_id) : undefined
    const flatUrl = preset?.preview_image_url_a4 ?? ''
    if (!variant) { missing.push(`${paletteId}: nicht gerendert`); continue }
    if (preset?.render_status_a4 !== 'done' || !flatUrl) { missing.push(`${paletteId}: Render nicht fertig`); continue }
    colorLooks.push({
      paletteId,
      paletteName: paletteName.get(paletteId) ?? paletteId,
      flatRenderUrl: flatUrl,
    })
  }

  if (missing.length > 0) {
    return NextResponse.json(
      { error: 'Nicht alle Farb-Looks sind fertig gerendert.', missing },
      { status: 409 },
    )
  }

  // PROJ-54 Phase 4: Photo 1..10 = Listing-Image-Set Output (Main-Bilder zuerst,
  // dann pro Palette die 'all'-Items). Fallback auf raw Renders wenn kein
  // Listing-Image-Set zugewiesen.
  // 'Var Photo' pro Palette: erstes 'all'-Item für diese Palette, sonst bare Poster.
  const photos: string[] = []

  if (def.listing_image_set_id) {
    const { data: setRow } = await admin
      .from('listing_image_sets')
      .select('id, slug')
      .eq('id', def.listing_image_set_id)
      .single()
    const { data: items } = await admin
      .from('listing_image_set_items')
      .select('label, display_order, palette_mode')
      .eq('listing_image_set_id', def.listing_image_set_id)
      .order('display_order')

    if (setRow && items && items.length > 0) {
      const mainPaletteId = (def.main_palette_id as string | null) ?? colorLooks[0].paletteId
      const mainPresetId = variantByPalette.get(mainPaletteId)?.cloned_preset_id as string | null

      // Pro Variant-Preset die Storage-Files listen + URLs sammeln
      const filesByPreset = new Map<string, Map<string, string>>()
      await Promise.all(
        variants.map(async (v) => {
          const pid = v.cloned_preset_id as string | null
          if (!pid) return
          const folder = `listing-images/${pid}/${setRow.slug}`
          const { data: files } = await admin.storage.from('preset-renders').list(folder, { limit: 100 })
          if (!files) return
          const m = new Map<string, string>()
          for (const f of files) {
            const label = f.name.replace(/\.png$/, '')
            const { data: u } = admin.storage.from('preset-renders').getPublicUrl(`${folder}/${f.name}`)
            const updatedAt = (f as { updated_at?: string }).updated_at
            const cb = updatedAt ? `?v=${Date.parse(updatedAt) || Date.now()}` : ''
            m.set(label, `${u.publicUrl}${cb}`)
          }
          filesByPreset.set(pid, m)
        }),
      )

      // Eine flache Iteration über alle Items in display_order. Pro Item:
      //   'main' → 1 Bild aus dem Main-Variant-Preset
      //   'all'  → N Bilder, eines pro Palette (gestapelt in palette_ids-Reihenfolge)
      // Die Reihenfolge in der CSV entspricht exakt dem display_order der Items
      // im Listing-Image-Set — kein Sortier-Magic.
      // PROJ-54: Galerie enthält Main + Compare + 'all' (eines pro Palette,
      // in palette_ids-Reihenfolge). 'all'-Items doppeln sich mit Var Photo
      // bewusst — Etsy zeigt sie sowohl in der Galerie als auch beim
      // Variant-Picker dem Käufer.
      for (const it of items) {
        const mode = (it.palette_mode as 'main' | 'all' | 'compare') ?? 'all'
        if (mode === 'main' || mode === 'compare') {
          const url = mainPresetId ? filesByPreset.get(mainPresetId)?.get(it.label as string) : null
          if (url) photos.push(url)
        } else {
          // 'all' — pro Palette ein Bild, in palette_ids-Reihenfolge
          for (const look of colorLooks) {
            const pid = variantByPalette.get(look.paletteId)?.cloned_preset_id as string | null
            const url = pid ? filesByPreset.get(pid)?.get(it.label as string) : null
            if (url) photos.push(url)
          }
        }
      }
      // Var Photo override: erstes 'all'-Item pro Palette als Variant-Bild
      // (Etsy zeigt's beim Variant-Picker dem Käufer)
      const firstAllItem = items.find((i) => i.palette_mode === 'all')
      if (firstAllItem) {
        const firstAllLabel = firstAllItem.label as string
        for (const look of colorLooks) {
          const pid = variantByPalette.get(look.paletteId)?.cloned_preset_id as string | null
          const url = pid ? filesByPreset.get(pid)?.get(firstAllLabel) : null
          if (url) look.flatRenderUrl = url
        }
      }
    }
  }

  // Fallback nur, wenn KEIN Listing-Image-Set zugewiesen ist (Backwards-Compat
  // für ältere Defs). Mit Set ist das Set die alleinige Quelle der Photos —
  // wenn dort nichts drin steht, ist das ein Konfig-Fehler, kein Fall für
  // automatisches Auffüllen mit unbeschrifteten Renders.
  if (!def.listing_image_set_id && photos.length < 10) {
    const defaultPaletteId = colorLooks[0].paletteId
    const defaultPresetId = variantByPalette.get(defaultPaletteId)?.cloned_preset_id
    if (photos.length === 0) photos.push(colorLooks[0].flatRenderUrl)
    if (defaultPresetId) {
      const { data: renders } = await admin
        .from('preset_renders')
        .select('image_url, mockup_set_id')
        .eq('preset_id', defaultPresetId)
        .eq('variant', 'desktop')
        .order('mockup_set_id')
      for (const r of renders ?? []) {
        if (photos.length >= 10) break
        if (r.image_url) photos.push(r.image_url as string)
      }
    }
  }

  const input: ListingInput = {
    template,
    skuBase: skuSlug(def.name) || id.slice(0, 8),
    photos: photos.slice(0, 10),
    colorLooks,
  }

  const { csv, warnings } = buildVelaCsv([input])

  const filename = `vela-${skuSlug(def.name) || id.slice(0, 8)}.csv`
  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      // Warnungen (lange Titel etc.) im Header, damit die UI sie zeigen kann
      'X-Vela-Warnings': encodeURIComponent(JSON.stringify(warnings)),
    },
  })
}
