/**
 * PROJ-31: Aufnahme der Amazon-Custom-Positionen vom JTL-Abholer.
 *
 * Der Abholer auf UMOI-SERVER liest die Anpassungsdaten lokal aus JTL und
 * schickt sie hierher. Diese Datei haelt die Logik, die Route darueber ist
 * nur Auth plus Rumpf-Validierung — analog `@/lib/etsy/order-pull`.
 *
 * Zwei Dinge bestimmen den Aufbau:
 *
 * 1. DUBLETTEN. Der Abholer schickt dieselbe Position bewusst mehrfach: er
 *    prueft bei jedem Lauf ein Rueckschaufenster von 30 Tagen, weil die
 *    JTL-Tabellen keine Aenderungsspalte haben und ein nachtraeglicher Storno
 *    sonst nie auffiele. Schluessel ist (amazon_order_id, order_item_id).
 *    Unveraendert -> skipped_duplicate. Geaendert -> aktualisieren.
 *    Dabei werden NUR die Amazon-Spalten angefasst; queue_status,
 *    design_preset, rendered_at und printed_at gehoeren petite-moment und
 *    bleiben stehen, sonst springt ein gedruckter Auftrag zurueck auf 'neu'.
 *
 * 2. ZWEI FORMEN DER ANPASSUNGSDATEN. `customization` kommt aus der
 *    JTL-Spalte mit Amazons Antwort-Huelle drumherum, aus dem ZIP dagegen
 *    ohne. Der Abholer legt den inneren Knoten deshalb zusaetzlich als
 *    `customization_item` bei. Darauf wird programmiert. Fehlt er einmal,
 *    packen wir ihn hier selbst aus, statt die Zeile unbrauchbar zu machen.
 *
 * Fehler einzelner Positionen beenden den Lauf nicht — sie landen in
 * `failed` plus `errors`, der Rest des Buendels wird verarbeitet. Der
 * Abholer protokolliert das und schickt beim naechsten Lauf erneut.
 */

import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase-admin'
import { resolveAndSave } from './resolve'

export const STORAGE_BUCKET = 'amazon-custom'

/** Bündelgröße laut Abholer-Vertrag 1–10. Wir nehmen mehr an, damit ein
 *  versehentlich groesseres Buendel nicht komplett abgewiesen wird. */
const MAX_ITEMS_PER_REQUEST = 100

// ─── Rumpf-Schema ──────────────────────────────────────────────────────────

const AssetSchema = z.object({
  filename: z.string().min(1).max(255),
  content_base64: z.string(),
  bytes: z.number().int().nonnegative().optional(),
})

const ItemSchema = z.object({
  amazon_order_id: z.string().min(1).max(64),
  order_item_id: z.string().min(1).max(64),
  position: z.number().int().positive().default(1),

  sku: z.string().min(1).max(128),
  asin: z.string().max(32).nullish(),
  marketplace_id: z.string().max(32).nullish(),
  purchase_date: z.string().nullish(),
  quantity: z.number().int().positive().default(1),
  order_state: z.enum(['open', 'cancelled', 'shipped']).default('open'),
  jtl_position_id: z.number().int().nullish(),

  customization: z.unknown(),
  customization_item: z.unknown().nullish(),
  customization_source: z.enum(['jtl_column', 'downloaded_zip']).nullish(),

  assets: z
    .object({
      preview_jpg: AssetSchema.nullish(),
      svg: AssetSchema.nullish(),
      xml: AssetSchema.nullish(),
    })
    .nullish(),

  archive_url: z.string().max(2000).nullish(),
  page_url: z.string().max(2000).nullish(),
  latest_ship_at: z.string().nullish(),
})

export const IngestBodySchema = z.object({
  source: z.string().max(32).optional(),
  collector_version: z.union([z.string(), z.number()]).optional(),
  items: z.array(ItemSchema).min(1).max(MAX_ITEMS_PER_REQUEST),
})

export type IngestItem = z.infer<typeof ItemSchema>
export type IngestBody = z.infer<typeof IngestBodySchema>

