import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase-admin'
import {
  composeListingImagesForPreset,
  composeCompareGridForItem,
  fetchListingImageSetItems,
  type ListingImageSetRow,
  type ListingImageSetItemRow,
} from '@/lib/listing-image-sets'

export const runtime = 'nodejs'
// sharp + N×Composite + Storage-Uploads — kann je nach #Varianten × #Items
// schnell mehrere Sekunden dauern. Deshalb explizite, großzügige Frist.
export const maxDuration = 60

/**
 * PROJ-54 Phase A: Erzeugt die Listing-Bilder einer etsy_listing_def.
 *
 * Routet zwei Item-Typen:
 *   palette_mode='main' → ein einziges Composite pro Item, gegen die
 *                         Variant der `main_palette_id` (Fallback palette_ids[0]).
 *                         Use-Case: Hero + Annotations, die in einer fixen
 *                         Brand-Palette für alle Listing-Varianten gleich sind.
 *   palette_mode='all'  → ein Composite pro Palette × Item.
 *                         Use-Case: Variant-spezifische Bilder, die Etsy beim
 *                         Variant-Picker dem Kunden zeigt.
 *
 * Antwort: pro Variante eine Status-Zeile + die generierten Bilder, plus
 * eine Zusammenfassung der "main"-Items (außerhalb der Varianten).
 */
