/**
 * PROJ-54: Listing-Image-Sets — produziert die N Bilder eines Etsy-Listings
 * aus einem Preset durch Iteration über die Items eines Listing-Image-Sets.
 *
 * Konsumiert ausschließlich von der PROJ-53 Mass-Listing-Pipeline; der
 * normale Marketing-Render (preset_renders über mockup_set_ids) ist davon
 * unberührt.
 *
 * Storage-Schema:
 *   bucket:        preset-renders
 *   pfad:          listing-images/<preset_id>/<listing_image_set_slug>/<item_label>.png
 *
 * Ablauf (Aufruferseite, typisch in einem Mass-Listing-Script):
 *   1. Poster-PNG einmal für das Preset rendern (z. B. via headless editor)
 *   2. composeListingImagesForPreset() aufrufen
 *   3. Zurück kommt eine Liste { item, imageUrl, storagePath }
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import sharp from 'sharp'
import { composeLocalMockup, type SlotRect } from './local-mockup-processor'

// ─── Types ─────────────────────────────────────────────────────────────────

export type PaletteMode = 'main' | 'all' | 'compare'

/**
 * Auto-Layout für Compare-Grids — bestimmt cols×rows aus der Palette-Anzahl.
 * Optimiert für (überwiegend) quadratische Outputs mit Hochkant-Posters in den
 * Tiles. Bei ungeraden Counts gibt es leere Zellen (z. B. 3 Paletten in 2×2 →
 * 1 leere Zelle, mit weißem Hintergrund).
 */
export function computeCompareGridLayout(n: number): { cols: number; rows: number } {
  if (n <= 1) return { cols: 1, rows: 1 }
  if (n === 2) return { cols: 2, rows: 1 }
  if (n <= 4) return { cols: 2, rows: 2 }
  if (n <= 6) return { cols: 3, rows: 2 }
  if (n <= 9) return { cols: 3, rows: 3 }
  // Fallback: möglichst quadratisch
  const cols = Math.ceil(Math.sqrt(n))
  const rows = Math.ceil(n / cols)
  return { cols, rows }
}

export interface ListingImageSetItemRow {
  id: string
  listing_image_set_id: string
  mockup_set_id: string
  annotation_portrait_url: string | null
  annotation_landscape_url: string | null
  label: string
  display_name: string
  display_order: number
  palette_mode: PaletteMode
}

export interface ListingImageSetRow {
  id: string
  slug: string
  name: string
  description: string | null
  poster_type: 'map' | 'star-map' | 'photo' | null
  is_active: boolean
}

interface MockupSetRowForListing {
  id: string
  slug: string
  provider: 'dynamic_mockups' | 'local'
  local_portrait_overlay_url: string | null
  local_landscape_overlay_url: string | null
  local_portrait_slot: SlotRect | null
  local_landscape_slot: SlotRect | null
}

export interface ListingImageResult {
  item: ListingImageSetItemRow
  storagePath: string
  publicUrl: string
}

export interface ComposeListingImagesParams {
  supabase: SupabaseClient
  presetId: string
  posterBuffer: Buffer
  orientation: 'portrait' | 'landscape'
  listingImageSet: ListingImageSetRow
  /**
   * Optional vorgefilterte Items — wenn gesetzt, wird kein Fetch durchgeführt.
   * Aufrufer kann so z. B. nur die `palette_mode='main'` oder nur die `'all'`-
   * Items übergeben (PROJ-54 Phase A).
   */
  items?: ListingImageSetItemRow[]
}

// ─── Public API ────────────────────────────────────────────────────────────

const LISTING_BUCKET = 'preset-renders'

/**
 * Holt alle Items eines Listing-Image-Sets in display_order. Wirft, wenn das
 * Set leer ist oder nicht existiert — leere Sets erzeugen keine Bilder.
 */
export async function fetchListingImageSetItems(
  supabase: SupabaseClient,
  listingImageSetId: string,
): Promise<ListingImageSetItemRow[]> {
  const { data, error } = await supabase
    .from('listing_image_set_items')
    .select('id, listing_image_set_id, mockup_set_id, annotation_portrait_url, annotation_landscape_url, label, display_name, display_order, palette_mode')
    .eq('listing_image_set_id', listingImageSetId)
    .order('display_order')
  if (error) throw new Error(`fetchListingImageSetItems: ${error.message}`)
  if (!data || data.length === 0) {
    throw new Error(`Listing-Image-Set ${listingImageSetId} hat keine Items.`)
  }
  return data as ListingImageSetItemRow[]
}

