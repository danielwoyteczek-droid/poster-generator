'use client'

/**
 * PROJ-31: Pflegemaske für die Feldzuordnung Amazon-Anpassungsfeld →
 * Textblock des Presets.
 *
 * Bis hierher war die Zuordnung nur als JSON pflegbar. Das ist für den Fall
 * gedacht, dass wirklich etwas Ungewöhnliches eingestellt werden muss —
 * nicht für den Normalfall „welches Feld füllt welche Zeile".
 *
 * Deshalb wählt der Betreiber hier den Textblock an dem Text aus, den er auf
 * dem Poster sieht („Wo alles begann…"), nicht an seiner Kennung
 * (`block-1789496636322`).
 *
 * Bearbeitet wird derselbe Entwurf wie im JSON-Feld darunter: Diese Maske
 * schreibt in denselben String zurück, damit beide Ansichten nie
 * auseinanderlaufen und ein Speichern beides festschreibt.
 */

import { useMemo } from 'react'
import { AlertTriangle, ArrowRight, Wand2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  blockLabel, suggestTargets, RESERVED_NON_TEXT_KEYS, type PresetBlock,
} from '@/lib/amazon/field-mapping'

/**
 * Die Form, in der ein Schemafeld hier bearbeitet wird. Bewusst offen:
 * `fallbacks`, `regex` und Verwandte werden nicht angefasst, müssen aber
 * unverändert erhalten bleiben, wenn diese Maske zurückschreibt.
 */
export interface DraftField {
  key: string
  label: string
  target?: string
  whenEmpty?: 'preset' | 'auto' | 'leer'
  [rest: string]: unknown
}

/** Wohin die Felder gehen, die keinen Textblock befüllen. */
const RESERVED_TARGET_LABEL: Record<string, string> = {
  location: 'Kartenmitte (über die Ortssuche)',
  coords: 'Kartenmitte (exakte Koordinaten)',
  format: 'Postergröße',
  frame: 'Rahmen',
}

const WHEN_EMPTY_LABEL: Record<'preset' | 'auto' | 'leer', string> = {
  preset: 'Preset-Text behalten',
  auto: 'Automatisch füllen',
  leer: 'Leer lassen',
}

const NO_TARGET = '__none__'

export function parseDraftFields(json: string): DraftField[] | null {
  try {
    const value = JSON.parse(json)
    if (!Array.isArray(value)) return null
    if (!value.every((f) => f && typeof f === 'object' && typeof f.key === 'string')) return null
    return value as DraftField[]
  } catch {
    return null
  }
}

/** Textfelder ohne gepflegtes Ziel — die füllen nichts und blockieren die Bestellung. */
export function countUnmapped(fields: DraftField[]): number {
  return fields.filter((f) => !RESERVED_NON_TEXT_KEYS.has(f.key) && !f.target).length
}

interface Props {
  /** Der aktuelle Entwurf als JSON — dieselbe Quelle wie das Textfeld darunter. */
  draft: string
  onChange: (nextJson: string) => void
  /** Textblöcke des zugeordneten Presets. Leer, solange keines gewählt ist. */
  blocks: PresetBlock[]
  presetName: string | null
  disabled?: boolean
}

