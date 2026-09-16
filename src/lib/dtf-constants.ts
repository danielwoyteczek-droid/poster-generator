/**
 * PROJ-55: Gemeinsame Konstanten für den DTF-Print-Editor.
 *
 * Bewusst frei von Server- und Browser-spezifischen Importen, damit sowohl
 * die Client-Upload-Lib als auch die API-Routen dieselben Werte benutzen —
 * eine doppelt gepflegte Größenprüfung, die auseinanderläuft, ist eine
 * klassische Fehlerquelle.
 */

export const DTF_BUCKET = 'dtf-uploads'

/**
 * Bogenformate. Bewusst ein eigener Begriff neben den Posterformaten aus
 * `print-formats.ts` (a4 | a3 | a2): Jene Liste hängt an Produkten,
 * Warenkorb, Versandkosten, Vorlagen und der Render-Pipeline. Würde 40 × 50
 * dort einhängen, müsste jeder dieser Bereiche eine Antwort auf ein Format
 * haben, das ihn nichts angeht — etwa „Wie sieht ein Sternenposter in
 * 40 × 50 aus?". Die Überschneidung bei A4 und A3 ist zufällig; das eine
 * ist ein Papierformat für Poster, das andere ein Bogenmaß für
 * Transferfolie.
 */
export type DtfSheetFormat = 'a4' | 'a3' | '40x50'

export interface DtfSheetDefinition {
  id: DtfSheetFormat
  label: string
  widthMm: number
  heightMm: number
}

export const DTF_SHEET_FORMATS: Record<DtfSheetFormat, DtfSheetDefinition> = {
  a4: { id: 'a4', label: 'A4', widthMm: 210, heightMm: 297 },
  a3: { id: 'a3', label: 'A3', widthMm: 297, heightMm: 420 },
  '40x50': { id: '40x50', label: '40 × 50 cm', widthMm: 400, heightMm: 500 },
}

export const DTF_SHEET_FORMAT_OPTIONS = Object.values(DTF_SHEET_FORMATS)

export const DTF_DEFAULT_SHEET_FORMAT: DtfSheetFormat = 'a4'

/**
 * Sicherheitsabstand zur Bogenkante und Mindestabstand zwischen Motiven,
 * beide in Millimetern. Getrennte Werte, weil sie verschiedene Zwecke
 * haben: der eine schützt vor dem nicht bedruckbaren Rand des Druckers,
 * der andere lässt Platz zum Zuschneiden.
 *
 * Zentral hier, nicht im Code verstreut — nach dem ersten Testdruck ändern
 * sich die Werte erfahrungsgemäß noch.
 */
export const DTF_SHEET_MARGIN_MM = 10
export const DTF_ELEMENT_GAP_MM = 10

/** Kleinstes sinnvolles Motiv auf dem Bogen. */
export const DTF_MIN_ELEMENT_WIDTH_MM = 10

/** Höchstzahl Bögen einer Bestellung bzw. Motive je Bogen. */
export const DTF_MAX_ELEMENTS_PER_SHEET = 60

/**
 * 50 MB. Ein bogenfüllendes PNG mit Transparenz auf 40 × 50 cm hat bei
 * 300 dpi rund 28 Megapixel und liegt je nach Motiv bei 30–60 MB. Ein
 * niedrigeres Limit würde genau die Dateien aussperren, die für gute
 * Druckqualität nötig sind. Muss mit `file_size_limit` des Buckets
 * übereinstimmen (siehe Migration 20260810100000).
 */
export const DTF_MAX_UPLOAD_BYTES = 50 * 1024 * 1024

export const DTF_ALLOWED_MIME_TYPES = ['image/png', 'image/jpeg'] as const
export type DtfMimeType = (typeof DTF_ALLOWED_MIME_TYPES)[number]

/**
 * Die Vorschau, mit der der Editor arbeitet. Das Original wird NICHT
 * angefasst — das ist der ganze Grund, warum DTF einen eigenen Upload-Weg
 * hat statt `photo-upload.ts` mitzubenutzen, das auf 2400 px eindampft und
 * das Original wegwirft.
 *
 * 1600 px Kantenlänge reicht, um ein Motiv formatfüllend auf dem
 * Editor-Bogen darzustellen, und hält den Speicherbedarf im Browser klein
 * genug, dass sich auch auf dem Handy mehrere Elemente flüssig schieben
 * lassen.
 */
export const DTF_PREVIEW_MAX_EDGE = 1600
export const DTF_PREVIEW_MAX_MB = 1
export const DTF_PREVIEW_MIME: DtfMimeType = 'image/jpeg'

/**
 * Unterhalb dieser effektiven Auflösung warnt der Editor. Eine einzige
 * Schwelle, keine Ampel: Eine Warnung, die ständig anspringt, wird
 * ignoriert. 150 dpi ist der Punkt, ab dem der Druck auf Textil sichtbar
 * weich wird; 300 dpi bleibt der Zielwert, wird aber nur als neutrale
 * Angabe eingeblendet.
 */
export const DTF_MIN_DPI_WARNING = 150
export const DTF_TARGET_DPI = 300

/** Gültigkeitsdauer der signierten Upload-URLs. */
export const DTF_UPLOAD_URL_TTL_SECONDS = 60 * 30 // 30 Minuten

/** Gültigkeitsdauer der signierten Lese-URLs für den Editor. */
export const DTF_READ_URL_TTL_SECONDS = 60 * 60 * 6 // 6 Stunden

/** Nicht bestellte Uploads werden nach dieser Frist aufgeräumt. */
export const DTF_RETENTION_DAYS = 30

export function isAllowedDtfMime(value: string): value is DtfMimeType {
  return (DTF_ALLOWED_MIME_TYPES as readonly string[]).includes(value)
}

/**
 * Effektive Auflösung eines Motivs: Wie viele Pixel des Originals landen
 * auf einem Zoll Druck, wenn es in der angegebenen Breite gedruckt wird.
 *
 * @param pixelWidth Breite der Originaldatei in Pixeln
 * @param printedWidthMm Gedruckte Breite auf dem Bogen in Millimetern
 */
export function effectiveDpi(pixelWidth: number, printedWidthMm: number): number {
  if (printedWidthMm <= 0) return 0
  const printedInches = printedWidthMm / 25.4
  return Math.round(pixelWidth / printedInches)
}
