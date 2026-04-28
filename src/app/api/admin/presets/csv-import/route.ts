import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase-admin'
import { OCCASION_CODES } from '@/lib/occasions'
import { LocaleSchema } from '@/lib/preset-locales'

/**
 * CSV-Import: Bulk-Anlage von Presets durch Klonen eines Master-Presets.
 *
 * Erwartete CSV-Spalten:
 *   name, master_preset_slug, location_lat, location_lng, location_name,
 *   target_locales, occasions, mockup_set_slugs,
 *   text_main (optional), text_sub (optional)
 *
 * Workflow:
 *   1. POST mit { csv_text, dry_run: true }  → Validation-Report
 *   2. POST mit { csv_text, dry_run: false } → Anlage
 */

const PostSchema = z.object({
  csv_text: z.string().min(1),
  dry_run: z.boolean().default(true),
})

interface ParsedRow {
  rowNumber: number
  fields: Record<string, string>
  errors: string[]
}

interface ImportRow {
  rowNumber: number
  name: string
  master_preset_slug: string
  location_lat: number
  location_lng: number
  location_name: string
  target_locales: string[]
  occasions: string[]
  mockup_set_slugs: string[]
  text_main: string | null
  text_sub: string | null
}

const REQUIRED_COLUMNS = [
  'name',
  'master_preset_slug',
  'location_lat',
  'location_lng',
  'location_name',
  'target_locales',
  'occasions',
  'mockup_set_slugs',
] as const

// Minimaler CSV-Parser. Erkennt , oder ; als Separator (Excel exportiert
// in DE-Locale ;). Quoted-Strings mit eingebetteten Kommas werden
// unterstützt. Keine Multi-Line-Felder.
function parseCsv(text: string): { headers: string[]; rows: string[][] } {
  const lines = text.replace(/\r\n/g, '\n').split('\n').filter((l) => l.trim().length > 0)
  if (lines.length === 0) return { headers: [], rows: [] }

  const headerLine = lines[0]
  const sep = headerLine.includes(';') && !headerLine.includes(',') ? ';' : ','

  function splitLine(line: string): string[] {
    const out: string[] = []
    let current = ''
    let inQuotes = false
    for (let i = 0; i < line.length; i++) {
      const c = line[i]
      if (inQuotes) {
        if (c === '"' && line[i + 1] === '"') { current += '"'; i++ }
        else if (c === '"') inQuotes = false
        else current += c
      } else {
        if (c === '"') inQuotes = true
        else if (c === sep) { out.push(current); current = '' }
        else current += c
      }
    }
    out.push(current)
    return out.map((s) => s.trim())
  }

  const headers = splitLine(headerLine)
  const rows = lines.slice(1).map(splitLine)
  return { headers, rows }
}

function parseRows(headers: string[], rows: string[][]): ParsedRow[] {
  return rows.map((row, idx) => {
    const fields: Record<string, string> = {}
    headers.forEach((h, i) => { fields[h] = row[i] ?? '' })
    const errors: string[] = []
    for (const col of REQUIRED_COLUMNS) {
      if (!fields[col] || !fields[col].trim()) errors.push(`Pflichtspalte „${col}" fehlt`)
    }
    return { rowNumber: idx + 2, fields, errors } // +2 = +1 für Header, +1 weil 1-basiert
  })
}

