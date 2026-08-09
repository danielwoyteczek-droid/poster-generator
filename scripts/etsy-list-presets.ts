#!/usr/bin/env tsx
/**
 * PROJ-49: Helper script — dumps all published presets grouped by poster_type
 * in a format ready for copy-paste into Etsy's "Liste der Optionen"
 * personalization field.
 *
 * Usage:
 *   npm run etsy:list-presets                  → all poster types
 *   npm run etsy:list-presets -- map           → only map presets
 *   npm run etsy:list-presets -- star-map      → only star-map
 *   npm run etsy:list-presets -- --include-drafts
 *
 * Output format: one preset name per line, sorted by display_order then name.
 * Copy-paste directly into Etsy's "Liste der Optionen" — Etsy accepts
 * line-by-line option input.
 *
 * Naming rule check: prints a warning if a preset name contains characters
 * Etsy might choke on (Umlauts are fine; we warn for ASCII-suspect chars only).
 */

import { createClient } from '@supabase/supabase-js'
import { config as loadEnv } from 'dotenv'
import path from 'node:path'

loadEnv({ path: path.resolve(process.cwd(), '.env.local') })

function required(name: string): string {
  const v = process.env[name]
  if (!v || v.length === 0) {
    console.error(`[etsy-list-presets] Fehlende Env-Variable: ${name}`)
    process.exit(1)
  }
  return v
}

const SUPABASE_URL = required('NEXT_PUBLIC_SUPABASE_URL')
const SUPABASE_KEY = required('SUPABASE_SECRET_KEY')

interface PresetRow {
  id: string
  name: string
  poster_type: string
  status: string
  display_order: number
  show_in_editor: boolean
}

const POSTER_TYPE_LABELS: Record<string, string> = {
  map: 'Karten-Poster (Stadt/Landkarte)',
  'star-map': 'Sternenkarten-Poster',
  photo: 'Foto-Poster (für Etsy aktuell nicht relevant — kein Foto-Upload via Personalisierung)',
}

function checkNamingHygiene(name: string): string | null {
  // Etsy verträgt UTF-8 inkl. Umlauten, aber prüfen wir auf zwei häufige Fallen:
  if (name !== name.trim()) return 'führendes/anhängendes Leerzeichen'
  if (/\s{2,}/.test(name)) return 'doppeltes Leerzeichen'
  if (name.length > 60) return `>60 Zeichen (Etsy-Option-Limit prüfen: aktuell ${name.length})`
  if (/[<>"|\\]/.test(name)) return 'enthält Sonderzeichen <>"|\\, könnte Etsy stören'
  return null
}

async function main() {
  const args = process.argv.slice(2)
  const includeDrafts = args.includes('--include-drafts')
  const filterType = args.find((a) => !a.startsWith('--'))

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  let query = supabase
    .from('presets')
    .select('id, name, poster_type, status, display_order, show_in_editor')
    .order('poster_type', { ascending: true })
    .order('display_order', { ascending: true })
    .order('name', { ascending: true })

  if (!includeDrafts) {
    query = query.eq('status', 'published')
  }
  if (filterType) {
    query = query.eq('poster_type', filterType)
  }

  const { data, error } = await query
  if (error) {
    console.error(`[etsy-list-presets] DB-Fehler: ${error.message}`)
    process.exit(1)
  }

  const presets = (data ?? []) as PresetRow[]
  if (presets.length === 0) {
    console.log('Keine Presets gefunden.')
    process.exit(0)
  }

  const byType = new Map<string, PresetRow[]>()
  for (const p of presets) {
    const list = byType.get(p.poster_type) ?? []
    list.push(p)
    byType.set(p.poster_type, list)
  }

  let warningsTotal = 0
  for (const [posterType, list] of byType) {
    const label = POSTER_TYPE_LABELS[posterType] ?? posterType
    console.log('')
    console.log('=== ' + label + ' (' + list.length + ' Looks) ===')
    console.log('Schema-Key beim Etsy-Listing: "look"')
    console.log('---')
    for (const p of list) {
      const flags: string[] = []
      if (p.status === 'draft') flags.push('DRAFT')
      if (!p.show_in_editor) flags.push('hidden')
      const warning = checkNamingHygiene(p.name)
      if (warning) {
        flags.push('⚠ ' + warning)
        warningsTotal += 1
      }
      const suffix = flags.length > 0 ? '   [' + flags.join(', ') + ']' : ''
      console.log(p.name + suffix)
    }
  }

  console.log('')
  console.log('---')
  console.log('Gesamt: ' + presets.length + ' Presets in ' + byType.size + ' Typ(en)')
  if (warningsTotal > 0) {
    console.log('⚠ ' + warningsTotal + ' Warnung(en) — siehe Markierungen oben')
  }
  console.log('')
  console.log('Copy-Paste-Hinweis:')
  console.log('- Beim Etsy-Listing das Feld "Personalisierung → Liste der Optionen" wählen.')
  console.log('- Pro Listing-Typ EINE eigene Etsy-Page anlegen (Stadt-Poster, Sternenkarte, …)')
  console.log('- Nur die Zeilen OHNE [DRAFT] / [hidden] / ⚠-Marker übernehmen.')
  console.log('- Optionen müssen EXAKT mit den Preset-Namen übereinstimmen — sonst landet die Order in pending_mapping.')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
