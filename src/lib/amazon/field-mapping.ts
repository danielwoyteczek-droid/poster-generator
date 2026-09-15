/**
 * PROJ-31: Die Brücke zwischen einem Amazon-Anpassungsfeld und einem
 * Textblock des Presets.
 *
 * Bis hierher steht fest, WAS der Käufer eingegeben hat (`sku-schema.ts`
 * bildet Amazons Feldnamen auf interne Schlüssel ab). Offen ist, WOHIN das
 * gehört: jedes Design hat eigene Textblöcke, und dieselbe Beschriftung
 * bedeutet in zwei Presets nicht denselben Platz.
 *
 * Die Zuordnung liegt deshalb in den Daten, nicht im Code — als `target`
 * und `whenEmpty` an jedem Schemafeld, gepflegt je SKU. Ein Textfeld ohne
 * Ziel wird NICHT ersatzweise der Reihe nach verteilt; es schickt die
 * Position in die Prüfung. Genau das Durchzählen hat vorher still den
 * falschen Block befüllt.
 *
 * Reine Funktionen, keine Datenbank — damit sie prüfbar bleiben und die
 * Auswertung (`resolve.ts`) und die Editor-Route dieselbe Wahrheit lesen.
 */

import type { PersonalizationSchema, PersonalizationField } from '@/lib/etsy/personalization-parser'

/**
 * Schlüssel, die keinen Textblock befüllen: Sie bestimmen Kartenmitte,
 * Postergröße und Rahmen. Für sie ist ein fehlendes `target` kein Mangel.
 */
export const RESERVED_NON_TEXT_KEYS: ReadonlySet<string> = new Set([
  'location',
  'coords',
  'format',
  'frame',
])

/** Die Schemafelder, die einen Textblock des Presets befüllen sollen. */
export function textFields(schema: PersonalizationSchema): PersonalizationField[] {
  return schema.filter((f) => !RESERVED_NON_TEXT_KEYS.has(f.key))
}

/** Ein Textblock des Presets, so weit die Zuordnung ihn kennen muss. */
export interface PresetBlock {
  id: string
  isCoordinates: boolean
  /** Der im Preset hinterlegte Text — die Beschriftung in der Pflegemaske. */
  text: string
  label: string | null
}

/**
 * Liest die Textblöcke aus `presets.config_json`. Gibt eine leere Liste
 * zurück, wenn die Form nicht stimmt — der Aufrufer meldet das als
 * fehlende Zuordnung, statt an einem unerwarteten Preset abzustürzen.
 */
export function readPresetBlocks(configJson: unknown): PresetBlock[] {
  const blocks = (configJson as { textBlocks?: unknown })?.textBlocks
  if (!Array.isArray(blocks)) return []
  const out: PresetBlock[] = []
  for (const raw of blocks) {
    if (!raw || typeof raw !== 'object') continue
    const b = raw as Record<string, unknown>
    if (typeof b.id !== 'string' || b.id.length === 0) continue
    out.push({
      id: b.id,
      isCoordinates: b.isCoordinates === true,
      text: typeof b.text === 'string' ? b.text : '',
      label: typeof b.label === 'string' ? b.label : null,
    })
  }
  return out
}

export interface MappingProblem {
  key: string
  /** Die Beschriftung, die der Betreiber bei Amazon sieht. */
  label: string
  kind: 'ohne_ziel' | 'ziel_fehlt'
  /** Bei `ziel_fehlt`: die Blockkennung, die es nicht mehr gibt. */
  target?: string
}

/**
 * Prüft die Zuordnung eines Schemas gegen die Blöcke eines Presets.
 *
 * Zwei Mängel sind möglich, und beide müssen die Position in die Prüfung
 * schicken statt sie stillschweigend falsch zu befüllen:
 *
 *  - `ohne_ziel`  — für dieses Textfeld ist nie eine Zuordnung gepflegt worden
 *  - `ziel_fehlt` — die Zuordnung zeigt auf einen Block, den das Preset
 *                   nicht mehr enthält (jemand hat das Preset geändert)
 */
export function checkMapping(
  schema: PersonalizationSchema,
  blocks: PresetBlock[],
): MappingProblem[] {
  const ids = new Set(blocks.map((b) => b.id))
  const problems: MappingProblem[] = []
  for (const f of textFields(schema)) {
    if (!f.target) {
      problems.push({ key: f.key, label: f.label, kind: 'ohne_ziel' })
    } else if (!ids.has(f.target)) {
      problems.push({ key: f.key, label: f.label, kind: 'ziel_fehlt', target: f.target })
    }
  }
  return problems
}

/** Was mit einem Textblock geschehen soll. Blöcke ohne Eintrag bleiben unberührt. */
export type BlockAction =
  /** Freitext des Käufers. Auf einem Koordinatenblock schaltet er ihn ab. */
  | { kind: 'text'; target: string; value: string; fontFamily: string | null; color: string | null }
  /** Aus der Bestellung ableiten: Koordinatenblock bleibt automatisch, sonst der Ortsname. */
  | { kind: 'auto'; target: string }
  /** Block leeren. */
  | { kind: 'leer'; target: string }

export interface DesignHint {
  fontFamily: string | null
  colorHex: string | null
  textKeys: string[]
}

/**
 * Übersetzt die Eingaben des Käufers in Anweisungen auf die Blöcke des
 * Presets.
 *
 * Felder ohne Ziel kommen hier nicht vor — sie sind über `checkMapping`
 * bereits als Mangel gemeldet und dürfen nichts befüllen.
 */
export function planBlockActions(
  schema: PersonalizationSchema,
  parsed: Record<string, string | undefined>,
  blocks: PresetBlock[],
  hints: DesignHint[],
): BlockAction[] {
  const byId = new Map(blocks.map((b) => [b.id, b]))
  const actions: BlockAction[] = []

  for (const f of textFields(schema)) {
    if (!f.target || !byId.has(f.target)) continue

    const value = (parsed[f.key] ?? '').trim()
    if (value.length > 0) {
      const hint = hints.find((h) => h.textKeys.includes(f.key))
      actions.push({
        kind: 'text',
        target: f.target,
        value,
        fontFamily: hint?.fontFamily ?? null,
        color: hint?.colorHex ?? null,
      })
      continue
    }

    // Leer gelassen — die gepflegte Regel entscheidet.
    if (f.whenEmpty === 'auto') actions.push({ kind: 'auto', target: f.target })
    else if (f.whenEmpty === 'leer') actions.push({ kind: 'leer', target: f.target })
    // 'preset': nichts tun, der Preset-Text bleibt stehen.
  }

  return actions
}