export interface IngestSummary {
  ok: boolean
  accepted: number
  skipped_duplicate: number
  failed: number
  errors: Array<{ order_item_id: string | null; message: string }>
}

// ─── customization_item beschaffen ─────────────────────────────────────────

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

/**
 * Packt den inneren Knoten aus, falls der Abholer ihn nicht mitgeschickt hat.
 *
 * Aus der JTL-Spalte sieht `customization` so aus:
 *   { status, successful, data: { orderCustomizationData: [ {...} ] }, ... }
 * Aus dem ZIP liegt derselbe Knoten direkt oben.
 *
 * Gibt null zurueck, wenn sich nichts Brauchbares finden laesst. Die Zeile
 * wird dann trotzdem gespeichert — die Rohdaten sind wertvoller als eine
 * abgelehnte Lieferung — aber mit einer Warnung versehen.
 */
export function unwrapCustomizationItem(customization: unknown): unknown | null {
  if (!isPlainObject(customization)) return null

  // Fall 1: Antwort-Huelle aus der JTL-Spalte.
  const data = customization.data
  if (isPlainObject(data)) {
    const list = data.orderCustomizationData
    if (Array.isArray(list) && list.length > 0 && isPlainObject(list[0])) {
      return list[0]
    }
  }

  // Fall 2: der Knoten liegt bereits oben (ZIP-Variante). Erkennbar an den
  // Feldern, die Amazon dort immer setzt.
  if ('customizationData' in customization || 'customizationInfo' in customization) {
    return customization
  }

  return null
}

// ─── Assets ────────────────────────────────────────────────────────────────

/**
 * Macht aus einem gelieferten Dateinamen einen sicheren Pfadbestandteil.
 * Der Abholer ist vertrauenswuerdig, aber der Name landet in einem
 * Storage-Pfad — `../` darf dort unter keinen Umstaenden durchkommen.
 */
export function sanitizeFilename(raw: string, fallback: string): string {
  const base = raw.split(/[/\\]/).pop() ?? ''
  const cleaned = base.replace(/[^A-Za-z0-9._-]/g, '_').replace(/^\.+/, '')
  if (!cleaned || cleaned === '_') return fallback
  return cleaned.slice(0, 120)
}

const CONTENT_TYPES: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  svg: 'image/svg+xml',
  xml: 'application/xml',
}

function contentTypeFor(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() ?? ''
  return CONTENT_TYPES[ext] ?? 'application/octet-stream'
}

interface AssetInput {
  filename: string
  content_base64: string
  bytes?: number
}

/**
 * Laedt ein base64-Asset in den Storage und liefert den Pfad.
 *
 * Wirft nie. Ein fehlendes oder kaputtes Asset darf den Ingest nicht
 * scheitern lassen — die Anpassungsdaten sind das Wichtige, das Bild ist
 * die Zugabe. Probleme kommen als Warnung zurueck und landen in der Zeile.
 */
