// PROJ-56: Ablaufsteuerung des Image Generators für die Admin-Endpunkte.
// Die eigentliche Bilderzeugung liegt in ./process (auch vom Worker genutzt).

import crypto from 'node:crypto'
import JSZip from 'jszip'
import type { SupabaseClient } from '@supabase/supabase-js'
import { triggerRenderWorker } from '../render-worker-trigger'
import { configHash } from './config-hash'
import { buildImageFileName, slugify } from './helpers'
import { bakePaletteIntoConfig } from './palette-bake'
import {
  IMAGE_COLUMNS, RENDERS_BUCKET, SOURCE_COLUMNS,
  loadSources, orientationOf, requeueSourcePoster, runFastPath, sourcePosterState,
  type ImageRow, type SourceRow,
} from './process'
import type {
  GenerateRequest, GenerateResponse, GeneratorImage, GeneratorState, SelectionEntry,
} from './types'

/** Zeitbudget des Schnellwegs — Vercel-Limit 60 s abzüglich Puffer für Anlegen, Worker-Trigger, Antwort. */
export const FAST_PATH_BUDGET_MS = 40_000

export class GeneratorError extends Error {
  constructor(message: string, readonly status: number) {
    super(message)
  }
}

const PRESET_COLUMNS =
  'id, name, description, poster_type, config_json, display_order, preview_image_url, preview_image_url_a4, updated_at, color_variant_of, render_status_a4, render_error_a4, render_inputs_hash_a4'

interface PresetRow extends SourceRow {
  name: string
  description: string | null
  poster_type: 'map' | 'star-map' | 'photo'
  display_order: number
  preview_image_url: string | null
  updated_at: string
  color_variant_of: string | null
}

async function loadBasePreset(supabase: SupabaseClient, presetId: string): Promise<PresetRow> {
  const { data, error } = await supabase.from('presets').select(PRESET_COLUMNS).eq('id', presetId).maybeSingle()
  if (error) throw new GeneratorError(error.message, 500)
  if (!data) throw new GeneratorError('Preset nicht gefunden', 404)
  const preset = data as unknown as PresetRow
  if (preset.color_variant_of) throw new GeneratorError('Farbvarianten können nicht direkt verwendet werden', 400)
  return preset
}

function comboKey(paletteId: string | null, e: SelectionEntry): string {
  return `${paletteId ?? ''}::${e.mockup_set_id}::${e.overlay_id ?? ''}`
}

export function toApiImage(row: ImageRow, source: SourceRow | undefined, baseHash: string): GeneratorImage {
  let waiting_for: GeneratorImage['waiting_for'] = null
  if (row.status === 'pending') {
    const state = sourcePosterState(source)
    waiting_for = state === 'waiting' || state === 'stale' ? 'poster_render' : 'worker'
  }
  return {
    id: row.id,
    preset_id: row.preset_id,
    palette_id: row.palette_id,
    mockup_set_id: row.mockup_set_id,
    overlay_id: row.overlay_id,
    position: row.position,
    status: row.status,
    error: row.error,
    image_url: row.image_url,
    width: row.width,
    height: row.height,
    rendered_at: row.rendered_at,
    waiting_for,
    stale: row.status === 'done' && Boolean(row.base_config_hash) && row.base_config_hash !== baseHash,
  }
}

async function toApiImages(supabase: SupabaseClient, rows: ImageRow[], baseHash: string): Promise<GeneratorImage[]> {
  const sources = await loadSources(supabase, rows.map((r) => r.source_preset_id ?? ''))
  return rows.map((r) => toApiImage(r, r.source_preset_id ? sources.get(r.source_preset_id) : undefined, baseHash))
}

export async function getGeneratorState(supabase: SupabaseClient, presetId: string): Promise<GeneratorState> {
  const preset = await loadBasePreset(supabase, presetId)
  const { data, error } = await supabase
    .from('image_generator_images')
    .select(IMAGE_COLUMNS)
    .eq('preset_id', presetId)
    .order('position')
    .limit(500)
  if (error) throw new GeneratorError(error.message, 500)
  const images = await toApiImages(supabase, (data ?? []) as unknown as ImageRow[], configHash(preset.config_json))
  return {
    preset: {
      id: preset.id,
      name: preset.name,
      poster_type: preset.poster_type,
      orientation: orientationOf(preset.config_json),
      preview_image_url: preset.preview_image_url_a4 ?? preset.preview_image_url,
      updated_at: preset.updated_at,
    },
    images,
  }
}

// ─── Poster-Quellen ─────────────────────────────────────────────────────────

