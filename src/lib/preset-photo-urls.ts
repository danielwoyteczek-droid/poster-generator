import type { SupabaseClient } from '@supabase/supabase-js'

const BUCKET = 'user-photos'
const TTL_SECONDS = 60 * 60 * 24 * 7

/**
 * Photos in presets (splitPhoto, photo-editor slots, …) are stored with the
 * 7-day signed URL from upload time. Once it expires the photo silently
 * disappears from the editor, the export and the headless preset render.
 *
 * Re-sign every photo entry (`{ storagePath, publicUrl }` with a user-photos
 * URL) found anywhere in the preset config. Only paths that are already part
 * of the preset get signed, so callers never expose arbitrary user photos.
 * On signing failure the original URL is kept.
 */
export async function refreshPresetPhotoUrls<T>(supabase: SupabaseClient, config: T): Promise<T> {
  const entries: { storagePath: string; publicUrl: string }[] = []
  collect(config, entries)
  if (entries.length === 0) return config

  const paths = Array.from(new Set(entries.map((e) => e.storagePath)))
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrls(paths, TTL_SECONDS)
  if (error || !data) return config

  const fresh = new Map<string, string>()
  for (const row of data) {
    if (row.path && row.signedUrl && !row.error) fresh.set(row.path, row.signedUrl)
  }
  return replace(config, fresh) as T
}

/** Same as refreshPresetPhotoUrls for a list of preset rows. */
export async function refreshPresetsPhotoUrls<R extends { config_json?: unknown }>(
  supabase: SupabaseClient,
  rows: R[],
): Promise<R[]> {
  return Promise.all(
    rows.map(async (row) =>
      row.config_json ? { ...row, config_json: await refreshPresetPhotoUrls(supabase, row.config_json) } : row,
    ),
  )
}

function isPhotoEntry(v: Record<string, unknown>): v is { storagePath: string; publicUrl: string } {
  return (
    typeof v.storagePath === 'string' &&
    v.storagePath.length > 0 &&
    typeof v.publicUrl === 'string' &&
    v.publicUrl.includes(`/${BUCKET}/`)
  )
}

function collect(value: unknown, out: { storagePath: string; publicUrl: string }[]): void {
  if (Array.isArray(value)) {
    for (const item of value) collect(item, out)
  } else if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>
    if (isPhotoEntry(obj)) out.push(obj)
    for (const child of Object.values(obj)) collect(child, out)
  }
}

function replace(value: unknown, fresh: Map<string, string>): unknown {
  if (Array.isArray(value)) return value.map((item) => replace(item, fresh))
  if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>
    const next: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(obj)) next[k] = replace(v, fresh)
    if (isPhotoEntry(obj)) {
      const url = fresh.get(obj.storagePath)
      if (url) next.publicUrl = url
    }
    return next
  }
  return value
}
