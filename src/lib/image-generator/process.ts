// PROJ-56: ein Galerie-Bild erzeugen. Dieselbe Routine läuft an zwei Orten:
//  - Schnellweg im Generate-/Retry-Endpunkt (nur lokale Mockups, Poster fertig)
//  - Render-Worker (Rest: Dynamic Mockups, Poster, die erst gerendert wurden)
//
// Nur relative Importe — wird auch von scripts/render-worker.ts geladen.

import crypto from 'node:crypto'
import sharp from 'sharp'
import type { SupabaseClient } from '@supabase/supabase-js'
import { composeLocalMockup, type SlotRect } from '../local-mockup-processor'
import { fetchCompositeBuffer, renderMockup } from '../dynamic-mockups-client'
import { configHash } from './config-hash'

export const RENDERS_BUCKET = 'preset-renders'

export const IMAGE_COLUMNS =
  'id, preset_id, palette_id, mockup_set_id, overlay_id, position, source_preset_id, status, error, storage_path, image_url, width, height, base_config_hash, claimed_at, rendered_at, created_at'

export const SOURCE_COLUMNS =
  'id, config_json, render_status_a4, render_error_a4, preview_image_url_a4, render_inputs_hash_a4'

export const MOCKUP_COLUMNS =
  'id, slug, name, provider, is_active, desktop_template_uuid, desktop_smart_object_uuid, local_portrait_overlay_url, local_landscape_overlay_url, local_portrait_slot, local_landscape_slot'

export interface ImageRow {
  id: string
  preset_id: string
  palette_id: string | null
  mockup_set_id: string
  overlay_id: string | null
  position: number
  source_preset_id: string | null
  status: 'pending' | 'rendering' | 'done' | 'failed'
  error: string | null
  storage_path: string | null
  image_url: string | null
  width: number | null
  height: number | null
  base_config_hash: string | null
  claimed_at: string | null
  rendered_at: string | null
  created_at: string
}

export interface SourceRow {
  id: string
  config_json: Record<string, unknown> | null
  render_status_a4: string | null
  render_error_a4: string | null
  preview_image_url_a4: string | null
  render_inputs_hash_a4: string | null
}

export interface MockupRow {
  id: string
  slug: string
  name: string
  provider: 'dynamic_mockups' | 'local'
  is_active: boolean
  desktop_template_uuid: string | null
  desktop_smart_object_uuid: string | null
  local_portrait_overlay_url: string | null
  local_landscape_overlay_url: string | null
  local_portrait_slot: SlotRect | null
  local_landscape_slot: SlotRect | null
}

export type SourcePosterState = 'ready' | 'waiting' | 'stale' | 'failed' | 'missing'

/**
 * Ist das A4-Poster der Quelle nutzbar?
 * - stale: fertig, aber für eine ältere Konfiguration gerendert → neu anstoßen
 * - Ohne gespeicherten Hash (Renders vor PROJ-56) gilt ein fertiges Poster als aktuell.
 */
export function sourcePosterState(source: SourceRow | null | undefined): SourcePosterState {
  if (!source) return 'missing'
  if (source.render_status_a4 === 'failed') return 'failed'
  if (source.render_status_a4 !== 'done' || !source.preview_image_url_a4) return 'waiting'
  if (source.render_inputs_hash_a4 && source.render_inputs_hash_a4 !== configHash(source.config_json)) return 'stale'
  return 'ready'
}

export function orientationOf(config: Record<string, unknown> | null | undefined): 'portrait' | 'landscape' {
  return config?.orientation === 'landscape' ? 'landscape' : 'portrait'
}

/** A4 des Quell-Presets neu in die Render-Queue stellen (nicht, wenn schon offen). */
export async function requeueSourcePoster(supabase: SupabaseClient, sourceId: string): Promise<void> {
  await supabase
    .from('presets')
    .update({ render_status_a4: 'pending', render_error_a4: null })
    .eq('id', sourceId)
    .not('render_status_a4', 'in', '(pending,rendering)')
}

export async function markImageFailed(supabase: SupabaseClient, imageId: string, message: string): Promise<void> {
  await supabase
    .from('image_generator_images')
    .update({ status: 'failed', error: message.slice(0, 1000), claimed_at: null, updated_at: new Date().toISOString() })
    .eq('id', imageId)
}

/** Bild atomar reservieren, damit Schnellweg und Worker es nie doppelt erzeugen. */
export async function claimImage(supabase: SupabaseClient, imageId: string): Promise<ImageRow | null> {
  const now = new Date().toISOString()
  const { data, error } = await supabase
    .from('image_generator_images')
    .update({ status: 'rendering', claimed_at: now, error: null, updated_at: now })
    .eq('id', imageId)
    .eq('status', 'pending')
    .select(IMAGE_COLUMNS)
    .maybeSingle()
  if (error || !data) return null
  return data as unknown as ImageRow
}

async function fetchBuffer(url: string, what: string): Promise<Buffer> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`${what} konnte nicht geladen werden (HTTP ${res.status})`)
  return Buffer.from(await res.arrayBuffer())
}