async function validateAndEnrich(
  parsed: ParsedRow[],
  admin: ReturnType<typeof createAdminClient>,
): Promise<{ valid: ImportRow[]; invalid: ParsedRow[] }> {
  // Master-Presets nachladen (per Name als pseudo-slug — wir haben kein slug-Feld)
  const masterNames = [...new Set(parsed.flatMap((p) => (p.errors.length === 0 ? [p.fields.master_preset_slug] : [])))]
  const { data: masters } = masterNames.length
    ? await admin.from('presets').select('id, name, poster_type').in('name', masterNames)
    : { data: [] }
  const masterMap = Object.fromEntries((masters ?? []).map((m) => [m.name, m]))

  // Mockup-Sets nachladen
  const mockupSlugs = [...new Set(parsed.flatMap((p) => (p.fields.mockup_set_slugs ?? '').split(',').map((s) => s.trim()).filter(Boolean)))]
  const { data: mockupSets } = mockupSlugs.length
    ? await admin.from('mockup_sets').select('id, slug').in('slug', mockupSlugs)
    : { data: [] }
  const mockupMap = Object.fromEntries((mockupSets ?? []).map((m) => [m.slug, m.id]))

  const valid: ImportRow[] = []
  const invalid: ParsedRow[] = []

  for (const p of parsed) {
    if (p.errors.length > 0) { invalid.push(p); continue }

    const master = masterMap[p.fields.master_preset_slug]
    if (!master) {
      p.errors.push(`Master-Preset „${p.fields.master_preset_slug}" nicht gefunden`)
      invalid.push(p)
      continue
    }

    const lat = parseFloat(p.fields.location_lat)
    const lng = parseFloat(p.fields.location_lng)
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      p.errors.push('location_lat oder location_lng ist keine gültige Zahl')
      invalid.push(p)
      continue
    }

    const target_locales = p.fields.target_locales.split(',').map((s) => s.trim()).filter(Boolean)
    const localeErrors = target_locales.filter((l) => !LocaleSchema.safeParse(l).success)
    if (localeErrors.length > 0) {
      p.errors.push(`Ungültige Locales: ${localeErrors.join(', ')}`)
      invalid.push(p)
      continue
    }

    const occasions = p.fields.occasions.split(',').map((s) => s.trim()).filter(Boolean)
    const occasionErrors = occasions.filter((o) => !(OCCASION_CODES as readonly string[]).includes(o))
    if (occasionErrors.length > 0) {
      p.errors.push(`Ungültige Anlässe: ${occasionErrors.join(', ')}`)
      invalid.push(p)
      continue
    }

    const mockupSlugList = p.fields.mockup_set_slugs.split(',').map((s) => s.trim()).filter(Boolean)
    const missingMockups = mockupSlugList.filter((s) => !mockupMap[s])
    if (missingMockups.length > 0) {
      p.errors.push(`Mockup-Set-Slug nicht gefunden: ${missingMockups.join(', ')}`)
      invalid.push(p)
      continue
    }

    valid.push({
      rowNumber: p.rowNumber,
      name: p.fields.name.trim(),
      master_preset_slug: p.fields.master_preset_slug,
      location_lat: lat,
      location_lng: lng,
      location_name: p.fields.location_name.trim(),
      target_locales,
      occasions,
      mockup_set_slugs: mockupSlugList,
      text_main: p.fields.text_main?.trim() || null,
      text_sub: p.fields.text_sub?.trim() || null,
    })
  }

  return { valid, invalid }
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: 'Forbidden' }, { status: auth.status })

  const body = await req.json().catch(() => null)
  const parsed = PostSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid body' }, { status: 400 })

  const { headers, rows } = parseCsv(parsed.data.csv_text)
  if (headers.length === 0 || rows.length === 0) {
    return NextResponse.json({ error: 'CSV leer oder konnte nicht geparst werden' }, { status: 400 })
  }

  const missingHeaders = REQUIRED_COLUMNS.filter((c) => !headers.includes(c))
  if (missingHeaders.length > 0) {
    return NextResponse.json(
      { error: `Fehlende Spalten im CSV-Header: ${missingHeaders.join(', ')}` },
      { status: 400 },
    )
  }

  const admin = createAdminClient()
  const parsedRows = parseRows(headers, rows)
  const { valid, invalid } = await validateAndEnrich(parsedRows, admin)

  if (parsed.data.dry_run) {
    return NextResponse.json({
      total: parsedRows.length,
      valid_count: valid.length,
      invalid_count: invalid.length,
      valid: valid.map((v) => ({ rowNumber: v.rowNumber, name: v.name, master: v.master_preset_slug, location: v.location_name })),
      invalid: invalid.map((i) => ({ rowNumber: i.rowNumber, name: i.fields.name, errors: i.errors })),
    })
  }

  // Anlegen: Master-Configs nochmal voll holen
  const masterIds = [...new Set(valid.map((v) => v.master_preset_slug))]
  const { data: masters } = await admin.from('presets').select('id, name, poster_type, config_json').in('name', masterIds)
  const masterFull = Object.fromEntries((masters ?? []).map((m) => [m.name, m]))

  const { data: mockupSets } = await admin.from('mockup_sets').select('id, slug').in('slug', valid.flatMap((v) => v.mockup_set_slugs))
  const mockupMap = Object.fromEntries((mockupSets ?? []).map((m) => [m.slug, m.id]))

  const inserts = valid.map((v) => {
    const master = masterFull[v.master_preset_slug]
    const config = JSON.parse(JSON.stringify(master.config_json ?? {}))

    // Override marker location
    config.marker = { ...(config.marker ?? {}), lat: v.location_lat, lng: v.location_lng }

    // Override text blocks if specified
    if (Array.isArray(config.textBlocks)) {
      if (v.text_main) {
        const main = config.textBlocks.find((b: { id?: string }) => b.id === 'block-title')
        if (main) main.text = v.text_main
      }
      if (v.text_sub) {
        const sub = config.textBlocks.find((b: { id?: string }) => b.id === 'block-coords' || b.id === 'block-subtitle')
        if (sub) sub.text = v.text_sub
      }
    }

    return {
      name: v.name,
      poster_type: master.poster_type,
      config_json: config,
      target_locales: v.target_locales,
      occasions: v.occasions,
      mockup_set_ids: v.mockup_set_slugs.map((s) => mockupMap[s]).filter(Boolean),
      status: 'draft' as const,
      render_status: 'pending' as const,
    }
  })

  const { data: created, error } = await admin.from('presets').insert(inserts).select('id, name')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    created_count: created?.length ?? 0,
    invalid_count: invalid.length,
    invalid: invalid.map((i) => ({ rowNumber: i.rowNumber, name: i.fields.name, errors: i.errors })),
  })
}