export async function POST(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: 'Forbidden' }, { status: auth.status })

  const { id } = await context.params
  const admin = createAdminClient()

  // 1. Def + Set laden
  const { data: def, error: defErr } = await admin
    .from('etsy_listing_defs')
    .select('id, name, listing_image_set_id, palette_ids, main_palette_id')
    .eq('id', id)
    .single()
  if (defErr || !def) return NextResponse.json({ error: 'Listing-Definition nicht gefunden' }, { status: 404 })
  if (!def.listing_image_set_id) {
    return NextResponse.json(
      { error: 'Keine listing_image_set_id auf dieser Definition. Bitte erst zuweisen.' },
      { status: 400 },
    )
  }

  const { data: set, error: setErr } = await admin
    .from('listing_image_sets')
    .select('id, slug, name, description, poster_type, is_active')
    .eq('id', def.listing_image_set_id)
    .single()
  if (setErr || !set) return NextResponse.json({ error: 'Listing-Image-Set nicht gefunden' }, { status: 404 })
  const listingImageSet = set as ListingImageSetRow

  // 2. Items laden + nach palette_mode trennen
  const allItems = await fetchListingImageSetItems(admin, listingImageSet.id)
  const mainItems: ListingImageSetItemRow[] = allItems.filter((i) => i.palette_mode === 'main')
  const allModeItems: ListingImageSetItemRow[] = allItems.filter((i) => i.palette_mode === 'all')
  const compareItems: ListingImageSetItemRow[] = allItems.filter((i) => i.palette_mode === 'compare')

  // 3. Varianten + Preset-Daten laden
  const { data: variants } = await admin
    .from('etsy_listing_variants')
    .select('palette_id, cloned_preset_id')
    .eq('listing_def_id', id)
  if (!variants || variants.length === 0) {
    return NextResponse.json({ error: 'Keine Varianten vorhanden — bitte erst rendern.' }, { status: 400 })
  }

  const presetIds = variants.map((v) => v.cloned_preset_id).filter(Boolean) as string[]
  const { data: presets } = await admin
    .from('presets')
    .select('id, name, preview_image_url_a4, config_json')
    .in('id', presetIds)
  const presetById = new Map((presets ?? []).map((p) => [p.id as string, p]))

  // 4. Main-Palette bestimmen: konfigurierter Wert, sonst erste palette_id
  const palettes = (def.palette_ids as string[]) ?? []
  const mainPaletteId = (def.main_palette_id as string | null) ?? palettes[0] ?? null
  const mainVariant = variants.find((v) => v.palette_id === mainPaletteId) ?? null

  // 5. Pro Variante composit'en (mit Item-Filter je nach palette_mode)
  type VariantResult = {
    palette_id: string
    cloned_preset_id: string | null
    is_main: boolean
    status: 'ok' | 'skipped' | 'failed'
    images?: { label: string; url: string }[]
    error?: string
  }
  const results: VariantResult[] = []

  async function renderForVariant(
    variant: { palette_id: string; cloned_preset_id: string | null },
    itemsForVariant: ListingImageSetItemRow[],
    isMain: boolean,
  ): Promise<VariantResult> {
    const clonedPresetId = variant.cloned_preset_id
    if (!clonedPresetId) {
      return { palette_id: variant.palette_id, cloned_preset_id: null, is_main: isMain, status: 'skipped', error: 'Keine cloned_preset_id' }
    }
    if (itemsForVariant.length === 0) {
      return { palette_id: variant.palette_id, cloned_preset_id: clonedPresetId, is_main: isMain, status: 'ok', images: [] }
    }
    const preset = presetById.get(clonedPresetId)
    if (!preset) {
      return { palette_id: variant.palette_id, cloned_preset_id: clonedPresetId, is_main: isMain, status: 'skipped', error: 'Cloned preset nicht gefunden' }
    }
    const posterUrl = preset.preview_image_url_a4 as string | null
    if (!posterUrl) {
      return { palette_id: variant.palette_id, cloned_preset_id: clonedPresetId, is_main: isMain, status: 'skipped', error: 'A4-Poster noch nicht gerendert' }
    }
    const orientation: 'portrait' | 'landscape' =
      (preset.config_json as { orientation?: string } | null)?.orientation === 'landscape' ? 'landscape' : 'portrait'

    try {
      const posterResp = await fetch(posterUrl)
      if (!posterResp.ok) throw new Error(`Poster-Download HTTP ${posterResp.status}`)
      const posterBuffer = Buffer.from(await posterResp.arrayBuffer())

      const composed = await composeListingImagesForPreset({
        supabase: admin,
        presetId: clonedPresetId,
        posterBuffer,
        orientation,
        listingImageSet,
        items: itemsForVariant,
      })

      return {
        palette_id: variant.palette_id,
        cloned_preset_id: clonedPresetId,
        is_main: isMain,
        status: 'ok',
        images: composed.map((c) => ({ label: c.item.label, url: c.publicUrl })),
      }
    } catch (err) {
      return {
        palette_id: variant.palette_id,
        cloned_preset_id: clonedPresetId,
        is_main: isMain,
        status: 'failed',
        error: err instanceof Error ? err.message : String(err),
      }
    }
  }

  // 5a. 'main'-Items: einmal gegen den Main-Variant-Preset
  if (mainItems.length > 0) {
    if (!mainVariant) {
      results.push({
        palette_id: mainPaletteId ?? 'unknown',
        cloned_preset_id: null,
        is_main: true,
        status: 'skipped',
        error: 'Keine Variant für main_palette_id gefunden — bitte zuerst rendern.',
      })
    } else {
      results.push(await renderForVariant(mainVariant, mainItems, true))
    }
  }

  // 5b. 'all'-Items: pro Variante
  if (allModeItems.length > 0) {
    for (const variant of variants) {
      results.push(await renderForVariant(variant, allModeItems, false))
    }
  }

  // 5c. 'compare'-Items: einmal pro Item, mit allen Varianten getilt
  const compareResults: Array<{ item_label: string; status: 'ok' | 'failed' | 'skipped'; url?: string; error?: string }> = []
  if (compareItems.length > 0 && mainVariant?.cloned_preset_id) {
    const mainPresetId = mainVariant.cloned_preset_id as string

    // Prepare variants mit Poster-URLs (alle, in palette_ids-Reihenfolge)
    const variantsForCompare = (def.palette_ids as string[])
      .map((pid) => {
        const v = variants.find((vv) => vv.palette_id === pid)
        if (!v?.cloned_preset_id) return null
        const p = presetById.get(v.cloned_preset_id)
        if (!p?.preview_image_url_a4) return null
        return {
          palette_id: pid,
          cloned_preset_id: v.cloned_preset_id as string,
          posterUrl: p.preview_image_url_a4 as string,
        }
      })
      .filter((v): v is { palette_id: string; cloned_preset_id: string; posterUrl: string } => v !== null)

    if (variantsForCompare.length === 0) {
      for (const it of compareItems) {
        compareResults.push({ item_label: it.label, status: 'skipped', error: 'Keine Varianten mit fertigem Poster' })
      }
    } else {
      const orientation: 'portrait' | 'landscape' =
        ((presetById.get(mainPresetId)?.config_json as { orientation?: string } | null)?.orientation === 'landscape')
          ? 'landscape'
          : 'portrait'

      for (const item of compareItems) {
        try {
          const out = await composeCompareGridForItem({
            supabase: admin,
            item,
            listingImageSet,
            orientation,
            variants: variantsForCompare,
            mainPresetId,
          })
          compareResults.push({ item_label: item.label, status: 'ok', url: out.publicUrl })
        } catch (err) {
          compareResults.push({ item_label: item.label, status: 'failed', error: err instanceof Error ? err.message : String(err) })
        }
      }
    }
  } else if (compareItems.length > 0) {
    for (const it of compareItems) {
      compareResults.push({ item_label: it.label, status: 'skipped', error: 'Main-Variant fehlt — bitte erst rendern' })
    }
  }

  return NextResponse.json({
    listing_image_set: { id: listingImageSet.id, slug: listingImageSet.slug, name: listingImageSet.name },
    main_palette_id: mainPaletteId,
    main_items_count: mainItems.length,
    all_items_count: allModeItems.length,
    compare_items_count: compareItems.length,
    variants: results,
    compare: compareResults,
  })
}
