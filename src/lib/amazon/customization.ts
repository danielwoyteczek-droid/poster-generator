/**
 * PROJ-31: Auswertung der Amazon-Custom-Anpassungsdaten.
 *
 * Amazon legt dieselben Angaben zweimal ab:
 *
 *   customizationData                       — verschachtelter Baum
 *   customizationInfo['version3.0'].surfaces[].areas[]  — flache Liste
 *
 * Die flache Liste ist bequemer, aber lückenhaft: sobald der Käufer den
 * Schriftzug selbst verschiebt, schrumpft sein Eintrag dort auf einen
 * Bildverweis (`ImagePrinting` mit `svgImage`) zusammen und der getippte
 * Text fehlt ersatzlos. An echten Bestellungen nachgeprüft — in zwei von
 * drei war genau das passiert.
 *
 * Ausgewertet wird deshalb der BAUM. Die flache Liste dient nur als
 * Rückfall, falls `customizationData` einmal fehlen sollte.
 *
 * Der zweite Grund für den Baum: er bindet Schrift und Farbe an ihren
 * Textblock. Eine Bestellung kann Titel und Namen unterschiedlich gestalten
 * — schwarz in einer Schrift, grau in einer anderen — und beide Farbfelder
 * heißen schlicht „Farbe". Flach nebeneinandergelegt ist nicht mehr
 * entscheidbar, welche zu welchem Block gehört; im Baum schon.
 */

import {
  type PersonalizationSchema,
  type ParseResult,
  finalizeParse,
  findFieldForLabel,
} from '@/lib/etsy/personalization-parser'

export type FieldKind = 'text' | 'font' | 'color' | 'option' | 'image'

export interface FlatField {
  /** Beschriftungspfad von der Oberfläche bis zum Feld. */
  path: string[]
  /** Amazons interner Feldname. Kurz und stabil, erste Wahl beim Abgleich. */
  name: string
  /** Was der Käufer gelesen hat. Ändert sich, wenn das Listing überarbeitet wird. */
  label: string
  kind: FieldKind
  value: string
  /**
   * Pfadschlüssel des Containers, der Schrift und Farbe für diesen Block
   * hält. Textfelder mit demselben Schlüssel teilen sich die Gestaltung.
   */
  groupKey: string
  meta?: Record<string, string>
}

export interface FlattenResult {
  fields: FlatField[]
  /** Knotentypen, die wir nicht kennen — Signal für ein neues Produkt. */
  unknownTypes: string[]
  /** Oberflächen-Namen, z. B. 'Heart'. Unterscheidet Varianten je SKU. */
  surfaces: string[]
  /** true, wenn die flache Liste als Rückfall herhalten musste. */
  usedFallback: boolean
}

interface RawNode {
  type?: string
  name?: string
  label?: string
  children?: RawNode[]
  inputValue?: string
  fontSelection?: { family?: string; fontUrl?: string }
  colorSelection?: { name?: string; value?: string }
  optionSelection?: { name?: string; label?: string; value?: string }
  displayValue?: string
  imageName?: string
  [key: string]: unknown
}

const CONTAINER_TYPES = new Set([
  'PageContainerCustomization',
  'PreviewContainerCustomization',
  'FlatContainerCustomization',
  'ContainerCustomization',
  'PlacementContainerCustomization',
  'FlatRatePriceDeltaContainerCustomization',
])

const LEAF_TYPES = new Set([
  'TextCustomization',
  'FontCustomization',
  'ColorCustomization',
  'OptionCustomization',
  'ImageCustomization',
])

function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

function leafOf(node: RawNode): Omit<FlatField, 'path' | 'groupKey'> | null {
  const name = (node.name ?? '').trim()
  const label = (node.label ?? '').trim()

  switch (node.type) {
    case 'TextCustomization': {
      const value = (node.inputValue ?? '').trim()
      // Ein leer gelassenes Feld ist normal (zweite Textzeile), kein Fehler.
      return value ? { name, label, kind: 'text', value } : null
    }
    case 'FontCustomization': {
      const family = (node.fontSelection?.family ?? '').trim()
      if (!family) return null
      const meta: Record<string, string> = {}
      if (node.fontSelection?.fontUrl) meta.fontUrl = node.fontSelection.fontUrl
      return { name, label, kind: 'font', value: family, meta }
    }
    case 'ColorCustomization': {
      const colorName = (node.colorSelection?.name ?? '').trim()
      const hex = (node.colorSelection?.value ?? '').trim()
      if (!colorName && !hex) return null
      const meta: Record<string, string> = {}
      if (hex) meta.hex = hex
      return { name, label, kind: 'color', value: colorName || hex, meta }
    }
    case 'OptionCustomization': {
      const value = (
        node.optionSelection?.name ??
        node.displayValue ??
        node.optionSelection?.value ??
        ''
      ).trim()
      return value ? { name, label, kind: 'option', value } : null
    }
    case 'ImageCustomization': {
      const value = (node.imageName ?? '').trim()
      return value ? { name, label, kind: 'image', value } : null
    }
    default:
      return null
  }
}