/** Basis-Preset: A4 neu anstoßen, wenn es fehlt, fehlgeschlagen oder veraltet ist. */
async function ensureBaseSource(supabase: SupabaseClient, preset: PresetRow): Promise<void> {
  const state = sourcePosterState(preset)
  const status = preset.render_status_a4
  if (state === 'failed' || state === 'stale' || (state === 'waiting' && status !== 'pending' && status !== 'rendering')) {
    await requeueSourcePoster(supabase, preset.id)
  }
}

interface PaletteRow { id: string; name: string; status: string; colors: Record<string, string> | null }

/**
 * Verborgene Farbvariante anlegen oder aktualisieren. Nur A4 wird gebraucht —
 * A3/A2 stehen bewusst auf 'done', sonst holt der Worker die Variante endlos ab
 * (er wählt Presets mit irgendeinem offenen Format).
 */
async function ensureColorVariant(supabase: SupabaseClient, preset: PresetRow, palette: PaletteRow): Promise<string> {
  const config = bakePaletteIntoConfig(preset.config_json, palette.id, palette.colors)
  const { data: existing, error } = await supabase
    .from('presets')
    .select(SOURCE_COLUMNS)
    .eq('color_variant_of', preset.id)
    .eq('color_variant_palette_id', palette.id)
    .maybeSingle()
  if (error) throw new GeneratorError(error.message, 500)

  const renderFields = {
    render_status: 'pending',
    render_status_a4: 'pending',
    render_error_a4: null,
    render_status_a3: 'done',
    render_status_a2: 'done',
  }

  if (!existing) {
    const { data: created, error: insErr } = await supabase
      .from('presets')
      .insert({
        name: `${preset.name} · ${palette.name}`.slice(0, 200),
        description: preset.description,
        poster_type: preset.poster_type,
        config_json: config,
        display_order: preset.display_order,
        status: 'draft',
        show_in_editor: false,
        mockup_set_ids: [],
        color_variant_of: preset.id,
        color_variant_palette_id: palette.id,
        ...renderFields,
      })
      .select('id')
      .single()
    if (insErr || !created) throw new GeneratorError(`Farbvariante „${palette.name}": ${insErr?.message}`, 500)
    return created.id as string
  }

  const source = existing as unknown as SourceRow
  if (configHash(source.config_json) !== configHash(config)) {
    const { error: updErr } = await supabase
      .from('presets')
      .update({ config_json: config, name: `${preset.name} · ${palette.name}`.slice(0, 200), ...renderFields })
      .eq('id', source.id)
    if (updErr) throw new GeneratorError(`Farbvariante „${palette.name}": ${updErr.message}`, 500)
  } else {
    const state = sourcePosterState(source)
    if (state === 'failed' || state === 'stale') await requeueSourcePoster(supabase, source.id)
  }
  return source.id
}

// ─── Erstellen ──────────────────────────────────────────────────────────────

interface Combo { palette_id: string | null; entry: SelectionEntry; position: number }

async function validateEntries(supabase: SupabaseClient, preset: PresetRow, entries: SelectionEntry[]): Promise<void> {
  const orientation = orientationOf(preset.config_json)
  const mockupIds = Array.from(new Set(entries.map((e) => e.mockup_set_id)))
  const overlayIds = Array.from(new Set(entries.flatMap((e) => (e.overlay_id ? [e.overlay_id] : []))))

  const { data: mockups } = await supabase
    .from('mockup_sets')
    .select('id, name, provider, is_active, local_portrait_overlay_url, local_landscape_overlay_url')
    .in('id', mockupIds)
  const byId = new Map((mockups ?? []).map((m) => [m.id as string, m]))
  for (const id of mockupIds) {
    const m = byId.get(id)
    if (!m || !m.is_active) throw new GeneratorError('Ein gewähltes Mockup ist nicht mehr verfügbar', 400)
    const hasOrientation = orientation === 'landscape' ? m.local_landscape_overlay_url : m.local_portrait_overlay_url
    if (m.provider === 'local' && !hasOrientation) {
      throw new GeneratorError(`Mockup „${m.name}" passt nicht zur Ausrichtung des Presets`, 400)
    }
  }

  if (overlayIds.length > 0) {
    const { data: overlays } = await supabase.from('image_overlays').select('id, name, orientation').in('id', overlayIds)
    const oById = new Map((overlays ?? []).map((o) => [o.id as string, o]))
    for (const id of overlayIds) {
      const o = oById.get(id)
      if (!o) throw new GeneratorError('Ein gewähltes Overlay ist nicht mehr verfügbar', 400)
      if (o.orientation !== orientation) throw new GeneratorError(`Overlay „${o.name}" passt nicht zur Ausrichtung des Presets`, 400)
    }
  }
}

