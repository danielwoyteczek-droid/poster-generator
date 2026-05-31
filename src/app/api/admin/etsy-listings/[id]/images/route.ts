import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase-admin'

// PROJ-53: Bild-URLs je Farb-Look einer Definition (für die UI-Vorschau).
// Pro Palette: flaches A4-Render + die Mockup-Composites (desktop).

export async function GET(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: 'Forbidden' }, { status: auth.status })

  const { id } = await context.params
  const admin = createAdminClient()

  const { data: def, error: defErr } = await admin
    .from('etsy_listing_defs')
    .select('id, name, palette_ids')
    .eq('id', id)
    .single()
  if (defErr || !def) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data: variants } = await admin
    .from('etsy_listing_variants')
    .select('palette_id, cloned_preset_id')
    .eq('listing_def_id', id)

  const presetIds = (variants ?? []).map((v) => v.cloned_preset_id).filter(Boolean) as string[]

  const presetById = new Map<string, { preview_image_url_a4: string | null; render_status_a4: string | null }>()
  if (presetIds.length) {
    const { data: presets } = await admin
      .from('presets')
      .select('id, preview_image_url_a4, render_status_a4')
      .in('id', presetIds)
    for (const p of presets ?? []) presetById.set(p.id, p)
  }

  const mockupsByPreset = new Map<string, string[]>()
  if (presetIds.length) {
    const { data: renders } = await admin
      .from('preset_renders')
      .select('preset_id, image_url, mockup_set_id')
      .in('preset_id', presetIds)
      .eq('variant', 'desktop')
      .order('mockup_set_id')
    for (const r of renders ?? []) {
      if (!r.image_url) continue
      const list = mockupsByPreset.get(r.preset_id) ?? []
      list.push(r.image_url as string)
      mockupsByPreset.set(r.preset_id, list)
    }
  }

  const { data: palettes } = await admin
    .from('map_palettes')
    .select('id, name')
    .in('id', def.palette_ids as string[])
  const paletteName = new Map((palettes ?? []).map((p) => [p.id, p.name as string]))

  const variantByPalette = new Map((variants ?? []).map((v) => [v.palette_id, v]))

  const looks = (def.palette_ids as string[]).map((paletteId) => {
    const variant = variantByPalette.get(paletteId)
    const preset = variant?.cloned_preset_id ? presetById.get(variant.cloned_preset_id) : undefined
    return {
      paletteId,
      paletteName: paletteName.get(paletteId) ?? paletteId,
      status: preset?.render_status_a4 ?? null,
      flatUrl: preset?.preview_image_url_a4 ?? null,
      mockups: variant?.cloned_preset_id ? mockupsByPreset.get(variant.cloned_preset_id) ?? [] : [],
    }
  })

  return NextResponse.json({ name: def.name, looks })
}
