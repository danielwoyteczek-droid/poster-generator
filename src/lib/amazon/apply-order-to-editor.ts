/**
 * PROJ-31: Eine importierte Bestellung in den Editor-Zustand übersetzen.
 *
 * Hier liegt sie einmal, weil zwei Stellen sie brauchen: der Editor, in dem
 * der Betreiber nachbessert (`AmazonOrderApplier`), und die Vorschau in der
 * Prüf-Queue (`AmazonOrderPreview`). Zwei Kopien würden auseinanderlaufen,
 * und dann zeigte die Vorschau etwas anderes als der Editor — genau das
 * Vertrauen, auf dem die Prüfung beruht, wäre dahin.
 *
 * Bewusst ohne Meldungen an den Benutzer: Was passiert ist, kommt als
 * Rückgabewert zurück. Der Editor macht daraus einen Hinweis, die Vorschau
 * eine Zeile unter dem Bild.
 */

import { applyPreset } from '@/lib/apply-preset'
import { useEditorStore, type TextBlock } from '@/hooks/useEditorStore'
import { invalidateCustomMasksCache } from '@/hooks/useCustomMasks'
import type { PrintFormat } from '@/lib/print-formats'
import type { EditorPayload } from '@/app/api/admin/amazon/orders/[id]/editor/route'

const VALID_FORMATS: ReadonlySet<string> = new Set(['a4', 'a3', 'a2'])

export type ApplyOrderResult =
  /** Der SKU ist kein Design zugeordnet — es gibt nichts anzuwenden. */
  | { mode: 'kein_preset' }
  /** Eine frühere Handkorrektur wurde geladen, nicht die Automatik. */
  | { mode: 'gespeichert'; orphans: number }
  /** Preset als Grundlage, Käuferangaben darüber. */
  | { mode: 'automatisch'; orphans: number }

/**
 * Legt die Bestellung in den Editor-Store.
 *
 * Wurde die Bestellung schon einmal von Hand angepasst, gewinnt der
 * gespeicherte Zustand: eine Handkorrektur soll nicht bei jedem Öffnen
 * wieder von der Automatik überschrieben werden.
 */
export function applyOrderToEditor(data: EditorPayload): ApplyOrderResult {
  if (!data.preset) return { mode: 'kein_preset' }

  invalidateCustomMasksCache()

  if (data.editor_state) {
    const state = data.editor_state as Record<string, unknown>
    applyPreset({ poster_type: 'map', config_json: state }, { mode: 'full' })
    applyStoredExtras(state)
    return { mode: 'gespeichert', orphans: 0 }
  }

  applyPreset(
    { poster_type: 'map', config_json: (data.preset.config_json ?? {}) as Record<string, unknown> },
    { mode: 'full' },
  )
  return { mode: 'automatisch', orphans: applyOverlay(data) }
}

/**
 * Den offenen Kartenauftrag selbst ausführen — für Aufrufer ohne Karte.
 *
 * `applyPreset` und `applyOverlay` schreiben die Zielposition nach
 * `pendingCenter`. Das ist ein Auftrag an die Karte: Im Editor liest MapLibre
 * ihn, fährt dorthin und schreibt das Ergebnis nach `viewState`.
 *
 * Die Vorschau hat keine Karte. Dort bliebe `viewState` auf dem Stand des
 * Presets stehen — und genau daraus baut `renderPreview()` sein Bild, also
 * zeigte die Vorschau den Ort des Presets statt den der Bestellung. Deshalb
 * hier dasselbe, was der Headless-Render von PROJ-30 tut: den Auftrag direkt
 * in `viewState` schreiben und ihn abräumen.
 *
 * Nicht aus dem Editor aufrufen — dort gehört das Fahren der Karte.
 */
export function commitPendingCenter(): void {
  const pending = useEditorStore.getState().pendingCenter
  if (!pending) return
  useEditorStore.setState((s) => ({
    viewState: {
      ...s.viewState,
      lat: pending.lat,
      lng: pending.lng,
      zoom: pending.zoom,
    },
    pendingCenter: null,
  }))
}

