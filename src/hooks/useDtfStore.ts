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
 * Beim Verkleinern des Formats können Motive dadurch außerhalb des Bogens
 * landen. Sie werden nicht verschoben und nicht gelöscht, sondern als
 * „außerhalb" markiert — das Wegschieben von Motiven hinter dem Rücken des
 * Kunden wäre die schlechtere Überraschung.
 */

export interface DtfElement {
  id: string
  /** Verweis auf die Zeile in `dtf_uploads`. */
  uploadId: string
  /** Signierte URL der Vorschau. Das Original fasst der Editor nie an. */
  previewUrl: string
  /** Pixelmaße des ORIGINALS — Grundlage der dpi-Berechnung. */
  sourceWidthPx: number
  sourceHeightPx: number
  /** Linke obere Ecke auf dem Bogen, in Millimetern. */
  xMm: number
  yMm: number
  /** Gedruckte Breite in Millimetern. Die Höhe folgt dem Seitenverhältnis. */
  widthMm: number
  rotationDeg: number
  /** Stapelreihenfolge; höher liegt oben. */
  z: number
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

interface DtfState {
  sheetFormat: DtfSheetFormat
  /** Auflage: wie oft dieser Bogen gedruckt wird. */
  quantity: number
  /** Zentimeterraster auf dem Bogen. Hilft beim Abschätzen von Größen. */
  showGrid: boolean
  elements: DtfElement[]
  selectedId: string | null
  motifs: DtfMotif[]

  setSheetFormat: (format: DtfSheetFormat) => void
  setQuantity: (quantity: number) => void
  setShowGrid: (show: boolean) => void

  setMotifs: (motifs: DtfMotif[]) => void
  addMotif: (motif: DtfMotif) => void
  removeMotif: (id: string) => void

