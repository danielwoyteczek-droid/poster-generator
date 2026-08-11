import { PDFDocument, degrees } from 'pdf-lib'
import { createAdminClient } from './supabase-admin'
import { DTF_BUCKET, DTF_SHEET_FORMATS, type DtfSheetFormat } from './dtf-constants'
import { elementHeightMm, type DtfElement } from '@/hooks/useDtfStore'

/**
 * PROJ-55 Phase 4: Druckfertige PDF aus einer Bogenbeschreibung.
 *
 * Erzeugt aus DENSELBEN Daten, die der Editor anzeigt und die der Kunde im
 * Freigabe-Dialog gesehen hat: Millimeter, ein Umrechnungsfaktor, sonst
 * nichts. Bei einem Produkt mit verbindlicher Druckfreigabe ist das die
 * Kernanforderung — ein zweiter Rechenweg könnte abweichen, und dann hätte
 * der Kunde etwas freigegeben, das nie gedruckt wird.
 *
 * Drei Festlegungen:
 *
 * **Ungespiegelt.** Die Spiegelung übernimmt die RIP-Software am Drucker.
 * Doppelte Spiegelung macht jeden Bogen unbrauchbar; das ist der klassische
 * DTF-Fehler. Vor dem ersten Serienlauf am eigenen Gerät prüfen.
 *
 * **Aus dem Original, nicht der Vorschau.** Der Editor arbeitet mit einer
 * verkleinerten Fassung, damit er auf dem Handy bedienbar bleibt. Hier wird
 * die unveränderte Datei eingebettet — sonst wäre die ganze Trennung von
 * Original und Vorschau sinnlos gewesen.
 *
 * **Transparenz bleibt.** PNG mit Alphakanal wird als solches eingebettet,
 * kein Flattening auf Weiß. Der Bogen ist Folie; eine weiße Fläche würde
 * mitgedruckt.
 */

/** PDF rechnet in Punkten: 1 Zoll = 72 pt = 25,4 mm. */
const PT_PER_MM = 72 / 25.4

export interface DtfSheetSnapshot {
  kind: 'dtf-sheet'
  format: DtfSheetFormat
  quantity: number
  elements: DtfElement[]
}

export class PrintFileError extends Error {}

/**
 * Baut die PDF für einen Bogen und liefert sie als Bytes.
 *
 * Lädt die Originaldateien anhand der `uploadId` der Elemente aus Storage.
 * Die im Snapshot gespeicherte `previewUrl` wird bewusst ignoriert: Sie ist
 * eine signierte URL mit Ablaufdatum und zeigt ohnehin auf die verkleinerte
 * Fassung.
 */
export async function buildDtfSheetPdf(snapshot: DtfSheetSnapshot): Promise<Uint8Array> {
  const sheet = DTF_SHEET_FORMATS[snapshot.format]
  if (!sheet) throw new PrintFileError(`Unbekanntes Bogenformat: ${snapshot.format}`)

  const admin = createAdminClient()
  const pdf = await PDFDocument.create()
  const page = pdf.addPage([sheet.widthMm * PT_PER_MM, sheet.heightMm * PT_PER_MM])

  // Jedes Original nur einmal laden und einbetten, auch wenn dasselbe Motiv
  // mehrfach auf dem Bogen liegt. Bei Dateien bis 50 MB ist das der
  // Unterschied zwischen einer brauchbaren und einer riesigen PDF.
  const embedded = new Map<string, Awaited<ReturnType<typeof pdf.embedPng>>>()

  const sorted = [...snapshot.elements].sort((a, b) => a.z - b.z)

  for (const el of sorted) {
    let image = embedded.get(el.uploadId)

    if (!image) {
      const { data: row, error } = await admin
        .from('dtf_uploads')
        .select('original_path, mime_type')
        .eq('id', el.uploadId)
        .maybeSingle()

      if (error || !row) {
        throw new PrintFileError(`Upload ${el.uploadId} nicht gefunden`)
      }

      const { data: file, error: dlErr } = await admin.storage
        .from(DTF_BUCKET)
        .download(row.original_path)

      if (dlErr || !file) {
        throw new PrintFileError(`Originaldatei fehlt: ${row.original_path}`)
      }

      const bytes = new Uint8Array(await file.arrayBuffer())
      image =
        row.mime_type === 'image/png' ? await pdf.embedPng(bytes) : await pdf.embedJpg(bytes)
      embedded.set(el.uploadId, image)
    }

    const widthPt = el.widthMm * PT_PER_MM
    const heightPt = elementHeightMm(el) * PT_PER_MM

    // PDF zählt von unten links, der Editor von oben links. Die y-Achse
    // muss deshalb gespiegelt werden — das ist eine Koordinatenumrechnung,
    // keine Bildspiegelung.
    const xPt = el.xMm * PT_PER_MM
    const yPt = (sheet.heightMm - el.yMm - elementHeightMm(el)) * PT_PER_MM

    if (!el.rotationDeg) {
      page.drawImage(image, { x: xPt, y: yPt, width: widthPt, height: heightPt })
      continue
    }

    // pdf-lib dreht um die linke untere Ecke, der Editor um die Mitte. Ohne
    // Ausgleich läge ein gedrehtes Motiv an einer anderen Stelle als in der
    // Vorschau — und die Vorschau ist das, was freigegeben wurde.
    const rad = (el.rotationDeg * Math.PI) / 180
    // Im Editor dreht CSS im Uhrzeigersinn, in PDF gegen den Uhrzeigersinn.
    const pdfAngle = -el.rotationDeg
    const cx = xPt + widthPt / 2
    const cy = yPt + heightPt / 2
    const dx = -widthPt / 2
    const dy = -heightPt / 2
    // Die um den Mittelpunkt gedrehte Position der linken unteren Ecke.
    const cos = Math.cos(-rad)
    const sin = Math.sin(-rad)

    page.drawImage(image, {
      x: cx + dx * cos - dy * sin,
      y: cy + dx * sin + dy * cos,
      width: widthPt,
      height: heightPt,
      rotate: degrees(pdfAngle),
    })
  }

  pdf.setTitle(`DTF ${sheet.label}`)
  pdf.setCreator('petite-moment')
  // Ohne festes Datum unterscheiden sich zwei Läufe derselben Vorlage —
  // unschön, wenn man Dateien vergleichen will.
  pdf.setCreationDate(new Date(0))
  pdf.setModificationDate(new Date(0))

  return pdf.save()
}

/** Ablagepfad der fertigen Datei. Unterhalb von orders/, damit die
 *  Aufräum-Regel für Kunden-Uploads sie nicht erfasst. */
export function printFilePath(orderId: string, itemIndex: number): string {
  return `orders/${orderId}/sheet-${itemIndex + 1}.pdf`
}

/** Erkennt eine DTF-Position an ihrer Bogenbeschreibung. */
export function readSheetSnapshot(item: unknown): DtfSheetSnapshot | null {
  if (!item || typeof item !== 'object') return null
  const candidate = item as { productId?: string; snapshot?: unknown }
  if (candidate.productId !== 'dtf') return null
  const snap = candidate.snapshot as Partial<DtfSheetSnapshot> | undefined
  if (!snap || snap.kind !== 'dtf-sheet' || !Array.isArray(snap.elements)) return null
  return snap as DtfSheetSnapshot
}