/** Trägt ein Container direkt Schrift oder Farbe, ist er der Stilblock für alles darunter. */
function ownsStyle(node: RawNode): boolean {
  return (node.children ?? []).some(
    (c) => c.type === 'FontCustomization' || c.type === 'ColorCustomization',
  )
}

function walk(
  node: RawNode | null | undefined,
  path: string[],
  groupKey: string,
  out: FlatField[],
  unknown: Set<string>,
): void {
  if (!isObj(node)) return

  const own = ((node.label || node.name) ?? '').toString().trim()
  const here = own ? [...path, own] : path
  const type = node.type ?? ''

  const nextGroup =
    CONTAINER_TYPES.has(type) && ownsStyle(node) ? here.join(' / ') : groupKey

  const leaf = leafOf(node)
  if (leaf) {
    out.push({ ...leaf, path: here, groupKey: nextGroup })
  } else if (type && !CONTAINER_TYPES.has(type) && !LEAF_TYPES.has(type)) {
    // Ein neues Amazon-Produkt darf den Import nicht blockieren, soll aber
    // sichtbar werden.
    unknown.add(type)
  }

  for (const child of node.children ?? []) {
    walk(child, here, nextGroup, out, unknown)
  }
}

/** Rückfall: die flache Liste, falls der Baum fehlt. */
function fromAreas(customizationItem: Record<string, unknown>): FlatField[] {
  const info = customizationItem.customizationInfo
  if (!isObj(info)) return []
  const v3 = info['version3.0']
  if (!isObj(v3)) return []
  const surfaces = v3.surfaces
  if (!Array.isArray(surfaces)) return []

  const out: FlatField[] = []
  for (const surface of surfaces) {
    if (!isObj(surface)) continue
    const surfaceName = String(surface.name ?? '')
    const areas = surface.areas
    if (!Array.isArray(areas)) continue
    for (const area of areas) {
      if (!isObj(area)) continue
      const name = String(area.name ?? '').trim()
      const label = String(area.label ?? '').trim()
      const groupKey = surfaceName ? `${surfaceName} / ${name}` : name

      if (area.customizationType === 'TextPrinting') {
        const text = String(area.text ?? '').trim()
        if (text) out.push({ path: [surfaceName, name], name, label, kind: 'text', value: text, groupKey })
        const family = String(area.fontFamily ?? '').trim()
        if (family) {
          const meta: Record<string, string> = {}
          if (area.fontUrl) meta.fontUrl = String(area.fontUrl)
          out.push({ path: [surfaceName, name], name, label, kind: 'font', value: family, groupKey, meta })
        }
        const colorName = String(area.colorName ?? '').trim()
        const hex = String(area.fill ?? '').trim()
        if (colorName || hex) {
          out.push({
            path: [surfaceName, name], name, label, kind: 'color',
            value: colorName || hex, groupKey,
            meta: hex ? { hex } : undefined,
          })
        }
      } else if (area.customizationType === 'Options') {
        const value = String(area.optionValue ?? '').trim()
        if (value) out.push({ path: [surfaceName, name], name, label, kind: 'option', value, groupKey })
      }
    }
  }
  return out
}

export function flattenCustomization(customizationItem: unknown): FlattenResult {
  const doc = isObj(customizationItem) ? customizationItem : {}
  const fields: FlatField[] = []
  const unknown = new Set<string>()

  walk(doc.customizationData as RawNode, [], '', fields, unknown)

  let usedFallback = false
  if (fields.length === 0) {
    const fromFlat = fromAreas(doc)
    if (fromFlat.length > 0) {
      fields.push(...fromFlat)
      usedFallback = true
    }
  }

  // Oberflächen-Namen getrennt einsammeln: sie unterscheiden Varianten
  // innerhalb einer SKU und sind damit für die Preset-Wahl interessant.
  const surfaces: string[] = []
  const info = doc.customizationInfo
  if (isObj(info) && isObj(info['version3.0'])) {
    const list = (info['version3.0'] as Record<string, unknown>).surfaces
    if (Array.isArray(list)) {
      for (const s of list) if (isObj(s) && s.name) surfaces.push(String(s.name))
    }
  }

  return { fields, unknownTypes: [...unknown], surfaces, usedFallback }
}