/** Felder, die `applyPreset` nicht anfasst, aus einem gespeicherten Zustand holen. */
function applyStoredExtras(state: Record<string, unknown>) {
  const store = useEditorStore.getState()
  const fmt = state.printFormat
  if (typeof fmt === 'string' && VALID_FORMATS.has(fmt)) {
    store.setPrintFormat(fmt as PrintFormat)
  }
  const view = state.viewState as { lat?: number; lng?: number; zoom?: number } | undefined
  if (view && typeof view.lat === 'number' && typeof view.lng === 'number') {
    useEditorStore.setState((s) => ({
      // Fehlt der Zoom im gespeicherten Zustand, den aktuellen behalten —
      // lieber der bisherige Ausschnitt als ein Sprung auf Weltansicht.
      pendingCenter: {
        lat: view.lat!,
        lng: view.lng!,
        zoom: typeof view.zoom === 'number' ? view.zoom : s.viewState.zoom,
      },
    }))
  }
}

/**
 * Legt die Angaben des Käufers über das Preset.
 *
 * Jeder Text geht auf den Textblock, der für sein Anpassungsfeld hinterlegt
 * ist — adressiert über die Blockkennung, nicht über die Reihenfolge. Welches
 * Feld welchen Block befüllt, steht je SKU in der Zuordnungstabelle; die
 * Editor-Route hat daraus bereits fertige Anweisungen gemacht.
 *
 * Ein Feld ohne gepflegtes Ziel befüllt nichts. Der frühere Rückfall, Texte
 * einfach der Reihe nach zu verteilen, hat still den falschen Block getroffen.
 *
 * Rückgabe: wie viele Anweisungen auf einen Block zeigten, den dieses Design
 * nicht hat. Sollte nicht vorkommen — die Route prüft die Ziele gegen
 * dasselbe Preset — aber lieber laut als ein Text, der spurlos verschwindet.
 */
function applyOverlay(data: EditorPayload): number {
  const { overlay } = data
  const store = useEditorStore.getState()

  if (overlay.printFormat && VALID_FORMATS.has(overlay.printFormat)) {
    store.setPrintFormat(overlay.printFormat as PrintFormat)
  }

  if (typeof overlay.lat === 'number' && typeof overlay.lng === 'number') {
    useEditorStore.setState((s) => ({
      // Zoom aus dem Preset, nicht aus `viewState`: `applyPreset` lief
      // unmittelbar davor und hat den Preset-Zoom nach `pendingCenter`
      // geschrieben. Die Karte hatte noch keine Gelegenheit, ihn zu lesen —
      // beide Aufrufe laufen synchron hintereinander. Griffen wir hier auf
      // `viewState.zoom` zurück, wäre das der Zoom von vorher und der
      // Preset-Ausschnitt verloren.
      pendingCenter: {
        lat: overlay.lat!,
        lng: overlay.lng!,
        zoom: s.pendingCenter?.zoom ?? s.viewState.zoom,
      },
      locationName: overlay.locationName ?? s.locationName,
      marker: { ...s.marker, lat: overlay.lat!, lng: overlay.lng!, enabled: true },
    }))
  } else if (overlay.locationName) {
    useEditorStore.setState({ locationName: overlay.locationName })
  }

  if (overlay.blocks.length === 0) return 0

  useEditorStore.setState((s) => {
    const next: TextBlock[] = s.textBlocks.map((b) => {
      const action = overlay.blocks.find((a) => a.target === b.id)
      if (!action) return b

      if (action.kind === 'leer') {
        // Auch die automatische Beschriftung abschalten, sonst füllt der
        // Renderer den Block gleich wieder.
        return { ...b, text: '', isCoordinates: false }
      }

      if (action.kind === 'auto') {
        // Ein Koordinatenblock bleibt einer — der Renderer setzt Stadt und
        // Koordinaten aus der Kartenmitte. Ein normaler Block bekommt den
        // aufgelösten Ortsnamen.
        return b.isCoordinates ? b : { ...b, text: overlay.locationName ?? b.text }
      }

      // Freitext des Käufers. Auf einem Koordinatenblock schaltet er die
      // automatische Beschriftung ab — dieselbe Regel, die der Editor
      // anwendet, wenn ein Mensch dort hineintippt.
      return {
        ...b,
        text: action.value,
        isCoordinates: false,
        ...(action.fontFamily ? { fontFamily: action.fontFamily } : {}),
        ...(action.color ? { color: action.color } : {}),
      }
    })
    return { textBlocks: next }
  })

  const vorhanden = new Set(useEditorStore.getState().textBlocks.map((b) => b.id))
  return overlay.blocks.filter((a) => !vorhanden.has(a.target)).length
}
