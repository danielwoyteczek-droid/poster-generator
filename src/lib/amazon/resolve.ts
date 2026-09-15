/**
 * PROJ-31: Auflösung einer eingegangenen Bestellposition.
 *
 *   SKU  →  Preset + Feld-Schema
 *           ↓
 *   Anpassungsfelder gegen das Schema abgleichen
 *           ↓
 *   Ort auflösen  (Koordinatenfeld schlägt den Ortstext)
 *           ↓
 *   queue_status setzen
 *
 * Bewusst wiederholbar: trägt der Betreiber eine fehlende SKU-Zuordnung
 * nach oder korrigiert er ein Schema, laufen die betroffenen Positionen
 * erneut durch, ohne dass der Abholer etwas neu schicken muss.
 *
 * Fasst niemals eine Position an, die schon gedruckt ist.
 */

import type { createAdminClient } from '@/lib/supabase-admin'
import { flattenCustomization, matchAmazonFields, extractDesignHints } from './customization'
import { schemaOrDefault, parseCoords } from './sku-schema'
import { geocodeOnce } from './geocode'

export type QueueStatus =
  | 'neu'
  | 'preset_fehlt'
  | 'pruefung'
  | 'bereit'
  | 'entwurf'
  | 'gedruckt'
  | 'storniert'

export interface ResolveOutcome {
  queue_status: QueueStatus
  preset_id: string | null
  parse_result: unknown
  design_hints: unknown
  map_lat: number | null
  map_lng: number | null
  map_place: string | null
  resolved_at: string
  ingest_warnings: string[]
}

interface OrderRowForResolve {
  id: string
  sku: string
  order_state: string
  printed_at: string | null
  customization_item: unknown
  ingest_warnings?: string[] | null
}

type Supa = ReturnType<typeof createAdminClient>

/**
 * Wertet eine Position aus, ohne sie zu schreiben. Getrennt gehalten, damit
 * die Admin-Oberfläche eine Vorschau zeigen kann, bevor etwas festgeschrieben
 * wird.
 */
export async function resolveOrder(
  supabase: Supa,
  row: OrderRowForResolve,
  options: { geocode?: boolean } = {},
): Promise<ResolveOutcome> {
  const warnings: string[] = []
  const now = new Date().toISOString()

  const base: ResolveOutcome = {
    queue_status: 'neu',
    preset_id: null,
    parse_result: null,
    design_hints: null,
    map_lat: null,
    map_lng: null,
    map_place: null,
    resolved_at: now,
    ingest_warnings: warnings,
  }

  if (row.order_state === 'cancelled') {
    return { ...base, queue_status: 'storniert' }
  }

  // ── SKU → Preset + Schema ─────────────────────────────────────────────
  const { data: mapping } = await supabase
    .from('amazon_sku_mappings')
    .select('id, preset_id, personalization_schema')
    .eq('sku', row.sku)
    .maybeSingle<{ id: string; preset_id: string | null; personalization_schema: unknown }>()

  if (!mapping) {
    // Unbekannte SKU: Zeile in der Zuordnungstabelle anlegen, damit die
    // Artikelnummer sichtbar wird statt stillschweigend zu verschwinden.
    await supabase
      .from('amazon_sku_mappings')
      .insert({ sku: row.sku, notes: 'Automatisch angelegt beim Eingang einer Bestellung' })
      // Zwei Positionen derselben neuen SKU im selben Bündel: die zweite
      // darf nicht an der Unique-Bedingung scheitern.
      .select('id')
      .maybeSingle()
    warnings.push(`SKU ${row.sku} war unbekannt — Zuordnung offen angelegt`)
    return { ...base, queue_status: 'preset_fehlt' }
  }

  if (!mapping.preset_id) {
    warnings.push(`SKU ${row.sku} ist noch keinem Preset zugeordnet`)
    return { ...base, queue_status: 'preset_fehlt' }
  }

  const schema = schemaOrDefault(mapping.personalization_schema)

  // ── Anpassungsfelder abgleichen ───────────────────────────────────────
  const flat = flattenCustomization(row.customization_item)
  if (flat.fields.length === 0) {
    warnings.push('Keine Anpassungsfelder gefunden — Position lässt sich nicht auswerten')
    return { ...base, preset_id: mapping.preset_id, queue_status: 'pruefung' }
  }
  if (flat.usedFallback) {
    warnings.push('Anpassungsbaum fehlte, flache Liste verwendet — Textwerte bitte prüfen')
  }
  if (flat.unknownTypes.length > 0) {
    warnings.push(`Unbekannte Feldtypen: ${flat.unknownTypes.join(', ')}`)
  }

  const parse = matchAmazonFields(flat.fields, schema)
  const hints = extractDesignHints(flat.fields, parse)

  if (!parse.ok) {
    if (parse.missing.length > 0) {
      warnings.push(`Pflichtfelder fehlen: ${parse.missing.join(', ')}`)
    }
    for (const bad of parse.invalid) {
      warnings.push(`${bad.key}: ${bad.reason}`)
    }
  }
  if (parse.unmatchedLines.length > 0) {
    warnings.push(`Nicht zugeordnet: ${parse.unmatchedLines.join(' | ')}`)
  }

  const out: ResolveOutcome = {
    ...base,
    preset_id: mapping.preset_id,
    parse_result: parse,
    design_hints: hints,
    queue_status: parse.ok ? 'bereit' : 'pruefung',
  }

  // ── Ort auflösen ──────────────────────────────────────────────────────
  // Hat der Käufer Koordinaten eingetippt, schlagen sie den Ortstext — er
  // hat sie genau deshalb angegeben.
  const typedCoords = parseCoords(parse.parsed.coords)
  if (typedCoords) {
    out.map_lat = typedCoords.lat
    out.map_lng = typedCoords.lng
    out.map_place = parse.parsed.location ?? null
  } else if (options.geocode !== false && parse.parsed.location) {
    const geo = await geocodeOnce(parse.parsed.location)
    if (geo.ok) {
      out.map_lat = geo.lat
      out.map_lng = geo.lng
      out.map_place = geo.placeName
      if (geo.ambiguous) {
        warnings.push(
          `Ortssuche mehrdeutig: „${parse.parsed.location}" → „${geo.placeName}" (${geo.alternatives} weitere Treffer)`,
        )
        out.queue_status = 'pruefung'
      }
    } else {
      warnings.push(`Ort nicht gefunden: „${parse.parsed.location}" (${geo.reason})`)
      out.queue_status = 'pruefung'
    }
  } else if (!parse.parsed.location) {
    warnings.push('Kein Ort angegeben — Karte lässt sich nicht zentrieren')
    out.queue_status = 'pruefung'
  }

  out.ingest_warnings = warnings
  return out
}

