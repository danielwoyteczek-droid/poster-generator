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

/**
 * Das Wenige, das diese Brücke von einem Schemafeld wissen muss. Absichtlich
 * schmaler als `PersonalizationField`: So kann auch die Pflegemaske ihren
 * noch nicht durch Zod gelaufenen Entwurf hier durchschicken.
 */
export interface MappableField {
  key: string
  label: string
  target?: string
  whenEmpty?: 'preset' | 'auto' | 'leer'
}

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
export function textFields<T extends MappableField>(schema: readonly T[]): T[] {
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

/**
 * Wie ein Textblock in der Pflegemaske heißen soll. Der Betreiber wählt,
 * was er auf dem Poster sieht — `block-1789496636322` sagt ihm nichts.
 */
export function blockLabel(b: PresetBlock): string {
  const text = b.text.replace(/\s+/g, ' ').trim()
  if (text) return text.length > 40 ? `${text.slice(0, 40)}…` : text
  if (b.isCoordinates) return b.label ?? 'Ort & Koordinaten (automatisch)'
  return b.label ?? b.id
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
  schema: readonly MappableField[],
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
  schema: readonly MappableField[],
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

// ─── Vorschlag beim ersten Auftreten einer SKU ─────────────────────────────

export interface TargetSuggestion {
  key: string
  target: string
  whenEmpty: 'preset' | 'auto' | 'leer'
  /** Woher der Vorschlag kommt — damit der Betreiber weiß, wie belastbar er ist. */
  reason: 'koordinaten' | 'beschriftung' | 'reihenfolge'
}

/** Für den Vergleich zweier Beschriftungen: alles weg, was nur Schreibweise ist. */
function normalizeLabel(value: string): string {
  return value
    .toLowerCase()
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]/g, '')
}

/**
 * Schlägt für jedes noch nicht zugeordnete Textfeld einen Block vor.
 *
 * Bewusst nur ein Vorschlag: Er wird nirgends selbsttätig gespeichert. Ein
 * unbestätigter Vorschlag zählt weiter als ungepflegt, und die Bestellung
 * geht in die Prüfung — sonst winkt man einen falschen Treffer durch und
 * merkt es erst am gedruckten Poster.
 *
 * Drei Stufen, absteigend belastbar:
 *  1. Spricht das Feld von Koordinaten, bekommt es den Koordinatenblock.
 *  2. Beschriftungen, die einander enthalten, gehören zusammen.
 *  3. Was übrig bleibt, wird der Reihe nach verteilt — das ist geraten und
 *     wird als solches ausgewiesen.
 */
export function suggestTargets(
  schema: readonly MappableField[],
  blocks: PresetBlock[],
): TargetSuggestion[] {
  const offeneFelder = textFields(schema).filter((f) => !f.target)
  const belegt = new Set(textFields(schema).map((f) => f.target).filter(Boolean) as string[])
  const frei = () => blocks.filter((b) => !belegt.has(b.id))

  const suggestions: TargetSuggestion[] = []
  const nochOffen: MappableField[] = []

  // 1. Koordinaten erkennen — das ist der einzige Fall, in dem die Bedeutung
  //    des Blocks über seinen Typ eindeutig feststeht.
  for (const f of offeneFelder) {
    const spricht = /koordinat/i.test(f.label) || /koordinat|coords/i.test(f.key)
    const block = spricht ? frei().find((b) => b.isCoordinates) : undefined
    if (block) {
      belegt.add(block.id)
      suggestions.push({ key: f.key, target: block.id, whenEmpty: 'auto', reason: 'koordinaten' })
    } else {
      nochOffen.push(f)
    }
  }

  // 2. Beschriftungen vergleichen.
  const restlich: MappableField[] = []
  for (const f of nochOffen) {
    const feld = normalizeLabel(f.label)
    const block = feld.length >= 3
      ? frei().find((b) => {
          const kandidat = normalizeLabel(b.label ?? '') || normalizeLabel(b.text)
          return kandidat.length >= 3 && (kandidat.includes(feld) || feld.includes(kandidat))
        })
      : undefined
    if (block) {
      belegt.add(block.id)
      suggestions.push({
        key: f.key,
        target: block.id,
        whenEmpty: block.isCoordinates ? 'auto' : 'preset',
        reason: 'beschriftung',
      })
    } else {
      restlich.push(f)
    }
  }

  // 3. Der Rest der Reihe nach — geraten, und so ausgewiesen.
  for (const f of restlich) {
    const block = frei()[0]
    if (!block) break
    belegt.add(block.id)
    suggestions.push({
      key: f.key,
      target: block.id,
      whenEmpty: block.isCoordinates ? 'auto' : 'preset',
      reason: 'reihenfolge',
    })
  }

  return suggestions
}