/**
 * Hauptfunktion: erzeugt alle Bilder eines Listing-Image-Sets für ein Preset.
 *
 * Routet zwei Mockup-Provider:
 *  - provider='local'           → sharp-Composite (Poster + Overlay + Annotation)
 *  - provider='dynamic_mockups' → reads existing `preset_renders` entry für
 *                                 (preset × mockup_set × variant='desktop'),
 *                                 lädt DM-Composite herunter, legt optional
 *                                 Annotation per sharp obendrauf.
 *                                 Voraussetzung: DM-Mockup muss vom Worker
 *                                 vorgerendert sein (PROJ-53-Render-Trigger
 *                                 inkludiert es automatisch, siehe dort).
 *
 * Wirft auf jedem Fehler — Aufrufer entscheidet, ob er einzelne Items
 * isoliert behandelt oder bei jeder Lücke abbricht.
 */
export async function composeListingImagesForPreset(
  params: ComposeListingImagesParams,
): Promise<ListingImageResult[]> {
  const { supabase, presetId, posterBuffer, orientation, listingImageSet } = params

  const allItems = params.items ?? await fetchListingImageSetItems(supabase, listingImageSet.id)
  // Compare-Items werden separat via composeCompareGridForItem behandelt
  // (brauchen Zugriff auf alle Variant-Posters, nicht nur den aktuellen).
  const items = allItems.filter((i) => i.palette_mode !== 'compare')
  if (items.length === 0) {
    return []
  }

  // Mockup-Sets in einem Rutsch laden (kein N+1)
  const mockupSetIds = Array.from(new Set(items.map((i) => i.mockup_set_id)))
  const { data: mockupSets, error: msErr } = await supabase
    .from('mockup_sets')
    .select('id, slug, provider, local_portrait_overlay_url, local_landscape_overlay_url, local_portrait_slot, local_landscape_slot')
    .in('id', mockupSetIds)
  if (msErr) throw new Error(`mockup_sets fetch: ${msErr.message}`)

  const mockupSetMap = new Map<string, MockupSetRowForListing>(
    (mockupSets ?? []).map((m) => [m.id as string, m as MockupSetRowForListing]),
  )

  const results: ListingImageResult[] = []
  for (const item of items) {
    const mockupSet = mockupSetMap.get(item.mockup_set_id)
    if (!mockupSet) {
      throw new Error(`Item "${item.label}": Mockup-Set ${item.mockup_set_id} nicht gefunden.`)
    }

    const annotationUrl =
      orientation === 'landscape' ? item.annotation_landscape_url : item.annotation_portrait_url
    const annotationBuffer = annotationUrl
      ? await fetchAsBuffer(annotationUrl, `annotation ${item.label}/${orientation}`)
      : undefined

    let composite: Buffer

    if (mockupSet.provider === 'local') {
      const overlayUrl =
        orientation === 'landscape' ? mockupSet.local_landscape_overlay_url : mockupSet.local_portrait_overlay_url
      const slot =
        orientation === 'landscape' ? mockupSet.local_landscape_slot : mockupSet.local_portrait_slot
      if (!overlayUrl || !slot) {
        throw new Error(
          `Item "${item.label}": Mockup-Set "${mockupSet.slug}" hat kein ${orientation}-Overlay konfiguriert.`,
        )
      }
      const overlayBuffer = await fetchAsBuffer(overlayUrl, `overlay ${mockupSet.slug}/${orientation}`)
      composite = await composeLocalMockup({
        posterBuffer,
        overlayBuffer,
        slot,
        annotationBuffer,
      })
    } else {
      // DM-Provider: vorhandenes DM-Composite aus preset_renders ziehen
      const variant = orientation === 'landscape' ? 'desktop' : 'desktop' // Desktop ist immer das native Aspect
      const { data: render } = await supabase
        .from('preset_renders')
        .select('image_url')
        .eq('preset_id', presetId)
        .eq('mockup_set_id', mockupSet.id)
        .eq('variant', variant)
        .maybeSingle()
      if (!render?.image_url) {
        throw new Error(
          `Item "${item.label}": DM-Mockup "${mockupSet.slug}" ist für dieses Preset noch nicht vorgerendert. ` +
            `Bitte „Render starten" auf der Etsy-Listing-Def klicken (PROJ-53 inkludiert das Mockup automatisch).`,
        )
      }
      const dmComposite = await fetchAsBuffer(render.image_url as string, `DM-Composite ${mockupSet.slug}`)
      if (annotationBuffer) {
        composite = await sharp(dmComposite)
          .composite([{ input: annotationBuffer, top: 0, left: 0 }])
          .jpeg({ quality: 88, mozjpeg: true })
          .toBuffer()
      } else {
        // Re-encode als JPEG für konsistente Storage-Größe
        composite = await sharp(dmComposite).jpeg({ quality: 88, mozjpeg: true }).toBuffer()
      }
    }

    // Storage hochladen
    const storagePath = `listing-images/${presetId}/${listingImageSet.slug}/${item.label}.png`
    const { error: upErr } = await supabase.storage
      .from(LISTING_BUCKET)
      .upload(storagePath, composite, {
        contentType: 'image/jpeg',
        upsert: true,
        cacheControl: '3600',
      })
    if (upErr) throw new Error(`Item "${item.label}" Storage-Upload: ${upErr.message}`)

    const { data: urlData } = supabase.storage.from(LISTING_BUCKET).getPublicUrl(storagePath)
    const publicUrl = `${urlData.publicUrl}?v=${Date.now()}`

    results.push({ item, storagePath, publicUrl })
  }

  return results
}

