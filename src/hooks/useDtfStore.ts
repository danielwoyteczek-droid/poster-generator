import { create } from 'zustand'
import {
  DTF_DEFAULT_SHEET_FORMAT,
  DTF_MAX_ELEMENTS_PER_SHEET,
  DTF_MIN_ELEMENT_WIDTH_MM,
  DTF_SHEET_FORMATS,
  DTF_SHEET_MARGIN_MM,
  effectiveDpi,
  type DtfSheetFormat,
} from '@/lib/dtf-constants'

/**
 * PROJ-55: Zustand des DTF-Editors.
 *
 * Maße stehen in **Millimetern**, nicht als Anteil des Bogens. Das weicht
 * bewusst vom Tech Design ab, das Bruchteile vorsah, damit ein
 * Formatwechsel nichts zerstört.
 *
 * Für Poster sind Bruchteile richtig: Ein Textblock soll auf A3 genauso
 * proportioniert sitzen wie auf A4. Für DTF ist es genau andersherum — wer
 * ein Logo auf 10 cm Breite zieht, will 10 cm gedruckt bekommen. Wechselt
 * er von A4 auf A3, darf das Logo nicht auf 14 cm mitwachsen; er will mehr
 * Platz, nicht ein größeres Motiv. Millimeter sind hier also nicht nur
 * bequemer, sie sind die fachlich korrekte Einheit: Sie treiben die
 * cm-Anzeige, die dpi-Warnung und am Ende die Druckdatei.
 *
 * Beim Verkleinern des Formats können Motive dadurch außerhalb landen.
 * `clampElementToSheet` holt sie zurück und verkleinert sie nötigenfalls,
 * damit der Formatwechsel nicht der eine Weg bleibt, auf dem doch etwas
 * über den Rand gerät.
 *
 * Ein Entwurf besteht aus mehreren **Bögen**. Der Kunde gestaltet alle
 * fertig, wechselt frei zwischen ihnen und legt erst am Ende gemeinsam in
 * den Warenkorb.
 */

/** Was Bild- und Textelemente gemeinsam haben. */
interface DtfElementBase {
  id: string
  /** Linke obere Ecke auf dem Bogen, in Millimetern. */
  xMm: number
  yMm: number
  /** Gedruckte Breite in Millimetern. */
  widthMm: number
  rotationDeg: number
  /** Stapelreihenfolge; höher liegt oben. */
  z: number
}

export interface DtfImageElement extends DtfElementBase {
  kind: 'image'
  /** Verweis auf die Zeile in `dtf_uploads`. */
  uploadId: string
  /** Signierte URL der Vorschau. Das Original fasst der Editor nie an. */
  previewUrl: string
  /** Pixelmaße des ORIGINALS — Grundlage der dpi-Berechnung. */
  sourceWidthPx: number
  sourceHeightPx: number
}

/**
 * Textelement. Eigenschaften bewusst identisch zum `TextBlock` der anderen
 * Editoren, damit sich die Bedienung gleich anfühlt — nur die Größe steht
 * in Millimetern statt als Bruchteil der Posterbreite, wie alles hier.
 *
 * Die Höhe wird gemessen, nicht gerechnet: Sie hängt von Schrift, Zeilenzahl
 * und Umbruch ab. Der Editor schreibt den gemessenen Wert zurück.
 */
export interface DtfTextElement extends DtfElementBase {
  kind: 'text'
  text: string
  fontFamily: string
  /** Schriftgröße in Millimetern — bei 10 mm ist ein Versal rund 7 mm hoch. */
  fontSizeMm: number
  color: string
  align: 'left' | 'center' | 'right'
  bold: boolean
  uppercase: boolean
  /** Laufweite als Vielfaches der Schriftgröße, wie bei den Textblöcken. */
  letterSpacingEm: number
  /** Gemessene Höhe in Millimetern. Vom Editor gesetzt. */
  heightMm: number
}

export type DtfElement = DtfImageElement | DtfTextElement

export function isImageElement(el: DtfElement): el is DtfImageElement {
  return el.kind === 'image'
}
export function isTextElement(el: DtfElement): el is DtfTextElement {
  return el.kind === 'text'
}

/** Ein hochgeladenes Motiv in der Ablage, noch nicht zwingend platziert. */
export interface DtfMotif {
  id: string
  filename: string | null
  mimeType: string
  widthPx: number
  heightPx: number
  previewUrl: string | null
}

/**
 * Ein Transferbogen. Format und Auflage gehören zum einzelnen Bogen, nicht
 * zum Entwurf — Bogen 1 kann A4 in dreifacher Auflage sein, Bogen 2 A3 als
 * Einzelstück.
 */
