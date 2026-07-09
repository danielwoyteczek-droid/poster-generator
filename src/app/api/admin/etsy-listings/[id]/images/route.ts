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
    .select('id, name, palette_ids, listing_image_set_id, main_palette_id')
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

  // PROJ-54 Phase 4.5+: Eine flache Etsy-Upload-Reihenfolge berechnen:
  //   galleryPhotos[] = in display_order, expandiert pro Palette für 'all'-Items
  //   variantPhotos[] = pro Palette das erste 'all'-Item (Etsy-Variant-Picker)
  // Die UI zeigt diese Liste 1:1 in der Reihenfolge wie sie auch in der
  // Vela-CSV landet.
  type GalleryPhoto = {
    slot: number
    item_id: string
    item_label: string
    display_name: string
    palette_id: string
    palette_name: string
    palette_mode: 'main' | 'all' | 'compare'
    url: string
  }
  type VariantPhoto = {
    palette_id: string
    palette_name: string
    item_id: string
    item_label: string
    url: string
  }
  type ListingItemMeta = { id: string; label: string; display_name: string; display_order: number; palette_mode: 'main' | 'all' | 'compare' }
  const galleryPhotos: GalleryPhoto[] = []
  const variantPhotos: VariantPhoto[] = []
  let listingSetMeta: {
    id: string
    slug: string
    name: string
    items: ListingItemMeta[]
    mainPaletteId: string | null
  } | null = null

  if (def.listing_image_set_id && presetIds.length) {
    const { data: setRow } = await admin
      .from('listing_image_sets')
      .select('id, slug, name')
      .eq('id', def.listing_image_set_id)
      .single()
    const { data: items } = await admin
      .from('listing_image_set_items')
      .select('id, label, display_name, display_order, palette_mode')
      .eq('listing_image_set_id', def.listing_image_set_id)
      .order('display_order')

    if (setRow && items && items.length) {
      const palettesArr = (def.palette_ids as string[]) ?? []
      const mainPaletteId = (def.main_palette_id as string | null) ?? palettesArr[0] ?? null

      listingSetMeta = {
        id: setRow.id as string,
        slug: setRow.slug as string,
        name: setRow.name as string,
        mainPaletteId,
        items: items.map((i) => ({
          id: i.id as string,
          label: i.label as string,
          display_name: i.display_name as string,
          display_order: i.display_order as number,
          palette_mode: (i.palette_mode as 'main' | 'all' | 'compare') ?? 'all',
        })),
      }

      // Storage-URLs pro Variant-Preset × Label sammeln
      const urlsByPreset = new Map<string, Map<string, string>>()
      await Promise.all(presetIds.map(async (presetId) => {
        const folder = `listing-images/${presetId}/${setRow.slug}`
        const { data: files } = await admin.storage
          .from('preset-renders')
          .list(folder, { limit: 100 })
        if (!files) return
        const m = new Map<string, string>()
        for (const f of files) {
          const fileLabel = f.name.replace(/\.png$/, '')
          const { data: urlData } = admin.storage.from('preset-renders').getPublicUrl(`${folder}/${f.name}`)
          const updatedAt = (f as { updated_at?: string }).updated_at
          const cacheBust = updatedAt ? `?v=${Date.parse(updatedAt) || Date.now()}` : ''
          m.set(fileLabel, `${urlData.publicUrl}${cacheBust}`)
        }
        urlsByPreset.set(presetId, m)
      }))

      // Flache Gallery-Liste: Items in display_order durchgehen, pro 'main'
      // 1 Slot, pro 'all' N Slots (eine pro Palette in palette_ids-Reihenfolge).
      const variantByPaletteLocal = new Map((variants ?? []).map((v) => [v.palette_id, v]))
      // PROJ-54: Galerie-Reihenfolge in display_order:
      //   main/compare → 1 Photo (aus dem Main-Variant-Preset-Folder)
      //   all         → N Photos (1 pro Palette in palette_ids-Reihenfolge),
      //                 doppeln sich mit Var Photo bewusst (Etsy zeigt sie
      //                 sowohl in Galerie als auch beim Variant-Picker).
      let slot = 1
      for (const it of listingSetMeta.items) {
        if (it.palette_mode === 'main' || it.palette_mode === 'compare') {
          const mainPresetId = (variantByPaletteLocal.get(mainPaletteId ?? '')?.cloned_preset_id as string | null) ?? null
          const url = mainPresetId ? urlsByPreset.get(mainPresetId)?.get(it.label) : null
          if (url) {
            galleryPhotos.push({
              slot, item_id: it.id, item_label: it.label, display_name: it.display_name,
              palette_id: it.palette_mode === 'compare' ? 'all-tiled' : (mainPaletteId ?? '?'),
              palette_name: it.palette_mode === 'compare' ? 'Compare-Grid' : (paletteName.get(mainPaletteId ?? '') ?? mainPaletteId ?? '?'),
              palette_mode: it.palette_mode, url,
            })
            slot++
          }
        } else {
          // 'all' — pro Palette ein Photo
          for (const paletteId of palettesArr) {
            const presetId = variantByPaletteLocal.get(paletteId)?.cloned_preset_id as string | null
            const url = presetId ? urlsByPreset.get(presetId)?.get(it.label) : null
            if (url) {
              galleryPhotos.push({
                slot, item_id: it.id, item_label: it.label, display_name: it.display_name,
                palette_id: paletteId, palette_name: paletteName.get(paletteId) ?? paletteId,
                palette_mode: 'all', url,
              })
              slot++
            }
          }
        }
      }

      // Variant-Picker-Bilder: erstes 'all'-Item pro Palette
      const firstAllItem = listingSetMeta.items.find((i) => i.palette_mode === 'all')
      if (firstAllItem) {
        for (const paletteId of palettesArr) {
          const presetId = variantByPaletteLocal.get(paletteId)?.cloned_preset_id as string | null
          const url = presetId ? urlsByPreset.get(presetId)?.get(firstAllItem.label) : null
          if (url) {
            variantPhotos.push({
              palette_id: paletteId,
              palette_name: paletteName.get(paletteId) ?? paletteId,
              item_id: firstAllItem.id,
              item_label: firstAllItem.label,
              url,
            })
          }
        }
      }
    }
  }

  const looks = (def.palette_ids as string[]).map((paletteId) => {
    const variant = variantByPalette.get(paletteId)
    const preset = variant?.cloned_preset_id ? presetById.get(variant.cloned_preset_id) : undefined
    const clonedId = variant?.cloned_preset_id
    return {
      paletteId,
      paletteName: paletteName.get(paletteId) ?? paletteId,
      status: preset?.render_status_a4 ?? null,
      flatUrl: preset?.preview_image_url_a4 ?? null,
      mockups: clonedId ? mockupsByPreset.get(clonedId) ?? [] : [],
    }
  })

  return NextResponse.json({
    name: def.name,
    looks,
    listingImageSet: listingSetMeta,
    galleryPhotos,
    variantPhotos,
  })
}