async function fetchAsBuffer(url: string, label: string): Promise<Buffer> {
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`Konnte ${label} nicht laden: ${url} → HTTP ${res.status}`)
  }
  return Buffer.from(await res.arrayBuffer())
}

// ─── Compare-Grid (PROJ-54: palette_mode='compare') ────────────────────────

export interface ComposeCompareGridParams {
  supabase: SupabaseClient
  item: ListingImageSetItemRow
  listingImageSet: ListingImageSetRow
  orientation: 'portrait' | 'landscape'
  /** Variants in palette_ids-Reihenfolge (Tile-Reihenfolge entspricht dieser) */
  variants: { palette_id: string; cloned_preset_id: string; posterUrl: string }[]
  /** Storage-Pfad-Anker: das Compare-Bild liegt im Folder des Main-Presets,
   *  damit der bestehende Storage-Scan es findet. */
  mainPresetId: string
}

/**
 * Rendert für jede Palette das Composite (Poster + Mockup + ggf. Annotation
 * weglassen — die kommt erst aufs Grid), tilet die N Composites in einem
 * Grid-Layout und legt am Ende optional die Item-Annotation 1:1 obendrauf.
 *
 * Tile-Cell-Größe = mockup-canvas-Größe (z. B. 2000×2000) ÷ Grid-Dimensionen.
 * Annotation-PNG muss in der ENDGÜLTIGEN Grid-Größe sein (= mockup-canvas).
 */
