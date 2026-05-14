/**
 * PROJ-47: Admin-Font-Verwaltung — shared server helpers.
 *
 * Common helpers that the API routes use to translate DB rows into the
 * Font / FontStyle shape consumed by the client (with resolved public URLs
 * from Supabase Storage).
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Font, FontStyle } from './fonts'

const BUCKET = 'fonts'

interface FontRow {
  id: string
  family_name: string
  category: 'serif' | 'script' | 'sans' | 'display'
  description: string | null
  display_order: number
  status: 'draft' | 'published'
}

interface FontStyleRow {
  id: string
  font_id: string
  weight: number
  style: 'normal' | 'italic'
  storage_path: string
  file_size_bytes: number | null
}

export function styleRowToStyle(admin: SupabaseClient, row: FontStyleRow): FontStyle {
  const { data } = admin.storage.from(BUCKET).getPublicUrl(row.storage_path)
  return {
    id: row.id,
    weight: row.weight as FontStyle['weight'],
    style: row.style,
    url: data.publicUrl,
    file_size_bytes: row.file_size_bytes,
  }
}

export function fontRowToFont(
  admin: SupabaseClient,
  fontRow: FontRow,
  styleRows: FontStyleRow[],
): Font {
  return {
    id: fontRow.id,
    family_name: fontRow.family_name,
    category: fontRow.category,
    description: fontRow.description,
    display_order: fontRow.display_order,
    status: fontRow.status,
    styles: styleRows
      .filter((s) => s.font_id === fontRow.id)
      .sort((a, b) => a.weight - b.weight || a.style.localeCompare(b.style))
      .map((s) => styleRowToStyle(admin, s)),
  }
}

/**
 * Fetch all fonts (optionally filtered by status) joined with their styles.
 * Returns the Font[] shape with public Storage URLs already resolved.
 *
 * Single query for fonts + single query for styles — avoids N+1.
 */
export async function listFontsWithStyles(
  admin: SupabaseClient,
  filter?: { status?: 'draft' | 'published' },
): Promise<Font[]> {
  let q = admin
    .from('fonts')
    .select('id, family_name, category, description, display_order, status')
    .order('display_order', { ascending: true })
    .order('family_name', { ascending: true })

  if (filter?.status) q = q.eq('status', filter.status)

  const { data: fonts, error: fontsErr } = await q
  if (fontsErr) throw new Error(fontsErr.message)
  if (!fonts || fonts.length === 0) return []

  const ids = fonts.map((f) => f.id)
  const { data: styles, error: stylesErr } = await admin
    .from('font_styles')
    .select('id, font_id, weight, style, storage_path, file_size_bytes')
    .in('font_id', ids)

  if (stylesErr) throw new Error(stylesErr.message)

  return (fonts as FontRow[]).map((row) => fontRowToFont(admin, row, (styles as FontStyleRow[]) ?? []))
}

/**
 * Fetch a single font (any status) by id. Used by the admin detail endpoint
 * and the force-load path for older projects referencing unpublished fonts.
 * Returns null if not found.
 */
export async function getFontById(admin: SupabaseClient, id: string): Promise<Font | null> {
  const { data: font, error: fErr } = await admin
    .from('fonts')
    .select('id, family_name, category, description, display_order, status')
    .eq('id', id)
    .maybeSingle()
  if (fErr || !font) return null

  const { data: styles, error: sErr } = await admin
    .from('font_styles')
    .select('id, font_id, weight, style, storage_path, file_size_bytes')
    .eq('font_id', id)
  if (sErr) return null

  return fontRowToFont(admin, font as FontRow, (styles as FontStyleRow[]) ?? [])
}

/**
 * Check whether a font family is referenced by any preset or project.
 * Used to gate DELETE and unpublish operations — see Spec edge cases.
 *
 * The reference shape is `{ "fontFamily": "<family_name>" }` somewhere
 * inside the `config_json` JSONB (e.g. on textBlocks). We fetch the
 * affected rows and walk the JSON in-process — presets are a small set
 * (admin-managed, dozens) and we cap projects at 1000 rows which is
 * sufficient given the solo-operator scale.
 */
/**
 * Iterative JSON-tree walk that returns true if any descendant object has
 * a `fontFamily` string property equal to `familyName`. Exported so the
 * unit tests can exercise the walk logic without a Supabase mock.
 */
export function configReferencesFontFamily(cfg: unknown, familyName: string): boolean {
  if (cfg == null || typeof cfg !== 'object') return false
  const stack: unknown[] = [cfg]
  while (stack.length > 0) {
    const node = stack.pop()
    if (!node || typeof node !== 'object') continue
    if (Array.isArray(node)) {
      for (const item of node) stack.push(item)
      continue
    }
    const obj = node as Record<string, unknown>
    if (typeof obj.fontFamily === 'string' && obj.fontFamily === familyName) return true
    for (const v of Object.values(obj)) {
      if (v && typeof v === 'object') stack.push(v)
    }
  }
  return false
}

export async function findFontReferences(
  admin: SupabaseClient,
  familyName: string,
): Promise<{ presets: { id: string; name: string }[]; projects: { id: string; name: string }[] }> {
  const [{ data: presetRows }, { data: projectRows }] = await Promise.all([
    admin.from('presets').select('id, name, config_json').limit(500),
    admin.from('projects').select('id, name, config_json').limit(1000),
  ])

  const presets = (presetRows ?? [])
    .filter((r: { config_json: unknown }) => configReferencesFontFamily(r.config_json, familyName))
    .map((r: { id: string; name: string }) => ({ id: r.id, name: r.name }))
  const projects = (projectRows ?? [])
    .filter((r: { config_json: unknown }) => configReferencesFontFamily(r.config_json, familyName))
    .map((r: { id: string; name: string | null }) => ({ id: r.id, name: r.name ?? '(unbenannt)' }))

  return { presets, projects }
}

export const FONTS_BUCKET = BUCKET