/**
 * Wertet eine Position aus und schreibt das Ergebnis.
 * Eine bereits gedruckte Position bleibt unangetastet.
 */
export async function resolveAndSave(
  supabase: Supa,
  row: OrderRowForResolve,
  options: { geocode?: boolean } = {},
): Promise<{ ok: boolean; status: QueueStatus | 'uebersprungen'; error?: string }> {
  if (row.printed_at) {
    return { ok: true, status: 'uebersprungen' }
  }

  const outcome = await resolveOrder(supabase, row, options)
  const { ingest_warnings, ...rest } = outcome

  const { error } = await supabase
    .from('amazon_custom_orders')
    .update({
      ...rest,
      // Warnungen des Eingangs bleiben erhalten, die der Auflösung kommen dazu.
      ingest_warnings: [...(row.ingest_warnings ?? []), ...ingest_warnings],
    })
    .eq('id', row.id)
    // Wettlauf mit einem parallelen Druck ausschliessen.
    .is('printed_at', null)

  if (error) return { ok: false, status: outcome.queue_status, error: error.message }
  return { ok: true, status: outcome.queue_status }
}

const RESOLVE_SELECT =
  'id, sku, order_state, printed_at, customization_item, ingest_warnings'

/**
 * Wertet alle Positionen einer SKU neu aus. Wird aufgerufen, wenn eine
 * Zuordnung nachgetragen oder ein Schema geändert wurde.
 *
 * Gedruckte Positionen werden übersprungen, stornierte ebenfalls nicht
 * wiederbelebt.
 */
export async function resolveBySku(
  supabase: Supa,
  sku: string,
  options: { geocode?: boolean; limit?: number } = {},
): Promise<{ geprueft: number; bereit: number; pruefung: number; preset_fehlt: number; fehler: string[] }> {
  const summary = { geprueft: 0, bereit: 0, pruefung: 0, preset_fehlt: 0, fehler: [] as string[] }

  const { data: rows, error } = await supabase
    .from('amazon_custom_orders')
    .select(RESOLVE_SELECT)
    .eq('sku', sku)
    .is('printed_at', null)
    .neq('order_state', 'cancelled')
    .limit(options.limit ?? 500)

  if (error) {
    summary.fehler.push(`Lesen fehlgeschlagen: ${error.message}`)
    return summary
  }

  for (const row of (rows ?? []) as OrderRowForResolve[]) {
    const r = await resolveAndSave(supabase, row, options)
    summary.geprueft += 1
    if (!r.ok) {
      summary.fehler.push(`${row.id}: ${r.error}`)
      continue
    }
    if (r.status === 'bereit') summary.bereit += 1
    else if (r.status === 'pruefung') summary.pruefung += 1
    else if (r.status === 'preset_fehlt') summary.preset_fehlt += 1
  }

  return summary
}