// ─── Abgleich gegen das Schema ─────────────────────────────────────────────

/**
 * Ordnet die Anpassungsfelder den Schema-Feldern zu und gibt dasselbe
 * `ParseResult` zurück, das auch der Etsy-Pfad liefert.
 *
 * Abgeglichen wird in dieser Reihenfolge:
 *   1. Amazons interner Feldname (`name`) — kurz, vom Verkäufer vergeben,
 *      überlebt eine Überarbeitung der Kundenansicht
 *   2. die Käufer-Beschriftung (`label`)
 *   3. die Elemente des Pfads, von innen nach außen
 *
 * Bewusst KEIN Umweg über einen „Beschriftung: Wert"-Text: der würde Werte
 * mit ` - ` zerlegen, gleichnamige Felder zusammenfallen lassen und die
 * Bindung von Schrift und Farbe an ihren Textblock verlieren.
 */
export function matchAmazonFields(
  fields: FlatField[],
  schema: PersonalizationSchema,
): ParseResult {
  const parsed: Record<string, string> = {}
  const matchedAs: Record<string, { label: string; mode: 'labelled' | 'positional' }> = {}
  const unmatched: string[] = []

  // Schrift, Farbe und Bilder gehören ins Rendern, nicht in die Textprüfung.
  const matchable = fields.filter((f) => f.kind === 'text' || f.kind === 'option')

  for (const field of matchable) {
    const candidates = [field.name, field.label, ...[...field.path].reverse()]
    let hit = null
    let via = ''
    for (const candidate of candidates) {
      if (!candidate) continue
      const found = findFieldForLabel(schema, candidate)
      if (found) {
        hit = found
        via = candidate
        break
      }
    }

    if (!hit) {
      unmatched.push(`${field.label || field.name}: ${field.value}`)
      continue
    }
    if (parsed[hit.key] !== undefined) {
      // Zwei Anpassungsfelder zeigen auf dasselbe Schema-Feld. Das erste
      // gewinnt, das zweite bleibt sichtbar statt still zu verschwinden.
      unmatched.push(`${field.label || field.name}: ${field.value}`)
      continue
    }
    parsed[hit.key] = field.value
    matchedAs[hit.key] = { label: via, mode: 'labelled' }
  }

  return finalizeParse(parsed, matchedAs, unmatched, schema)
}

// ─── Gestaltung je Textblock ───────────────────────────────────────────────

export interface DesignHint {
  groupKey: string
  fontFamily: string | null
  fontUrl: string | null
  colorName: string | null
  colorHex: string | null
  /** Schema-Keys der Textfelder, die zu diesem Block gehören. */
  textKeys: string[]
}

/**
 * Sammelt Schrift und Farbe je Textblock ein, samt der Schema-Keys der
 * Texte, die darin stehen. Damit weiß der Render später, dass etwa der
 * Titel in „adelia" schwarz und die Namen in „Caviar Dreams" grau gesetzt
 * werden sollen — und verwechselt die beiden nicht.
 */
export function extractDesignHints(
  fields: FlatField[],
  result: ParseResult,
): DesignHint[] {
  const groups = new Map<string, DesignHint>()
  const ensure = (key: string): DesignHint => {
    let g = groups.get(key)
    if (!g) {
      g = { groupKey: key, fontFamily: null, fontUrl: null, colorName: null, colorHex: null, textKeys: [] }
      groups.set(key, g)
    }
    return g
  }

  for (const f of fields) {
    if (f.kind === 'font') {
      const g = ensure(f.groupKey)
      g.fontFamily ??= f.value
      g.fontUrl ??= f.meta?.fontUrl ?? null
    } else if (f.kind === 'color') {
      const g = ensure(f.groupKey)
      g.colorName ??= f.value
      g.colorHex ??= f.meta?.hex ?? null
    }
  }

  // Textfelder ihren Blöcken zuordnen, über den Wert zurückgesucht.
  for (const [key, value] of Object.entries(result.parsed)) {
    const match = fields.find(
      (f) => (f.kind === 'text' || f.kind === 'option') && f.value === value,
    )
    if (match && groups.has(match.groupKey)) {
      groups.get(match.groupKey)!.textKeys.push(key)
    }
  }

  return [...groups.values()]
}