  /** Legt ein Motiv mittig auf den Bogen. */
  placeMotif: (motif: DtfMotif) => void
  updateElement: (id: string, patch: Partial<Omit<DtfElement, 'id'>>) => void
  duplicateElement: (id: string) => void
  removeElement: (id: string) => void
  select: (id: string | null) => void
  bringToFront: (id: string) => void
  reset: () => void
}

/** Höhe eines Elements aus Breite und Seitenverhältnis des Originals. */
export function elementHeightMm(el: DtfElement): number {
  if (el.sourceWidthPx <= 0) return el.widthMm
  return (el.widthMm * el.sourceHeightPx) / el.sourceWidthPx
}

/** Effektive Auflösung bei der aktuell eingestellten Druckbreite. */
export function elementDpi(el: DtfElement): number {
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

const INITIAL = {
  sheetFormat: DTF_DEFAULT_SHEET_FORMAT,
  quantity: 1,
  showGrid: true,
  elements: [] as DtfElement[],
  selectedId: null as string | null,
  motifs: [] as DtfMotif[],
}

export const useDtfStore = create<DtfState>((set, get) => ({
  ...INITIAL,

  // Formatwechsel zieht alle Motive nach: Beim Verkleinern rutschen sie in
  // den neuen bedruckbaren Bereich und werden nötigenfalls verkleinert.
  // Vorher wurden sie nur rot markiert — mit der harten Begrenzung wäre das
  // inkonsequent, denn dann bliebe ausgerechnet der Formatwechsel der eine
  // Weg, auf dem ein Motiv doch über den Rand geraten kann.
  setSheetFormat: (sheetFormat) =>
    set((s) => ({
      sheetFormat,
      elements: s.elements.map((e) => clampElementToSheet(e, sheetFormat)),
    })),

  setQuantity: (quantity) => set({ quantity: Math.max(1, Math.round(quantity)) }),

  setShowGrid: (showGrid) => set({ showGrid }),

  setMotifs: (motifs) => set({ motifs }),

  addMotif: (motif) => set((s) => ({ motifs: [motif, ...s.motifs] })),

  removeMotif: (id) =>
    set((s) => ({
      motifs: s.motifs.filter((m) => m.id !== id),
      // Platzierte Instanzen dieses Motivs verschwinden mit — sonst zeigte
      // der Bogen Bilder, deren Datei es nicht mehr gibt.
      elements: s.elements.filter((e) => e.uploadId !== id),
      selectedId: s.elements.find((e) => e.id === s.selectedId)?.uploadId === id
        ? null
        : s.selectedId,
    })),

  placeMotif: (motif) => {
    const { sheetFormat, elements } = get()
    if (elements.length >= DTF_MAX_ELEMENTS_PER_SHEET) return
    if (!motif.previewUrl) return

    const sheet = DTF_SHEET_FORMATS[sheetFormat]
    const usableWidth = sheet.widthMm - 2 * DTF_SHEET_MARGIN_MM
    const usableHeight = sheet.heightMm - 2 * DTF_SHEET_MARGIN_MM
    const aspect = motif.heightPx / Math.max(1, motif.widthPx)

    // Startgröße: die Hälfte der nutzbaren Breite, aber nie so hoch, dass
    // es schon beim Einfügen über den Bogen ragt.
    let widthMm = usableWidth / 2
    if (widthMm * aspect > usableHeight) widthMm = usableHeight / aspect
    widthMm = Math.max(DTF_MIN_ELEMENT_WIDTH_MM, widthMm)

    const heightMm = widthMm * aspect
    const id = crypto.randomUUID()

    set((s) => ({
      elements: [
        ...s.elements,
        clampElementToSheet(
          {
            id,
            uploadId: motif.id,
            previewUrl: motif.previewUrl!,
            sourceWidthPx: motif.widthPx,
            sourceHeightPx: motif.heightPx,
            xMm: (sheet.widthMm - widthMm) / 2,
            yMm: (sheet.heightMm - heightMm) / 2,
            widthMm,
            rotationDeg: 0,
            z: s.elements.reduce((max, e) => Math.max(max, e.z), 0) + 1,
          },
          sheetFormat,
        ),
      ],
      selectedId: id,
    }))
  },

  updateElement: (id, patch) =>
    set((s) => ({
      elements: s.elements.map((e) => {
        if (e.id !== id) return e
        const merged = {
          ...e,
          ...patch,
          widthMm:
            patch.widthMm !== undefined
              ? Math.max(DTF_MIN_ELEMENT_WIDTH_MM, patch.widthMm)
              : e.widthMm,
        }
        // Jede Änderung — Ziehen, Skalieren, Drehen, numerische Eingabe —
        // läuft durch dieselbe Begrenzung. Damit gibt es keinen Weg, ein
        // Motiv über den bedruckbaren Bereich hinaus zu bekommen.
        return clampElementToSheet(merged, s.sheetFormat)
      }),
    })),

  duplicateElement: (id) => {
    const { elements } = get()
    const source = elements.find((e) => e.id === id)
    if (!source || elements.length >= DTF_MAX_ELEMENTS_PER_SHEET) return

    const copyId = crypto.randomUUID()
    // Leicht versetzt einfügen, damit die Kopie nicht deckungsgleich auf
    // dem Original liegt und unsichtbar wirkt.
    set((s) => ({
      elements: [
        ...s.elements,
        clampElementToSheet(
          {
            ...source,
            id: copyId,
            xMm: source.xMm + 5,
            yMm: source.yMm + 5,
            z: s.elements.reduce((max, e) => Math.max(max, e.z), 0) + 1,
          },
          s.sheetFormat,
        ),
      ],
      selectedId: copyId,
    }))
  },

  removeElement: (id) =>
    set((s) => ({
      elements: s.elements.filter((e) => e.id !== id),
      selectedId: s.selectedId === id ? null : s.selectedId,
    })),

  select: (selectedId) => set({ selectedId }),

  bringToFront: (id) =>
    set((s) => {
      const top = s.elements.reduce((max, e) => Math.max(max, e.z), 0)
      return { elements: s.elements.map((e) => (e.id === id ? { ...e, z: top + 1 } : e)) }
    }),

  reset: () => set({ ...INITIAL, elements: [], motifs: [] }),
}))
