/**
 * PROJ-39: Per-format preview-image resolution for presets.
 *
 * Every preset is rendered into three formats (A4, A3, A2 portrait) by the
 * render-worker. UI components don't read the columns directly — they go
 * through `getPreviewUrl(preset, format)` which:
 *   1. returns the requested format's URL when its render status is `done`,
 *   2. falls back to A3 → A4 → A2 if the requested one isn't ready yet,
 *   3. falls back to the legacy single-format `preview_image_url` for
 *      presets that pre-date PROJ-39 (during the migration window),
 *   4. returns null when nothing is renderable yet (caller hides the card).
 *
 * Also exposes `getAvailableFormats(preset)` so the format-switcher can
 * filter its pills to only the formats that actually have a `done` render.
 */
import type { PrintFormat } from './print-formats'

/** Preset row shape relevant to preview resolution. Loose typing — accepts any
 *  preset row from Supabase (admin or public list/detail) regardless of which
 *  joined fields it carries. */
export interface PresetWithPreviews {
  preview_image_url?: string | null
  preview_image_url_a4?: string | null
  preview_image_url_a3?: string | null
  preview_image_url_a2?: string | null
  render_status_a4?: string | null
  render_status_a3?: string | null
  render_status_a2?: string | null
}

const PORTRAIT_FORMATS: PrintFormat[] = ['a4', 'a3', 'a2']
/** Default preview format on inspiration cards — A3 sits in the middle (more
 *  geography than A4, less dominant than A2) per PROJ-39 product call. */
export const DEFAULT_PREVIEW_FORMAT: PrintFormat = 'a3'
/** Search order when the requested format isn't available — A3 first (it's the
 *  customer default), then A4 (most-rendered fallback), then A2. */
const FALLBACK_ORDER: PrintFormat[] = ['a3', 'a4', 'a2']

function urlForFormat(preset: PresetWithPreviews, format: PrintFormat): string | null {
  switch (format) {
    case 'a4': return preset.preview_image_url_a4 ?? null
    case 'a3': return preset.preview_image_url_a3 ?? null
    case 'a2': return preset.preview_image_url_a2 ?? null
  }
}

function statusForFormat(preset: PresetWithPreviews, format: PrintFormat): string | null {
  switch (format) {
    case 'a4': return preset.render_status_a4 ?? null
    case 'a3': return preset.render_status_a3 ?? null
    case 'a2': return preset.render_status_a2 ?? null
  }
}

/**
 * Returns the URL of the preview image for a preset in the requested format.
 * Falls back gracefully through A3 → A4 → A2 → legacy `preview_image_url`,
 * returning null if nothing is renderable.
 */
export function getPreviewUrl(
  preset: PresetWithPreviews,
  format: PrintFormat = DEFAULT_PREVIEW_FORMAT,
): string | null {
  // 1. Requested format if its render is done.
  if (statusForFormat(preset, format) === 'done') {
    const url = urlForFormat(preset, format)
    if (url) return url
  }
  // 2. Fallback chain through other formats with done status.
  for (const candidate of FALLBACK_ORDER) {
    if (candidate === format) continue
    if (statusForFormat(preset, candidate) === 'done') {
      const url = urlForFormat(preset, candidate)
      if (url) return url
    }
  }
  // 3. Legacy single-format column (presets that pre-date PROJ-39).
  if (preset.preview_image_url) return preset.preview_image_url
  return null
}

/**
 * Returns the formats that currently have a `done` render — used by the
 * format-switcher to only show pills for actually-renderable formats.
 */
export function getAvailableFormats(preset: PresetWithPreviews): PrintFormat[] {
  const done = PORTRAIT_FORMATS.filter((f) => statusForFormat(preset, f) === 'done')
  // Compat: a preset with only the legacy `preview_image_url` (pre-PROJ-39)
  // surfaces as "A4 available" so the switcher doesn't disappear during the
  // migration window. Once backfill runs and all three statuses flip to
  // 'done', this fallback is harmless because A4 is already in the list.
  if (done.length === 0 && preset.preview_image_url) return ['a4']
  return done
}

/**
 * Resolves the largest available format (A2 > A3 > A4), used by hero / focal
 * cards that want the most impressive image regardless of the customer's
 * default.
 */
export function getLargestAvailableFormat(preset: PresetWithPreviews): PrintFormat | null {
  const order: PrintFormat[] = ['a2', 'a3', 'a4']
  for (const f of order) {
    if (statusForFormat(preset, f) === 'done') return f
  }
  if (preset.preview_image_url) return 'a4'
  return null
}