/** Overlay ohne Verzerrung auf die Canvas-Größe des Mockups bringen (zentriert, transparent aufgefüllt). */
export async function fitOverlayToCanvas(overlay: Buffer, width: number, height: number): Promise<Buffer> {
  return sharp(overlay)
    .resize(width, height, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer()
}

async function renderDynamicMockup(supabase: SupabaseClient, mockup: MockupRow, poster: Buffer): Promise<Buffer> {
  if (!mockup.desktop_template_uuid || !mockup.desktop_smart_object_uuid) {
    throw new Error(`Mockup „${mockup.name}" hat keine Dynamic-Mockups-Vorlage konfiguriert`)
  }
  const tempPath = `_temp/image-generator/${crypto.randomUUID()}/poster.jpg`
  const { error: tempErr } = await supabase.storage
    .from(RENDERS_BUCKET)
    .upload(tempPath, poster, { contentType: 'image/jpeg', upsert: true })
  if (tempErr) throw new Error(`Temp-Upload: ${tempErr.message}`)
  try {
    const { data } = supabase.storage.from(RENDERS_BUCKET).getPublicUrl(tempPath)
    const { exportPath } = await renderMockup({
      templateUuid: mockup.desktop_template_uuid,
      smartObjectUuid: mockup.desktop_smart_object_uuid,
      assetUrl: data.publicUrl,
    })
    return await fetchCompositeBuffer(exportPath)
  } finally {
    await supabase.storage.from(RENDERS_BUCKET).remove([tempPath]).catch(() => {})
  }
}

/**
 * Ein reserviertes Bild erzeugen, hochladen und als fertig markieren.
 * Wirft mit verständlicher Meldung; der Aufrufer markiert das Bild als fehlgeschlagen.
 */
export async function composeImage(supabase: SupabaseClient, image: ImageRow, source: SourceRow): Promise<ImageRow> {
  const { data: mockupData } = await supabase
    .from('mockup_sets')
    .select(MOCKUP_COLUMNS)
    .eq('id', image.mockup_set_id)
    .maybeSingle()
  const mockup = mockupData as unknown as MockupRow | null
  if (!mockup || !mockup.is_active) throw new Error('Mockup nicht mehr verfügbar')

  let overlayBuffer: Buffer | null = null
  if (image.overlay_id) {
    const { data: overlay } = await supabase
      .from('image_overlays')
      .select('image_url')
      .eq('id', image.overlay_id)
      .maybeSingle()
    if (!overlay) throw new Error('Overlay nicht mehr verfügbar')
    overlayBuffer = await fetchBuffer(overlay.image_url as string, 'Overlay')
  }

  if (!source.preview_image_url_a4) throw new Error('Poster (A4) fehlt')
  const poster = await fetchBuffer(source.preview_image_url_a4, 'Poster (A4)')
  const orientation = orientationOf(source.config_json)

  let output: Buffer
  if (mockup.provider === 'local') {
    const mockupOverlayUrl = orientation === 'landscape' ? mockup.local_landscape_overlay_url : mockup.local_portrait_overlay_url
    const slot = orientation === 'landscape' ? mockup.local_landscape_slot : mockup.local_portrait_slot
    if (!mockupOverlayUrl || !slot) {
      throw new Error(`Mockup „${mockup.name}" hat kein ${orientation === 'landscape' ? 'Querformat' : 'Hochformat'}`)
    }
    const mockupOverlay = await fetchBuffer(mockupOverlayUrl, 'Mockup-Overlay')
    output = await composeLocalMockup({
      posterBuffer: poster,
      overlayBuffer: mockupOverlay,
      slot,
      annotationBuffer: overlayBuffer
        ? await fitOverlayToCanvas(overlayBuffer, slot.canvasWidth, slot.canvasHeight)
        : undefined,
    })
  } else {
    const composite = await renderDynamicMockup(supabase, mockup, poster)
    if (overlayBuffer) {
      const meta = await sharp(composite).metadata()
      const fitted = await fitOverlayToCanvas(overlayBuffer, meta.width ?? 1, meta.height ?? 1)
      output = await sharp(composite).composite([{ input: fitted, top: 0, left: 0 }]).jpeg({ quality: 88, mozjpeg: true }).toBuffer()
    } else {
      output = await sharp(composite).jpeg({ quality: 88, mozjpeg: true }).toBuffer()
    }
  }

  const meta = await sharp(output).metadata()
  const storagePath = `image-generator/${image.preset_id}/${image.id}.jpg`
  const { error: upErr } = await supabase.storage
    .from(RENDERS_BUCKET)
    .upload(storagePath, output, { contentType: 'image/jpeg', upsert: true })
  if (upErr) throw new Error(`Upload: ${upErr.message}`)
  const { data: urlData } = supabase.storage.from(RENDERS_BUCKET).getPublicUrl(storagePath)
  const now = new Date().toISOString()

  const { data: updated, error: updErr } = await supabase
    .from('image_generator_images')
    .update({
      status: 'done',
      error: null,
      storage_path: storagePath,
      image_url: `${urlData.publicUrl}?v=${Date.now()}`,
      width: meta.width ?? null,
      height: meta.height ?? null,
      claimed_at: null,
      rendered_at: now,
      updated_at: now,
    })
    .eq('id', image.id)
    .select(IMAGE_COLUMNS)
    .single()
  if (updErr || !updated) throw new Error(`Status-Update: ${updErr?.message ?? 'unbekannt'}`)
  return updated as unknown as ImageRow
}

/** Reserviertes Bild erzeugen; Fehler landen am Bild statt zu werfen. */
export async function processClaimedImage(supabase: SupabaseClient, image: ImageRow, source: SourceRow): Promise<boolean> {
  try {
    await composeImage(supabase, image, source)
    return true
  } catch (err) {
    await markImageFailed(supabase, image.id, err instanceof Error ? err.message : String(err))
    return false
  }
}

export async function loadSources(supabase: SupabaseClient, ids: string[]): Promise<Map<string, SourceRow>> {
  const unique = Array.from(new Set(ids.filter(Boolean)))
  if (unique.length === 0) return new Map()
  const { data } = await supabase.from('presets').select(SOURCE_COLUMNS).in('id', unique)
  return new Map(((data ?? []) as unknown as SourceRow[]).map((s) => [s.id, s]))
}

/**
 * Schnellweg: offene Bilder mit lokalem Mockup und fertigem Poster sofort
 * erzeugen, solange das Zeitbudget reicht. Gibt die Anzahl fertiger Bilder zurück.
 */
export async function runFastPath(
  supabase: SupabaseClient,
  images: ImageRow[],
  opts: { budgetMs: number; now?: () => number },
): Promise<number> {
  const now = opts.now ?? Date.now
  const deadline = now() + opts.budgetMs
  const open = images.filter((i) => i.status === 'pending')
  if (open.length === 0) return 0

  const { data: mockupData } = await supabase
    .from('mockup_sets')
    .select('id, provider')
    .in('id', Array.from(new Set(open.map((i) => i.mockup_set_id))))
  const localIds = new Set(((mockupData ?? []) as { id: string; provider: string }[]).filter((m) => m.provider === 'local').map((m) => m.id))
  const sources = await loadSources(supabase, open.map((i) => i.source_preset_id ?? ''))

  let done = 0
  for (const img of open) {
    if (now() >= deadline) break
    if (!localIds.has(img.mockup_set_id)) continue
    const source = img.source_preset_id ? sources.get(img.source_preset_id) : undefined
    if (sourcePosterState(source) !== 'ready' || !source) continue
    const claimed = await claimImage(supabase, img.id)
    if (!claimed) continue
    if (await processClaimedImage(supabase, claimed, source)) done++
  }
  return done
}

/**
 * Worker-Schritt: das nächste bearbeitbare offene Bild erzeugen.
 * Bilder, deren Poster noch rendert, werden übersprungen; fehlgeschlagene oder
 * fehlende Poster führen zu „fehlgeschlagen", veraltete Poster werden neu angestoßen.
 * Gibt true zurück, wenn etwas bearbeitet wurde.
 */
export async function processNextOpenImage(supabase: SupabaseClient, log: (msg: string) => void = () => {}): Promise<boolean> {
  const { data, error } = await supabase
    .from('image_generator_images')
    .select(IMAGE_COLUMNS)
    .eq('status', 'pending')
    .order('created_at')
    .limit(50)
  if (error) throw new Error(`image_generator_images: ${error.message}`)
  const images = (data ?? []) as unknown as ImageRow[]
  if (images.length === 0) return false

  const sources = await loadSources(supabase, images.map((i) => i.source_preset_id ?? ''))
  let changed = false
  for (const img of images) {
    const source = img.source_preset_id ? sources.get(img.source_preset_id) : undefined
    const state = sourcePosterState(source)
    if (state === 'missing') {
      await markImageFailed(supabase, img.id, 'Poster-Quelle nicht mehr vorhanden')
      changed = true
    } else if (state === 'failed') {
      await markImageFailed(supabase, img.id, `Poster-Render fehlgeschlagen: ${source?.render_error_a4 ?? 'unbekannter Fehler'}`)
      changed = true
    } else if (state === 'stale' && source) {
      await requeueSourcePoster(supabase, source.id)
    } else if (state === 'ready' && source) {
      const claimed = await claimImage(supabase, img.id)
      if (!claimed) continue
      log(`Image Generator: Bild ${img.id} (Preset ${img.preset_id}, Position ${img.position})`)
      await processClaimedImage(supabase, claimed, source)
      return true
    }
  }
  return changed
}

/** Hängende Reservierungen (Worker-Absturz, Timeout im Schnellweg) wieder freigeben. */
export async function reclaimStaleImages(supabase: SupabaseClient, thresholdMin: number): Promise<number> {
  const cutoff = new Date(Date.now() - thresholdMin * 60_000).toISOString()
  const { data } = await supabase
    .from('image_generator_images')
    .update({ status: 'pending', claimed_at: null, updated_at: new Date().toISOString() })
    .eq('status', 'rendering')
    .lt('claimed_at', cutoff)
    .select('id')
  return data?.length ?? 0
}
