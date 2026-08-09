#!/usr/bin/env tsx
/**
 * PROJ-49 Helper: Lädt alle Preset-Preview-PNGs aus Supabase Storage in
 * einen lokalen Ordner herunter — für Bulk-Upload in Dynamic Mockups
 * (Etsy-Integration läuft dort über die Web-UI, nicht via API, also
 * brauchen wir die PNGs lokal zum Auswählen).
 *
 * Usage:
 *   npm run export:preset-pngs                       — alle Typen in A3 (Default für Dynamic Mockups)
 *   npm run export:preset-pngs -- --format=all       — A4 + A3 + A2
 *   npm run export:preset-pngs -- --format=a4        — nur A4
 *   npm run export:preset-pngs -- --type=map         — nur Karten-Poster
 *   npm run export:preset-pngs -- --type=star-map --format=a2
 *   npm run export:preset-pngs -- --out=./my-folder  — eigener Ziel-Ordner
 *   npm run export:preset-pngs -- --include-drafts   — auch Drafts
 *
 * Default-Ordner: ./out/preset-pngs/{poster_type}/{preset_name}_{format}.png
 *
 * Skip-Regeln (werden im Output gemeldet, nicht abgebrochen):
 *   - Preset hat keine preview_image_url_X für gewähltes Format
 *   - render_status_X != 'completed' (Render ist nicht fertig oder fehlgeschlagen)
 *
 * Re-Run: überschreibt vorhandene Dateien.
 */

import { createClient } from '@supabase/supabase-js'
import { config as loadEnv } from 'dotenv'
import { mkdirSync, writeFileSync, existsSync } from 'node:fs'
import path from 'node:path'

loadEnv({ path: path.resolve(process.cwd(), '.env.local') })

const FORMATS = ['a4', 'a3', 'a2'] as const
type Format = (typeof FORMATS)[number]

interface Args {
  format: Format | 'all'
  type: string | null
  out: string
  includeDrafts: boolean
}

function parseArgs(): Args {
  const argv = process.argv.slice(2)
  const get = (k: string) =>
    argv.find((a) => a.startsWith('--' + k + '='))?.split('=')[1]
  const flag = (k: string) => argv.includes('--' + k)
  // Default = a3: Dynamic Mockups braucht nur EIN Format pro Design,
  // A3 ist der Sweet-Spot aus Auflösung (höher als A4) und Dateigröße (kleiner als A2).
  const formatRaw = get('format') ?? 'a3'
  const format =
    formatRaw === 'all'
      ? ('all' as const)
      : (FORMATS as readonly string[]).includes(formatRaw)
        ? (formatRaw as Format)
        : ('a3' as const)
  return {
    format,
    type: get('type') ?? null,
    out: get('out') ?? './out/preset-pngs',
    includeDrafts: flag('include-drafts'),
  }
}

function required(name: string): string {
  const v = process.env[name]
  if (!v || v.length === 0) {
    console.error('[export-preset-pngs] Fehlende Env-Variable: ' + name)
    process.exit(1)
  }
  return v
}

/**
 * Macht aus "Heart Love 2" -> "Heart_Love_2", "Madrid (FR)" -> "Madrid_FR".
 * Verhindert Probleme mit Dateinamen-Sonderzeichen und Spaces.
 */