async function loadPalettes(supabase: SupabaseClient, preset: PresetRow, paletteIds: string[]): Promise<PaletteRow[]> {
  if (paletteIds.length === 0) return []
  if (preset.poster_type !== 'map') throw new GeneratorError('Zusatzfarben gibt es nur für Karten-Presets', 400)
  const { data, error } = await supabase.from('map_palettes').select('id, name, status, colors').in('id', paletteIds)
  if (error) throw new GeneratorError(error.message, 500)
  const byId = new Map(((data ?? []) as PaletteRow[]).map((p) => [p.id, p]))
  return paletteIds.map((id) => {
    const p = byId.get(id)
    if (!p || p.status !== 'published') throw new GeneratorError(`Farbe „${id}" ist nicht verfügbar`, 400)
    return p
  })
}

async function scheduleCombos(
  supabase: SupabaseClient,
  preset: PresetRow,
  combos: Combo[],
  palettes: PaletteRow[],
  opts: { budgetMs: number },
): Promise<GenerateResponse> {
  const baseHash = configHash(preset.config_json)

  // 1. Poster-Quellen sicherstellen
  const sourceByPalette = new Map<string | null, string>()
  if (combos.some((c) => c.palette_id === null)) {
    await ensureBaseSource(supabase, preset)
    sourceByPalette.set(null, preset.id)
  }
  for (const palette of palettes) {
    sourceByPalette.set(palette.id, await ensureColorVariant(supabase, preset, palette))
  }

  // 2. Galerie-Einträge anlegen bzw. ersetzen (gleiche Kombination = gleiches Bild)
  const { data: existingData, error: exErr } = await supabase
    .from('image_generator_images')
    .select(IMAGE_COLUMNS)
    .eq('preset_id', preset.id)
    .limit(1000)
  if (exErr) throw new GeneratorError(exErr.message, 500)
  const existing = new Map(
    ((existingData ?? []) as unknown as ImageRow[]).map((r) => [
      comboKey(r.palette_id, { mockup_set_id: r.mockup_set_id, overlay_id: r.overlay_id }),
      r,
    ]),
  )

  const now = new Date().toISOString()
  const rows = combos
    .map((c) => ({ c, prev: existing.get(comboKey(c.palette_id, c.entry)) }))
    // Ein gerade laufendes Bild nicht zurücksetzen — es wird ohnehin gleich fertig.
    .filter(({ prev }) => prev?.status !== 'rendering')
    .map(({ c, prev }) => ({
      id: prev?.id ?? crypto.randomUUID(),
      preset_id: preset.id,
      palette_id: c.palette_id,
      mockup_set_id: c.entry.mockup_set_id,
      overlay_id: c.entry.overlay_id,
      position: c.position,
      source_preset_id: sourceByPalette.get(c.palette_id) ?? null,
      status: 'pending',
      error: null,
      base_config_hash: baseHash,
      claimed_at: null,
      updated_at: now,
    }))

  if (rows.length > 0) {
    const { error: upErr } = await supabase.from('image_generator_images').upsert(rows, { onConflict: 'id' })
    if (upErr) throw new GeneratorError(upErr.message, 500)
  }

  const ids = rows.map((r) => r.id)
  const fetchRows = async () => {
    if (ids.length === 0) return [] as ImageRow[]
    const { data } = await supabase.from('image_generator_images').select(IMAGE_COLUMNS).in('id', ids)
    return (data ?? []) as unknown as ImageRow[]
  }

  // 3. Schnellweg
  const completed_now = await runFastPath(supabase, await fetchRows(), { budgetMs: opts.budgetMs })

  // 4. Rest an den Worker
  const after = await fetchRows()
  let worker_triggered = false
  let worker_error: string | null = null
  if (after.some((r) => r.status === 'pending')) {
    const result = await triggerRenderWorker({ skipIfActive: true })
    if (result.ok) worker_triggered = result.triggered
    else worker_error = result.error
  }

  return {
    images: await toApiImages(supabase, after.sort((a, b) => a.position - b.position), baseHash),
    completed_now,
    worker_triggered,
    worker_error,
  }
}

export async function generateImages(
  supabase: SupabaseClient,
  presetId: string,
  input: GenerateRequest,
  opts: { budgetMs?: number } = {},
): Promise<GenerateResponse> {
  const preset = await loadBasePreset(supabase, presetId)

  // Doppelte Kombinationen still zusammenfassen
  const seen = new Set<string>()
  const entries = input.entries.filter((e) => {
    const k = comboKey(null, e)
    if (seen.has(k)) return false
    seen.add(k)
    return true
  })
  if (entries.length === 0) throw new GeneratorError('Mindestens ein Mockup wählen', 400)

  await validateEntries(supabase, preset, entries)
  const palettes = await loadPalettes(supabase, preset, Array.from(new Set(input.palette_ids)))

  const combos: Combo[] = [null, ...palettes.map((p) => p.id)].flatMap((palette_id) =>
    entries.map((entry, idx) => ({ palette_id, entry, position: idx + 1 })),
  )
  return scheduleCombos(supabase, preset, combos, palettes, { budgetMs: opts.budgetMs ?? FAST_PATH_BUDGET_MS })
}