export function AdminAmazonSkuMapping({ draft, onChange, blocks, presetName, disabled }: Props) {
  const fields = useMemo(() => parseDraftFields(draft), [draft])
  const blockIds = useMemo(() => new Set(blocks.map((b) => b.id)), [blocks])

  if (!fields) {
    return (
      <p className="text-sm text-muted-foreground">
        Der Entwurf unten ist gerade kein gültiges Schema — die Zuordnung lässt sich erst
        wieder bearbeiten, wenn das JSON stimmt.
      </p>
    )
  }

  if (!presetName) {
    return (
      <p className="text-sm text-muted-foreground">
        Erst ein Design zuordnen — danach stehen dessen Textblöcke hier zur Auswahl.
      </p>
    )
  }

  const update = (key: string, patch: Partial<DraftField>) => {
    const next = fields.map((f) => (f.key === key ? { ...f, ...patch } : f))
    // JSON.stringify lässt `undefined` weg — so entfernt ein zurückgesetztes
    // Ziel den Schlüssel, statt `"target": null` zu hinterlassen.
    onChange(JSON.stringify(next, null, 2))
  }

  const vorschlaege = suggestTargets(fields, blocks)

  /**
   * Füllt nur die leeren Ziele. Der Entwurf ist danach ungespeichert — erst
   * „Schema speichern" macht ihn verbindlich. Genau so soll es sein: Ein
   * Vorschlag, den niemand bestätigt hat, darf keine Bestellung befüllen.
   */
  const vorschlagEinsetzen = () => {
    const byKey = new Map(vorschlaege.map((v) => [v.key, v]))
    const next = fields.map((f) => {
      const v = byKey.get(f.key)
      return v ? { ...f, target: v.target, whenEmpty: v.whenEmpty } : f
    })
    onChange(JSON.stringify(next, null, 2))
  }

  const textFelder = fields.filter((f) => !RESERVED_NON_TEXT_KEYS.has(f.key))
  const sonstige = fields.filter((f) => RESERVED_NON_TEXT_KEYS.has(f.key))

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">Feldzuordnung</p>
          <p className="text-xs text-muted-foreground mt-1">
            Welches Amazon-Feld welche Textzeile von <span className="font-medium">{presetName}</span>{' '}
            befüllt. Ein Feld ohne Ziel befüllt nichts und schickt die Bestellung in die Prüfung —
            es wird nicht ersatzweise der Reihe nach verteilt.
          </p>
        </div>
        {vorschlaege.length > 0 && (
          <Button
            variant="outline" size="sm" disabled={disabled}
            onClick={vorschlagEinsetzen}
            className="shrink-0"
          >
            <Wand2 className="w-4 h-4 mr-2" />
            {vorschlaege.length} Vorschlag/Vorschläge einsetzen
          </Button>
        )}
      </div>

      {/* Kopfzeile nur ab sm — auf dem Telefon stapeln die Zeilen. */}
      <div className="hidden sm:grid sm:grid-cols-[1fr_auto_1fr_1fr] sm:gap-3 text-xs text-muted-foreground">
        <span>Amazon-Feld</span>
        <span />
        <span>Textblock im Design</span>
        <span>Wenn der Käufer es leer lässt</span>
      </div>

      <div className="space-y-3">
        {textFelder.map((f) => {
          const verwaist = Boolean(f.target) && !blockIds.has(f.target as string)
          return (
            <div
              key={f.key}
              className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto_1fr_1fr] sm:items-center sm:gap-3"
            >
              <div className="min-w-0">
                <div className="text-sm text-foreground truncate" title={f.label}>{f.label}</div>
                <code className="text-xs text-muted-foreground">{f.key}</code>
              </div>

              <ArrowRight className="hidden sm:block w-4 h-4 text-muted-foreground shrink-0" />

              <Select
                value={f.target ?? NO_TARGET}
                disabled={disabled}
                onValueChange={(v) => update(f.key, { target: v === NO_TARGET ? undefined : v })}
              >
                <SelectTrigger className={`w-full ${!f.target || verwaist ? 'border-amber-400' : ''}`}>
                  <SelectValue placeholder="Textblock wählen …" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_TARGET}>
                    <span className="text-muted-foreground">— nicht zugeordnet —</span>
                  </SelectItem>
                  {blocks.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {blockLabel(b)}
                      {b.isCoordinates && (
                        <span className="text-muted-foreground"> · automatisch</span>
                      )}
                    </SelectItem>
                  ))}
                  {/* Ein Ziel, das es im Preset nicht mehr gibt, muss sichtbar
                      bleiben — sonst sähe die Zeile aus wie „nie gepflegt". */}
                  {verwaist && (
                    <SelectItem value={f.target as string}>
                      <span className="text-destructive">{f.target} (fehlt im Design)</span>
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>

              <Select
                value={f.whenEmpty ?? 'preset'}
                disabled={disabled || !f.target}
                onValueChange={(v) => update(f.key, { whenEmpty: v as DraftField['whenEmpty'] })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(['preset', 'auto', 'leer'] as const).map((v) => (
                    <SelectItem key={v} value={v}>{WHEN_EMPTY_LABEL[v]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )
        })}
      </div>

      {sonstige.length > 0 && (
        <div className="pt-1 space-y-1">
          {sonstige.map((f) => (
            <div key={f.key} className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="truncate" title={f.label}>{f.label}</span>
              <ArrowRight className="w-3 h-3 shrink-0" />
              <span>{RESERVED_TARGET_LABEL[f.key] ?? f.key}</span>
            </div>
          ))}
        </div>
      )}

      {vorschlaege.some((v) => v.reason === 'reihenfolge') && (
        <p className="text-xs text-muted-foreground">
          Für {vorschlaege.filter((v) => v.reason === 'reihenfolge').length} Feld(er) gibt es
          keinen Anhaltspunkt in den Beschriftungen — ein Vorschlag dafür wäre nur die
          Reihenfolge. Bitte nachsehen, bevor du speicherst.
        </p>
      )}

      {countUnmapped(fields) > 0 && (
        <div className="flex items-start gap-2 text-xs text-amber-700 dark:text-amber-400">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-px" />
          <span>
            {countUnmapped(fields)} Textfeld(er) ohne Ziel. Bestellungen dieser SKU landen in der
            Prüfung, bis jedes davon zugeordnet ist.
          </span>
        </div>
      )}
    </div>
  )
}