function sanitizeFilename(name: string): string {
  return name
    .normalize('NFKD')
    .replace(/\p{M}/gu, '') // strip combining diacritics
    .replace(/[<>:"/\\|?*]/g, '') // illegal filename chars on Windows
    .replace(/[()[\]{}]/g, '') // brackets
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
}

interface PresetRow {
  id: string
  name: string
  poster_type: string
  status: string
  display_order: number
  preview_image_url_a4: string | null
  preview_image_url_a3: string | null
  preview_image_url_a2: string | null
  render_status_a4: string | null
  render_status_a3: string | null
  render_status_a2: string | null
}

async function downloadOne(
  url: string,
  destPath: string,
): Promise<{ ok: true; bytes: number } | { ok: false; error: string }> {
  try {
    const res = await fetch(url)
    if (!res.ok) return { ok: false, error: 'HTTP ' + res.status }
    const buf = Buffer.from(await res.arrayBuffer())
    mkdirSync(path.dirname(destPath), { recursive: true })
    writeFileSync(destPath, buf)
    return { ok: true, bytes: buf.byteLength }
  } catch (e) {
    return { ok: false, error: (e as Error).message }
  }
}

async function main() {
  const args = parseArgs()
  const supabase = createClient(
    required('NEXT_PUBLIC_SUPABASE_URL'),
    required('SUPABASE_SECRET_KEY'),
    { auth: { persistSession: false, autoRefreshToken: false } },
  )

  let query = supabase
    .from('presets')
    .select(
      'id, name, poster_type, status, display_order, preview_image_url_a4, preview_image_url_a3, preview_image_url_a2, render_status_a4, render_status_a3, render_status_a2',
    )
    .order('poster_type')
    .order('display_order')
    .order('name')
  if (!args.includeDrafts) query = query.eq('status', 'published')
  if (args.type) query = query.eq('poster_type', args.type)

  const { data, error } = await query
  if (error) {
    console.error('[export-preset-pngs] DB-Fehler: ' + error.message)
    process.exit(1)
  }
  const presets = (data ?? []) as PresetRow[]
  if (presets.length === 0) {
    console.log('Keine Presets gefunden mit Filter type=' + (args.type ?? 'all') + ', drafts=' + args.includeDrafts)
    process.exit(0)
  }

  const formats: Format[] = args.format === 'all' ? [...FORMATS] : [args.format]
  const outAbs = path.resolve(args.out)
  mkdirSync(outAbs, { recursive: true })

  console.log('Ziel-Ordner: ' + outAbs)
  console.log('Presets: ' + presets.length + ' · Formate: ' + formats.join(', '))
  console.log('---')

  let downloaded = 0
  let skipped = 0
  let failed = 0
  let totalBytes = 0

  for (const p of presets) {
    const safeName = sanitizeFilename(p.name)
    for (const fmt of formats) {
      const urlKey = ('preview_image_url_' + fmt) as keyof PresetRow
      const statusKey = ('render_status_' + fmt) as keyof PresetRow
      const url = p[urlKey] as string | null
      const status = p[statusKey] as string | null

      if (!url) {
        console.log('  skip ' + p.name + ' (' + fmt + '): keine URL [' + (status ?? 'no status') + ']')
        skipped += 1
        continue
      }
      // Render-Status kann stale sein (Preset hat preview_image_url_X gesetzt,
      // aber render_status_X steht noch auf 'pending'). Wir vertrauen der URL
      // und versuchen den Download — wenn das PNG kaputt/404 ist, meldet das
      // der HTTP-Fehler. Status wird nur informativ in der Ausgabe gezeigt.
      const statusNote = status && status !== 'done' ? ' [status=' + status + ']' : ''

      const destDir = path.join(outAbs, p.poster_type)
      const destPath = path.join(destDir, safeName + '_' + fmt + '.png')
      const result = await downloadOne(url, destPath)
      if (result.ok) {
        downloaded += 1
        totalBytes += result.bytes
        const rel = path.relative(process.cwd(), destPath)
        console.log('  ✓ ' + rel + '  (' + (result.bytes / 1024).toFixed(1) + ' KB)' + statusNote)
      } else {
        failed += 1
        console.log('  ✗ ' + p.name + ' (' + fmt + '): ' + result.error)
      }
    }
  }

  console.log('---')
  console.log('Gesamt: ' + downloaded + ' geladen, ' + skipped + ' übersprungen, ' + failed + ' fehler')
  console.log('Datenvolumen: ' + (totalBytes / 1024 / 1024).toFixed(2) + ' MB')
  if (downloaded > 0) {
    console.log('')
    console.log('Bulk-Upload in Dynamic Mockups:')
    console.log('  1. Dynamic-Mockups-Dashboard öffnen')
    console.log('  2. Im Asset-Bereich Drag&Drop oder File-Picker')
    console.log('  3. Den Ordner "' + path.relative(process.cwd(), outAbs) + '" oder einen Unter-Ordner auswählen')
  }
  if (failed > 0) process.exit(1)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