async function loadImage(supabase: SupabaseClient, imageId: string): Promise<ImageRow> {
  const { data, error } = await supabase.from('image_generator_images').select(IMAGE_COLUMNS).eq('id', imageId).maybeSingle()
  if (error) throw new GeneratorError(error.message, 500)
  if (!data) throw new GeneratorError('Bild nicht gefunden', 404)
  return data as unknown as ImageRow
}

/** Fehlgeschlagenes oder veraltetes Bild neu erzeugen (Position bleibt). */
export async function retryImage(
  supabase: SupabaseClient,
  imageId: string,
  opts: { budgetMs?: number } = {},
): Promise<GeneratorImage> {
  const image = await loadImage(supabase, imageId)
  if (image.status === 'rendering') throw new GeneratorError('Bild wird gerade erstellt', 409)
  const preset = await loadBasePreset(supabase, image.preset_id)
  const palettes = image.palette_id ? await loadPalettes(supabase, preset, [image.palette_id]) : []
  const result = await scheduleCombos(
    supabase,
    preset,
    [{ palette_id: image.palette_id, entry: { mockup_set_id: image.mockup_set_id, overlay_id: image.overlay_id }, position: image.position }],
    palettes,
    { budgetMs: opts.budgetMs ?? FAST_PATH_BUDGET_MS },
  )
  return result.images[0]
}

export async function deleteImage(supabase: SupabaseClient, imageId: string): Promise<void> {
  const image = await loadImage(supabase, imageId)
  if (image.status === 'rendering') throw new GeneratorError('Bild wird gerade erstellt – bitte kurz warten', 409)
  const { error } = await supabase.from('image_generator_images').delete().eq('id', imageId)
  if (error) throw new GeneratorError(error.message, 500)
  if (image.storage_path) {
    await supabase.storage.from(RENDERS_BUCKET).remove([image.storage_path]).catch(() => {})
  }
}

// ─── ZIP ────────────────────────────────────────────────────────────────────

export async function buildGalleryZip(supabase: SupabaseClient, presetId: string): Promise<{ buffer: Buffer; filename: string }> {
  const preset = await loadBasePreset(supabase, presetId)
  const { data, error } = await supabase
    .from('image_generator_images')
    .select(IMAGE_COLUMNS)
    .eq('preset_id', presetId)
    .eq('status', 'done')
    .order('position')
    .limit(500)
  if (error) throw new GeneratorError(error.message, 500)
  const images = (data ?? []) as unknown as ImageRow[]
  if (images.length === 0) throw new GeneratorError('Noch keine fertigen Bilder', 404)

  const [mockups, overlays, palettes] = await Promise.all([
    supabase.from('mockup_sets').select('id, name').in('id', Array.from(new Set(images.map((i) => i.mockup_set_id)))),
    supabase.from('image_overlays').select('id, name').in('id', Array.from(new Set(images.flatMap((i) => (i.overlay_id ? [i.overlay_id] : []))))),
    supabase.from('map_palettes').select('id, name').in('id', Array.from(new Set(images.flatMap((i) => (i.palette_id ? [i.palette_id] : []))))),
  ])
  const nameOf = (rows: { id: string; name: string }[] | null, id: string | null) =>
    id ? rows?.find((r) => r.id === id)?.name ?? id : null

  // Grundfarbe zuerst, dann Farben alphabetisch, innerhalb nach Position
  images.sort((a, b) =>
    (a.palette_id ?? '').localeCompare(b.palette_id ?? '') || a.position - b.position,
  )

  const zip = new JSZip()
  const used = new Set<string>()
  for (const img of images) {
    if (!img.image_url) continue
    const res = await fetch(img.image_url)
    if (!res.ok) continue
    const base = buildImageFileName({
      position: img.position,
      mockupName: nameOf(mockups.data as { id: string; name: string }[] | null, img.mockup_set_id) ?? 'mockup',
      overlayName: nameOf(overlays.data as { id: string; name: string }[] | null, img.overlay_id),
      paletteName: nameOf(palettes.data as { id: string; name: string }[] | null, img.palette_id),
    })
    let name = base
    for (let n = 2; used.has(name); n++) name = `${base}-${n}`
    used.add(name)
    zip.file(`${name}.jpg`, Buffer.from(await res.arrayBuffer()))
  }

  const buffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'STORE' })
  return { buffer, filename: `bilder-${slugify(preset.name) || preset.id}.zip` }
}