export interface DtfSheet {
  id: string
  format: DtfSheetFormat
  /** Auflage: wie oft dieser Bogen gedruckt wird. */
  quantity: number
  elements: DtfElement[]
}

interface DtfState {
  /**
   * Alle Bögen des Entwurfs. Der Kunde gestaltet sie fertig und legt erst
   * am Ende alles gemeinsam in den Warenkorb.
   *
   * Die Alternative — jeden Bogen einzeln ablegen und mit leerer Fläche
   * weitermachen — wäre einfacher gewesen, hätte aber einen unangenehmen
   * Haken: Wer Bogen 1 nachträglich ändern will, müsste die Position aus
   * dem Warenkorb löschen und den Bogen neu bauen. So bleibt bis zum
   * Checkout alles änderbar, was auch besser dazu passt, dass die
   * Druckfreigabe ohnehin erst beim Bezahlen erteilt wird.
   */
  sheets: DtfSheet[]
  activeSheetId: string
  /** Ausgewähltes Element auf dem aktiven Bogen. */
  selectedId: string | null
  /** Zentimeterraster und Lineale. Hilft beim Abschätzen von Größen. */
  showGrid: boolean
  /** Motiv-Ablage — gilt für alle Bögen gemeinsam. */
  motifs: DtfMotif[]

  addSheet: () => void
  duplicateSheet: (id: string) => void
  removeSheet: (id: string) => void
  setActiveSheet: (id: string) => void

  setSheetFormat: (format: DtfSheetFormat) => void
  setQuantity: (quantity: number) => void
  setShowGrid: (show: boolean) => void

  setMotifs: (motifs: DtfMotif[]) => void
  addMotif: (motif: DtfMotif) => void
  removeMotif: (id: string) => void

  /** Legt ein Motiv mittig auf den aktiven Bogen. */
  placeMotif: (motif: DtfMotif) => void
  /** Legt ein neues Textelement mittig auf den aktiven Bogen. */
  addTextElement: () => void
  updateElement: (id: string, patch: Partial<Omit<DtfElement, 'id'>>) => void
  duplicateElement: (id: string) => void
  removeElement: (id: string) => void
  select: (id: string | null) => void
  bringToFront: (id: string) => void
  reset: () => void
}

/**
 * Höhe eines Elements. Bei Bildern aus dem Seitenverhältnis des Originals,
 * bei Text aus der gemessenen Höhe — die hängt von Schrift und Umbruch ab
 * und lässt sich nicht rechnen.
 */
export function elementHeightMm(el: DtfElement): number {
  if (isTextElement(el)) return el.heightMm
  if (el.sourceWidthPx <= 0) return el.widthMm
  return (el.widthMm * el.sourceHeightPx) / el.sourceWidthPx
}

/**
 * Effektive Auflösung bei der aktuell eingestellten Druckbreite.
 * Text hat keine — er wird erst beim Ablegen in den Warenkorb mit
 * Druckauflösung gerastert und ist deshalb nie zu grob.
 */
export function elementDpi(el: DtfElement): number | null {
  if (isTextElement(el)) return null
  return effectiveDpi(el.sourceWidthPx, el.widthMm)
}

/**
 * Ragt das Element über den Bogen hinaus? Rechnet mit der
 * achsenparallelen Hüllbox, damit auch gedrehte Motive korrekt erkannt
 * werden — ein um 45° gedrehtes Quadrat braucht deutlich mehr Platz als
 * seine Kantenlänge.
 */
export function isOutsideSheet(el: DtfElement, format: DtfSheetFormat): boolean {
  const sheet = DTF_SHEET_FORMATS[format]
  const { width, height } = boundingBoxMm(el)
  const cx = el.xMm + el.widthMm / 2
  const cy = el.yMm + elementHeightMm(el) / 2
  const left = cx - width / 2
  const top = cy - height / 2
  return left < 0 || top < 0 || left + width > sheet.widthMm || top + height > sheet.heightMm
}

/** Verletzt das Element den Sicherheitsabstand zur Bogenkante? */
export function violatesMargin(el: DtfElement, format: DtfSheetFormat): boolean {
  const sheet = DTF_SHEET_FORMATS[format]
  const m = DTF_SHEET_MARGIN_MM
  const { width, height } = boundingBoxMm(el)
  const cx = el.xMm + el.widthMm / 2
  const cy = el.yMm + elementHeightMm(el) / 2
  const left = cx - width / 2
  const top = cy - height / 2
  return (
    left < m || top < m || left + width > sheet.widthMm - m || top + height > sheet.heightMm - m
  )
}

