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
    .select('id, name, template_key, palette_ids')
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

  // Default-Look (erster) für die Listing-Fotos (Photo 1..10)
  const defaultPaletteId = colorLooks[0].paletteId
  const defaultPresetId = variantByPalette.get(defaultPaletteId)?.cloned_preset_id
  const photos: string[] = [colorLooks[0].flatRenderUrl]
  if (defaultPresetId) {
    const { data: renders } = await admin
      .from('preset_renders')
      .select('image_url, mockup_set_id')
      .eq('preset_id', defaultPresetId)
      .eq('variant', 'desktop')
      .order('mockup_set_id')
    for (const r of renders ?? []) {
      if (r.image_url) photos.push(r.image_url as string)
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