async function uploadAsset(
  supabase: ReturnType<typeof createAdminClient>,
  orderId: string,
  orderItemId: string,
  asset: AssetInput | null | undefined,
  kind: 'preview' | 'svg' | 'xml',
  fallbackName: string,
  warnings: string[],
): Promise<string | null> {
  if (!asset || !asset.content_base64) {
    warnings.push(`${kind}: nicht mitgeliefert`)
    return null
  }

  let buffer: Buffer
  try {
    buffer = Buffer.from(asset.content_base64, 'base64')
  } catch {
    warnings.push(`${kind}: base64 nicht dekodierbar`)
    return null
  }
  if (buffer.length === 0) {
    warnings.push(`${kind}: leer nach dem Dekodieren`)
    return null
  }
  if (typeof asset.bytes === 'number' && asset.bytes !== buffer.length) {
    // Kein Abbruch — nur ein Hinweis, dass die Laengenangabe nicht passt.
    warnings.push(
      `${kind}: Laenge weicht ab (gemeldet ${asset.bytes}, dekodiert ${buffer.length})`,
    )
  }

  const filename = sanitizeFilename(asset.filename, fallbackName)
  // Deterministischer Pfad: ein erneuter Ingest ueberschreibt, statt zu
  // duplizieren. Der Slash in der Bestellnummer ist unmoeglich, aber die
  // IDs werden trotzdem bereinigt — sie kommen aus einer fremden Quelle.
  const path = [
    sanitizeFilename(orderId, 'unknown-order'),
    sanitizeFilename(orderItemId, 'unknown-item'),
    filename,
  ].join('/')

  const { error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(path, buffer, {
      contentType: contentTypeFor(filename),
      upsert: true,
    })

  if (error) {
    warnings.push(`${kind}: Upload fehlgeschlagen (${error.message})`)
    return null
  }
  return path
}

// ─── Dubletten-Vergleich ───────────────────────────────────────────────────

/** Die Spalten, die dem Abholer gehoeren. Nur diese werden verglichen und
 *  nur diese werden bei einem erneuten Ingest aktualisiert. */
const AMAZON_OWNED_FIELDS = [
  'position',
  'sku',
  'asin',
  'marketplace_id',
  'purchase_date',
  'quantity',
  'order_state',
  'jtl_position_id',
  'customization_source',
  'preview_path',
  'svg_path',
  'xml_path',
  'archive_url',
  'page_url',
  'latest_ship_at',
] as const

interface ExistingRow {
  id: string
  printed_at: string | null
  queue_status: string
  [key: string]: unknown
}

function sameValue(a: unknown, b: unknown): boolean {
  if (a === b) return true
  if (a == null && b == null) return true
  if (a == null || b == null) return false
  // Zeitstempel: Postgres liefert sie anders formatiert zurueck als sie
  // hereinkamen ('2026-09-14 20:38:38+00' vs '2026-09-14T20:38:38.000Z').
  if (typeof a === 'string' && typeof b === 'string') {
    const ta = Date.parse(a)
    const tb = Date.parse(b)
    if (!Number.isNaN(ta) && !Number.isNaN(tb)) return ta === tb
  }
  return String(a) === String(b)
}

/**
 * Entscheidet, ob eine erneut gelieferte Position tatsaechlich etwas Neues
 * bringt. Verglichen wird nur, was dem Abholer gehoert.
 *
 * Ein nachgereichtes Asset zaehlt als Aenderung: beim ersten Mal war Amazons
 * ZIP vielleicht nicht erreichbar, jetzt ist das Bild da. Umgekehrt zaehlt
 * ein fehlendes Asset NICHT als Aenderung — sonst wuerde ein bereits
 * gespeichertes Vorschaubild geloescht, nur weil Amazon gerade klemmt.
 */
export function diffAmazonFields(
  existing: Record<string, unknown>,
  incoming: Record<string, unknown>,
): string[] {
  const changed: string[] = []
  for (const field of AMAZON_OWNED_FIELDS) {
    const next = incoming[field]
    const prev = existing[field]
    const isAssetPath =
      field === 'preview_path' || field === 'svg_path' || field === 'xml_path'
    if (isAssetPath && next == null) continue // nie ein vorhandenes Asset wegnehmen
    if (!sameValue(prev, next)) changed.push(field)
  }
  return changed
}

// ─── Eine Position verarbeiten ─────────────────────────────────────────────

function toIsoOrNull(value: string | null | undefined): string | null {
  if (!value) return null
  const t = Date.parse(value)
  if (Number.isNaN(t)) return null
  return new Date(t).toISOString()
}

async function processItem(
  supabase: ReturnType<typeof createAdminClient>,
  item: IngestItem,
  summary: IngestSummary,
): Promise<void> {
  const warnings: string[] = []

  // Erst nachsehen, ob die Position schon da ist. Das steht bewusst VOR dem
  // Hochladen der Assets: der Abholer schickt jede Position im 30-Tage-
  // Rueckschaufenster stuendlich erneut, mitsamt Bild. Wuerden wir jedes Mal
  // hochladen, schriebe ein normaler Betrieb taeglich hunderte Megabyte in
  // den Storage, ohne dass sich etwas aendert. Vorhandene Assets werden
  // deshalb uebernommen; hochgeladen wird nur, was noch fehlt.
  const { data: existing, error: readError } = await supabase
    .from('amazon_custom_orders')
    .select(
      'id, printed_at, queue_status, position, sku, asin, marketplace_id, purchase_date, quantity, order_state, jtl_position_id, customization_source, preview_path, svg_path, xml_path, archive_url, page_url, latest_ship_at',
    )
    .eq('amazon_order_id', item.amazon_order_id)
    .eq('order_item_id', item.order_item_id)
    .maybeSingle<ExistingRow>()

  if (readError) {
    summary.failed += 1
    summary.errors.push({
      order_item_id: item.order_item_id,
      message: `Lesen fehlgeschlagen: ${readError.message}`,
    })
    return
  }

  // customization_item beschaffen: geliefert bevorzugt, sonst auspacken.
  let customizationItem: unknown = isPlainObject(item.customization_item)
    ? item.customization_item
    : null
  if (!customizationItem) {
    customizationItem = unwrapCustomizationItem(item.customization)
    if (customizationItem) {
      warnings.push('customization_item fehlte, aus customization ausgepackt')
    } else {
      warnings.push(
        'customization_item fehlt und liess sich nicht auspacken — Zeile ist so nicht renderbar',
      )
    }
  }

  const purchaseDate = toIsoOrNull(item.purchase_date)
  if (item.purchase_date && !purchaseDate) {
    warnings.push(`purchase_date unlesbar: ${String(item.purchase_date).slice(0, 40)}`)
  }
  const latestShipAt = toIsoOrNull(item.latest_ship_at)

  /** Vorhandenes Asset behalten, fehlendes nachreichen. */
  const resolveAsset = async (
    stored: unknown,
    asset: AssetInput | null | undefined,
    kind: 'preview' | 'svg' | 'xml',
    fallbackName: string,
  ): Promise<string | null> => {
    if (typeof stored === 'string' && stored.length > 0) return stored
    return uploadAsset(
      supabase, item.amazon_order_id, item.order_item_id,
      asset, kind, fallbackName, warnings,
    )
  }

  const previewPath = await resolveAsset(
    existing?.preview_path, item.assets?.preview_jpg, 'preview', 'preview.jpg',
  )
  const svgPath = await resolveAsset(
    existing?.svg_path, item.assets?.svg, 'svg', 'design.svg',
  )
  const xmlPath = await resolveAsset(
    existing?.xml_path, item.assets?.xml, 'xml', 'data.xml',
  )

  const amazonFields: Record<string, unknown> = {
    position: item.position,
    sku: item.sku,
    asin: item.asin ?? null,
    marketplace_id: item.marketplace_id ?? null,
    purchase_date: purchaseDate,
    quantity: item.quantity,
    order_state: item.order_state,
    jtl_position_id: item.jtl_position_id ?? null,
    customization_source: item.customization_source ?? null,
    preview_path: previewPath,
    svg_path: svgPath,
    xml_path: xmlPath,
    archive_url: item.archive_url ?? null,
    page_url: item.page_url ?? null,
    latest_ship_at: latestShipAt,
  }

  // ── Neu ──────────────────────────────────────────────────────────────
  if (!existing) {
    const { data: inserted, error } = await supabase
      .from('amazon_custom_orders')
      .insert({
        amazon_order_id: item.amazon_order_id,
        order_item_id: item.order_item_id,
        ...amazonFields,
        customization: item.customization ?? {},
        customization_item: customizationItem,
        ingest_warnings: warnings,
        queue_status: item.order_state === 'cancelled' ? 'storniert' : 'neu',
      })
      .select('id, sku, order_state, printed_at, customization_item, ingest_warnings')
      .single()
    if (error) {
      summary.failed += 1
      summary.errors.push({
        order_item_id: item.order_item_id,
        message: `Anlegen fehlgeschlagen: ${error.message}`,
      })
      return
    }
    summary.accepted += 1

    // Gleich auflösen: SKU -> Preset, Felder gegen das Schema, Ort suchen.
    // Schlägt das fehl, ist die Zeile trotzdem da — der Eingang ist das
    // Wichtige, die Auflösung ist jederzeit wiederholbar.
    await resolveQuietly(supabase, inserted, summary, item.order_item_id)
    return
  }

  // ── Bekannt: bringt die Lieferung etwas Neues? ────────────────────────
  const changed = diffAmazonFields(existing, amazonFields)

  if (changed.length === 0) {
    summary.skipped_duplicate += 1
    return
  }

  const update: Record<string, unknown> = {
    customization: item.customization ?? {},
    customization_item: customizationItem,
    ingest_warnings: warnings,
  }
  for (const field of changed) update[field] = amazonFields[field]

  // Die einzige Stelle, an der der Ingest ein Queue-Feld anfasst: ein Storno
  // muss einen noch nicht gedruckten Auftrag aus der Warteschlange nehmen.
  // Genau dafuer schickt der Abholer das Rueckschaufenster. Was schon
  // gedruckt ist, bleibt stehen — dort ist der Zug abgefahren.
  if (
    changed.includes('order_state') &&
    item.order_state === 'cancelled' &&
    existing.printed_at === null
  ) {
    update.queue_status = 'storniert'
  }

  const { error } = await supabase
    .from('amazon_custom_orders')
    .update(update)
    .eq('id', existing.id)

  if (error) {
    summary.failed += 1
    summary.errors.push({
      order_item_id: item.order_item_id,
      message: `Aktualisieren fehlgeschlagen: ${error.message}`,
    })
    return
  }
  summary.accepted += 1

  // Nur neu auflösen, wenn sich inhaltlich etwas geändert hat, das die
  // Auswertung betrifft. Ein Storno hat die Zeile oben schon aus der Queue
  // genommen; ein nachgereichtes Vorschaubild ändert am Poster nichts.
  const brauchtNeuauswertung = changed.some((f) => f === 'sku' || f === 'order_state')
  if (brauchtNeuauswertung && existing.printed_at === null) {
    await resolveQuietly(
      supabase,
      {
        id: existing.id,
        sku: item.sku,
        order_state: item.order_state,
        printed_at: existing.printed_at,
        customization_item: customizationItem,
        ingest_warnings: warnings,
      },
      summary,
      item.order_item_id,
    )
  }
}

/**
 * Löst eine Position auf, ohne den Eingang scheitern zu lassen.
 *
 * Die Auflösung ruft eine fremde Schnittstelle auf (Ortssuche). Wenn die
 * klemmt, soll die Bestellung trotzdem gespeichert bleiben — sie steht dann
 * auf 'neu' und wird beim nächsten Anlauf ausgewertet.
 */
async function resolveQuietly(
  supabase: ReturnType<typeof createAdminClient>,
  row: {
    id: string
    sku: string
    order_state: string
    printed_at: string | null
    customization_item: unknown
    ingest_warnings?: string[] | null
  },
  summary: IngestSummary,
  orderItemId: string,
): Promise<void> {
  try {
    const r = await resolveAndSave(supabase, row)
    if (!r.ok) {
      summary.errors.push({
        order_item_id: orderItemId,
        message: `Aufgenommen, aber Auswertung fehlgeschlagen: ${r.error}`,
      })
    }
  } catch (e) {
    summary.errors.push({
      order_item_id: orderItemId,
      message: `Aufgenommen, aber Auswertung fehlgeschlagen: ${(e as Error).message}`,
    })
  }
}

// ─── Einstieg ──────────────────────────────────────────────────────────────

export async function runIngest(body: IngestBody): Promise<IngestSummary> {
  const supabase = createAdminClient()
  const summary: IngestSummary = {
    ok: true,
    accepted: 0,
    skipped_duplicate: 0,
    failed: 0,
    errors: [],
  }

  for (const item of body.items) {
    try {
      await processItem(supabase, item, summary)
    } catch (e) {
      // Eine kaputte Position darf das Buendel nicht kippen.
      summary.failed += 1
      summary.errors.push({
        order_item_id: item.order_item_id ?? null,
        message: `Unerwartet: ${(e as Error).message}`,
      })
    }
  }

  summary.ok = summary.failed === 0
  return summary
}