/** Achsenparallele Hüllbox eines gedrehten Elements. */
export function boundingBoxMm(el: DtfElement): { width: number; height: number } {
  const w = el.widthMm
  const h = elementHeightMm(el)
  const rad = (el.rotationDeg * Math.PI) / 180
  const cos = Math.abs(Math.cos(rad))
  const sin = Math.abs(Math.sin(rad))
  return { width: w * cos + h * sin, height: w * sin + h * cos }
}

/**
 * Zwingt ein Element in den bedruckbaren Bereich — Bogen abzüglich des
 * Sicherheitsabstands von 1 cm an allen vier Kanten.
 *
 * Bewusst hart begrenzt statt nur gewarnt: Ein Motiv, das über den Rand
 * ragt, wird beim Druck abgeschnitten oder trifft den nicht bedruckbaren
 * Rand des Druckers. Da der Kunde die Vorschau verbindlich freigibt, wäre
 * eine Warnung, die man wegklicken kann, die schlechtere Lösung — sie
 * verlagert einen vermeidbaren Fehler auf ihn.
 *
 * Zwei Stufen, in dieser Reihenfolge:
 *  1. Größe deckeln, falls die Hüllbox breiter oder höher als die nutzbare
 *     Fläche wäre. Rechnet mit der GEDREHTEN Hüllbox — ein um 45° gedrehtes
 *     Quadrat braucht rund 1,41-mal seine Kantenlänge.
 *  2. Mittelpunkt so verschieben, dass die Hüllbox vollständig innerhalb
 *     liegt.
 *
 * Der Deckel wirkt auch beim Drehen: Wer ein randfüllendes Motiv dreht,
 * bekommt es automatisch so weit verkleinert, dass es hineinpasst.
 */
export function clampElementToSheet(el: DtfElement, format: DtfSheetFormat): DtfElement {
  const sheet = DTF_SHEET_FORMATS[format]
  const m = DTF_SHEET_MARGIN_MM
  const usableW = Math.max(1, sheet.widthMm - 2 * m)
  const usableH = Math.max(1, sheet.heightMm - 2 * m)

  let next = el

  // 1. Größe deckeln. Die Hüllbox skaliert linear mit widthMm, der
  //    Verkleinerungsfaktor lässt sich deshalb direkt ausrechnen.
  const box = boundingBoxMm(next)
  const overflow = Math.max(box.width / usableW, box.height / usableH)
  if (overflow > 1) {
    const capped = Math.max(DTF_MIN_ELEMENT_WIDTH_MM, next.widthMm / overflow)
    next = { ...next, widthMm: capped }
  }

  // 2. Mittelpunkt in den erlaubten Bereich schieben.
  const finalBox = boundingBoxMm(next)
  const halfW = finalBox.width / 2
  const halfH = finalBox.height / 2

  let cx = next.xMm + next.widthMm / 2
  let cy = next.yMm + elementHeightMm(next) / 2

  cx = Math.min(Math.max(cx, m + halfW), sheet.widthMm - m - halfW)
  cy = Math.min(Math.max(cy, m + halfH), sheet.heightMm - m - halfH)

  return {
    ...next,
    xMm: cx - next.widthMm / 2,
    yMm: cy - elementHeightMm(next) / 2,
  }
}

/** Frischer, leerer Bogen. Erbt das Format des zuletzt bearbeiteten. */
function makeSheet(format: DtfSheetFormat): DtfSheet {
  return { id: crypto.randomUUID(), format, quantity: 1, elements: [] }
}

const FIRST_SHEET = makeSheet(DTF_DEFAULT_SHEET_FORMAT)

/**
 * Kürzt den Zugriff auf den aktiven Bogen ab und schreibt ihn zurück.
 * Alle Element-Operationen laufen darüber, damit an keiner Stelle
 * versehentlich am falschen Bogen gearbeitet wird.
 */
function withActiveSheet(
  state: DtfState,
  fn: (sheet: DtfSheet) => DtfSheet,
): Pick<DtfState, 'sheets'> {
  return {
    sheets: state.sheets.map((s) => (s.id === state.activeSheetId ? fn(s) : s)),
  }
}

/** Der gerade bearbeitete Bogen. */
export function activeSheetOf(state: { sheets: DtfSheet[]; activeSheetId: string }): DtfSheet {
  return state.sheets.find((s) => s.id === state.activeSheetId) ?? state.sheets[0]
}

/** Summe aller gedruckten Bögen über alle Auflagen. */
export function totalPrintedSheets(sheets: DtfSheet[]): number {
  return sheets.reduce((sum, s) => sum + s.quantity, 0)
}