export async function composeCompareGridForItem(
  params: ComposeCompareGridParams,
): Promise<ListingImageResult> {
  const { supabase, item, listingImageSet, orientation, variants, mainPresetId } = params

  // 1. Mockup-Set Details laden (für Canvas-Größe + Provider)
  const { data: mockupSet, error: msErr } = await supabase
    .from('mockup_sets')
    .select('id, slug, provider, local_portrait_overlay_url, local_landscape_overlay_url, local_portrait_slot, local_landscape_slot')
    .eq('id', item.mockup_set_id)
    .single()
  if (msErr || !mockupSet) {
    throw new Error(`Compare-Item "${item.label}": Mockup-Set ${item.mockup_set_id} nicht gefunden.`)
  }
  const ms = mockupSet as MockupSetRowForListing

  // 2. Output-Canvas-Größe bestimmen (vom Mockup-Canvas oder vom DM-Output)
  let canvasW: number
  let canvasH: number
  if (ms.provider === 'local') {
    const slot = orientation === 'landscape' ? ms.local_landscape_slot : ms.local_portrait_slot
    if (!slot) throw new Error(`Compare-Item "${item.label}": Mockup "${ms.slug}" hat kein ${orientation}-Overlay konfiguriert.`)
    canvasW = slot.canvasWidth
    canvasH = slot.canvasHeight
  } else {
    // DM: erstes verfügbares preset_renders auslesen, um die Größe zu kennen
    const firstVariantPid = variants[0]?.cloned_preset_id
    if (!firstVariantPid) throw new Error(`Compare-Item "${item.label}": keine Varianten verfügbar.`)
    const { data: r } = await supabase
      .from('preset_renders')
      .select('image_width, image_height')
      .eq('preset_id', firstVariantPid)
      .eq('mockup_set_id', ms.id)
      .eq('variant', 'desktop')
      .maybeSingle()
    if (!r?.image_width || !r?.image_height) {
      throw new Error(`Compare-Item "${item.label}": DM-Mockup "${ms.slug}" hat kein preset_renders — bitte Render starten.`)
    }
    canvasW = r.image_width as number
    canvasH = r.image_height as number
  }

  // 3. Layout berechnen
  const { cols, rows } = computeCompareGridLayout(variants.length)
  const cellW = Math.floor(canvasW / cols)
  const cellH = Math.floor(canvasH / rows)

  // 4. Pro Variante Composite (ohne Annotation) erzeugen, auf Cell-Größe resizen
  const tiles = await Promise.all(variants.map(async (v) => {
    const posterBuf = await fetchAsBuffer(v.posterUrl, `compare poster ${v.palette_id}`)
    let composite: Buffer
    if (ms.provider === 'local') {
      const overlayUrl = orientation === 'landscape' ? ms.local_landscape_overlay_url : ms.local_portrait_overlay_url
      const slot = orientation === 'landscape' ? ms.local_landscape_slot : ms.local_portrait_slot
      if (!overlayUrl || !slot) throw new Error(`Compare-Item "${item.label}": Overlay fehlt`)
      const overlayBuf = await fetchAsBuffer(overlayUrl, `compare overlay ${v.palette_id}`)
      composite = await composeLocalMockup({ posterBuffer: posterBuf, overlayBuffer: overlayBuf, slot })
    } else {
      const { data: r } = await supabase
        .from('preset_renders')
        .select('image_url')
        .eq('preset_id', v.cloned_preset_id)
        .eq('mockup_set_id', ms.id)
        .eq('variant', 'desktop')
        .maybeSingle()
      if (!r?.image_url) {
        throw new Error(`Compare-Item "${item.label}": DM-Composite für Palette ${v.palette_id} fehlt.`)
      }
      composite = await fetchAsBuffer(r.image_url as string, `compare DM ${v.palette_id}`)
    }
    // Auf Cell-Größe bringen — cover-fit + zusätzlicher Zoom-Faktor, damit
    // der Rahmen mehr von der Cell ausfüllt und weniger Wand-Hintergrund zu
    // sehen ist. Composite wird auf zoomFactor×Cell hochskaliert und dann
    // mittig auf Cell-Größe beschnitten.
    const zoomFactor = 1.15
    const scaledW = Math.round(cellW * zoomFactor)
    const scaledH = Math.round(cellH * zoomFactor)
    const fitted = await sharp(composite)
      .resize(scaledW, scaledH, { fit: 'cover', position: 'center' })
      .extract({
        left: Math.round((scaledW - cellW) / 2),
        top: Math.round((scaledH - cellH) / 2),
        width: cellW,
        height: cellH,
      })
      .toBuffer()
    return fitted
  }))

  // 5. Tiles in Grid-Layout zusammensetzen
  const layers = tiles.map((tile, i) => ({
    input: tile,
    top: Math.floor(i / cols) * cellH,
    left: (i % cols) * cellW,
  }))

  // 6. Optional Annotation oben drauf
  const annotationUrl = orientation === 'landscape' ? item.annotation_landscape_url : item.annotation_portrait_url
  if (annotationUrl) {
    const annBuf = await fetchAsBuffer(annotationUrl, `compare annotation ${item.label}`)
    layers.push({ input: annBuf, top: 0, left: 0 })
  }

  const grid = await sharp({
    create: {
      width: canvasW,
      height: canvasH,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    },
  })
    .composite(layers)
    .jpeg({ quality: 88, mozjpeg: true })
    .toBuffer()

  // 7. Speichern im Main-Preset-Folder (damit der bestehende Scan es findet)
  const storagePath = `listing-images/${mainPresetId}/${listingImageSet.slug}/${item.label}.png`
  const { error: upErr } = await supabase.storage
    .from(LISTING_BUCKET)
    .upload(storagePath, grid, { contentType: 'image/jpeg', upsert: true, cacheControl: '3600' })
  if (upErr) throw new Error(`Compare-Item "${item.label}" Storage-Upload: ${upErr.message}`)

  const { data: urlData } = supabase.storage.from(LISTING_BUCKET).getPublicUrl(storagePath)
  return { item, storagePath, publicUrl: `${urlData.publicUrl}?v=${Date.now()}` }
}