export const useDtfStore = create<DtfState>((set, get) => ({
  sheets: [FIRST_SHEET],
  activeSheetId: FIRST_SHEET.id,
  selectedId: null,
  showGrid: true,
  motifs: [],

  addSheet: () =>
    set((s) => {
      const sheet = makeSheet(activeSheetOf(s).format)
      return { sheets: [...s.sheets, sheet], activeSheetId: sheet.id, selectedId: null }
    }),

  duplicateSheet: (id) =>
    set((s) => {
      const source = s.sheets.find((x) => x.id === id)
      if (!source) return {}
      const copy: DtfSheet = {
        ...source,
        id: crypto.randomUUID(),
        // Elemente brauchen eigene IDs, sonst würde die Auswahl auf dem
        // einen Bogen das gleichnamige Element auf dem anderen treffen.
        elements: source.elements.map((e) => ({ ...e, id: crypto.randomUUID() })),
      }
      const at = s.sheets.findIndex((x) => x.id === id) + 1
      const sheets = [...s.sheets.slice(0, at), copy, ...s.sheets.slice(at)]
      return { sheets, activeSheetId: copy.id, selectedId: null }
    }),

  removeSheet: (id) =>
    set((s) => {
      // Der letzte Bogen bleibt bestehen — ein Entwurf ohne Bogen wäre ein
      // Zustand, aus dem der Kunde nicht mehr herausfindet.
      if (s.sheets.length <= 1) return {}
      const sheets = s.sheets.filter((x) => x.id !== id)
      const activeSheetId = s.activeSheetId === id ? sheets[0].id : s.activeSheetId
      return { sheets, activeSheetId, selectedId: null }
    }),

  setActiveSheet: (activeSheetId) => set({ activeSheetId, selectedId: null }),

  // Formatwechsel zieht die Motive des aktiven Bogens nach: Beim
  // Verkleinern rutschen sie in den neuen bedruckbaren Bereich und werden
  // nötigenfalls verkleinert. Sonst bliebe der Formatwechsel der eine Weg,
  // auf dem ein Motiv doch über den Rand gerät.
  setSheetFormat: (format) =>
    set((s) =>
      withActiveSheet(s, (sheet) => ({
        ...sheet,
        format,
        elements: sheet.elements.map((e) => clampElementToSheet(e, format)),
      })),
    ),

  setQuantity: (quantity) =>
    set((s) =>
      withActiveSheet(s, (sheet) => ({
        ...sheet,
        quantity: Math.max(1, Math.round(quantity)),
      })),
    ),

  setShowGrid: (showGrid) => set({ showGrid }),

  setMotifs: (motifs) => set({ motifs }),

  addMotif: (motif) => set((s) => ({ motifs: [motif, ...s.motifs] })),

  removeMotif: (id) =>
    set((s) => ({
      motifs: s.motifs.filter((m) => m.id !== id),
      // Platzierte Instanzen verschwinden mit — auf ALLEN Bögen, nicht nur
      // dem aktiven. Sonst zeigten andere Bögen Bilder, deren Datei es
      // nicht mehr gibt.
      sheets: s.sheets.map((sheet) => ({
        ...sheet,
        elements: sheet.elements.filter((e) => !(isImageElement(e) && e.uploadId === id)),
      })),
      selectedId: null,
    })),

  placeMotif: (motif) => {
    const state = get()
    const sheet = activeSheetOf(state)
    if (sheet.elements.length >= DTF_MAX_ELEMENTS_PER_SHEET) return
    if (!motif.previewUrl) return

    const def = DTF_SHEET_FORMATS[sheet.format]
    const usableWidth = def.widthMm - 2 * DTF_SHEET_MARGIN_MM
    const usableHeight = def.heightMm - 2 * DTF_SHEET_MARGIN_MM
    const aspect = motif.heightPx / Math.max(1, motif.widthPx)

    // Startgröße: die Hälfte der nutzbaren Breite, aber nie so hoch, dass
    // es schon beim Einfügen über den Bogen ragt.
    let widthMm = usableWidth / 2
    if (widthMm * aspect > usableHeight) widthMm = usableHeight / aspect
    widthMm = Math.max(DTF_MIN_ELEMENT_WIDTH_MM, widthMm)

    const heightMm = widthMm * aspect
    const id = crypto.randomUUID()

    set((s) => ({
      ...withActiveSheet(s, (sh) => ({
        ...sh,
        elements: [
          ...sh.elements,
          clampElementToSheet(
            {
              id,
              kind: 'image' as const,
              uploadId: motif.id,
              previewUrl: motif.previewUrl!,
              sourceWidthPx: motif.widthPx,
              sourceHeightPx: motif.heightPx,
              xMm: (def.widthMm - widthMm) / 2,
              yMm: (def.heightMm - heightMm) / 2,
              widthMm,
              rotationDeg: 0,
              z: sh.elements.reduce((max, e) => Math.max(max, e.z), 0) + 1,
            },
            sh.format,
          ),
        ],
      })),
      selectedId: id,
    }))
  },

  addTextElement: () => {
    const state = get()
    const sheet = activeSheetOf(state)
    if (sheet.elements.length >= DTF_MAX_ELEMENTS_PER_SHEET) return

    const def = DTF_SHEET_FORMATS[sheet.format]
    const id = crypto.randomUUID()
    // Startwerte bewusst gut sichtbar: 20 mm Schrift ist auf einem A4-Bogen
    // etwa so hoch wie ein Daumen — gross genug, um sie sofort zu finden
    // und anzufassen. Breite und Hoehe misst der Editor gleich nach.
    const fontSizeMm = 20
    const widthMm = def.widthMm / 2
    const heightMm = fontSizeMm * 1.15

    set((s) => ({
      ...withActiveSheet(s, (sh) => ({
        ...sh,
        elements: [
          ...sh.elements,
          {
            id,
            kind: 'text' as const,
            text: '',
            fontFamily: 'Montserrat',
            fontSizeMm,
            color: '#1a1a1a',
            align: 'center' as const,
            bold: false,
            uppercase: false,
            letterSpacingEm: 0,
            heightMm,
            xMm: (def.widthMm - widthMm) / 2,
            yMm: (def.heightMm - heightMm) / 2,
            widthMm,
            rotationDeg: 0,
            z: sh.elements.reduce((max, e) => Math.max(max, e.z), 0) + 1,
          },
        ],
      })),
      selectedId: id,
    }))
  },

  updateElement: (id, patch) =>
    set((s) =>
      withActiveSheet(s, (sheet) => ({
        ...sheet,
        elements: sheet.elements.map((e) => {
          if (e.id !== id) return e
          // `as DtfElement`: Der Patch ist absichtlich teilweise; der
          // Elementtyp bleibt durch das Spread erhalten, TypeScript kann
          // das bei einer Union aber nicht selbst nachvollziehen.
          const merged = {
            ...e,
            ...patch,
            widthMm:
              patch.widthMm !== undefined
                ? Math.max(DTF_MIN_ELEMENT_WIDTH_MM, patch.widthMm)
                : e.widthMm,
          } as DtfElement
          // Jede Änderung — Ziehen, Skalieren, Drehen, numerische Eingabe —
          // läuft durch dieselbe Begrenzung.
          return clampElementToSheet(merged, sheet.format)
        }),
      })),
    ),

  duplicateElement: (id) => {
    const sheet = activeSheetOf(get())
    const source = sheet.elements.find((e) => e.id === id)
    if (!source || sheet.elements.length >= DTF_MAX_ELEMENTS_PER_SHEET) return

    const copyId = crypto.randomUUID()
    set((s) => ({
      ...withActiveSheet(s, (sh) => ({
        ...sh,
        elements: [
          ...sh.elements,
          clampElementToSheet(
            {
              ...source,
              id: copyId,
              // Leicht versetzt, damit die Kopie nicht deckungsgleich auf
              // dem Original liegt und unsichtbar wirkt.
              xMm: source.xMm + 5,
              yMm: source.yMm + 5,
              z: sh.elements.reduce((max, e) => Math.max(max, e.z), 0) + 1,
            },
            sh.format,
          ),
        ],
      })),
      selectedId: copyId,
    }))
  },

  removeElement: (id) =>
    set((s) => ({
      ...withActiveSheet(s, (sheet) => ({
        ...sheet,
        elements: sheet.elements.filter((e) => e.id !== id),
      })),
      selectedId: s.selectedId === id ? null : s.selectedId,
    })),

  select: (selectedId) => set({ selectedId }),

  bringToFront: (id) =>
    set((s) =>
      withActiveSheet(s, (sheet) => {
        const top = sheet.elements.reduce((max, e) => Math.max(max, e.z), 0)
        return {
          ...sheet,
          elements: sheet.elements.map((e) => (e.id === id ? { ...e, z: top + 1 } : e)),
        }
      }),
    ),

  reset: () => {
    const fresh = makeSheet(DTF_DEFAULT_SHEET_FORMAT)
    set({
      sheets: [fresh],
      activeSheetId: fresh.id,
      selectedId: null,
      showGrid: true,
      motifs: [],
    })
  },
}))
