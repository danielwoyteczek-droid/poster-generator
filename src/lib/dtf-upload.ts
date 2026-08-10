import imageCompression from 'browser-image-compression'
import {
  DTF_MAX_UPLOAD_BYTES,
  DTF_PREVIEW_MAX_EDGE,
  DTF_PREVIEW_MAX_MB,
  isAllowedDtfMime,
} from './dtf-constants'

/**
 * PROJ-55: Client-seitiger Upload für DTF-Motive.
 *
 * Der entscheidende Unterschied zu `photo-upload.ts`: Dort wird jede Datei
 * auf 2400 px und 2 MB eingedampft und das Original verworfen. Für
 * Poster-Fotos ist das richtig, für Druckdaten ruiniert es das Ergebnis —
 * ein bogenfüllendes Motiv auf 40 × 50 cm braucht bei 300 dpi rund 5900 px.
 *
 * Hier wandert das Original unangetastet in die Ablage. Zusätzlich entsteht
 * eine kleine Vorschau, mit der der Editor arbeitet: Ein 28-Megapixel-Bild
 * live über einen Bogen zu schieben, macht den Editor auf dem Handy
 * unbenutzbar. Gedruckt wird später serverseitig aus dem Original.
 *
 * Ablauf:
 *   1. Upload beim Server anmelden → zwei signierte Upload-URLs
 *   2. Original direkt zu Storage (am Server vorbei — Serverless-Funktionen
 *      nehmen nur rund 4,5 MB Body an)
 *   3. Vorschau erzeugen und ebenfalls direkt hochladen
 *   4. Abschluss melden, inklusive der Pixelmaße des Originals
 */

export interface DtfUpload {
  id: string
  filename: string
  mimeType: string
  byteSize: number
  widthPx: number
  heightPx: number
  previewUrl: string | null
}

export interface DtfUploadOptions {
  onProgress?: (percent: number) => void
  signal?: AbortSignal
}

export class DtfUploadError extends Error {}

async function readImageDimensions(file: Blob): Promise<{ width: number; height: number }> {
  const url = URL.createObjectURL(file)
  try {
    return await new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight })
      img.onerror = () => reject(new DtfUploadError('Bild konnte nicht gelesen werden.'))
      img.src = url
    })
  } finally {
    URL.revokeObjectURL(url)
  }
}

async function putToSignedUrl(url: string, body: Blob, contentType: string, signal?: AbortSignal) {
  const res = await fetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': contentType },
    body,
    signal,
  })
  if (!res.ok) {
    throw new DtfUploadError(`Upload fehlgeschlagen (${res.status}).`)
  }
}

export async function uploadDtfMotif(
  file: File,
  opts: DtfUploadOptions = {},
): Promise<DtfUpload> {
  if (!isAllowedDtfMime(file.type)) {
    throw new DtfUploadError('Nur PNG und JPG werden unterstützt.')
  }
  if (file.size > DTF_MAX_UPLOAD_BYTES) {
    const mb = Math.round(DTF_MAX_UPLOAD_BYTES / 1024 / 1024)
    throw new DtfUploadError(`Datei zu groß — maximal ${mb} MB.`)
  }

  opts.onProgress?.(5)

  // Maße vor dem Upload lesen: Schlägt das fehl, ist die Datei kein
  // brauchbares Bild und wir haben noch nichts hochgeladen.
  const dims = await readImageDimensions(file)
  opts.onProgress?.(10)

  const res = await fetch('/api/dtf/uploads', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      filename: file.name,
      mimeType: file.type,
      byteSize: file.size,
    }),
    signal: opts.signal,
  })

  if (!res.ok) {
    const payload = await res.json().catch(() => ({}))
    throw new DtfUploadError(payload.error ?? 'Upload konnte nicht angemeldet werden.')
  }

  const ticket = (await res.json()) as {
    id: string
    original: { uploadUrl: string }
    preview: { uploadUrl: string; mimeType: string }
  }

  opts.onProgress?.(15)

  // Original UNVERÄNDERT. Kein Reencode, keine Skalierung — das ist der
  // ganze Zweck dieses Wegs.
  await putToSignedUrl(ticket.original.uploadUrl, file, file.type, opts.signal)
  opts.onProgress?.(70)

  const preview = await imageCompression(file, {
    maxSizeMB: DTF_PREVIEW_MAX_MB,
    maxWidthOrHeight: DTF_PREVIEW_MAX_EDGE,
    useWebWorker: true,
    fileType: 'image/jpeg',
    initialQuality: 0.82,
  })
  opts.onProgress?.(85)

  await putToSignedUrl(ticket.preview.uploadUrl, preview, 'image/jpeg', opts.signal)
  opts.onProgress?.(95)

  const done = await fetch(`/api/dtf/uploads/${ticket.id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ widthPx: dims.width, heightPx: dims.height }),
    signal: opts.signal,
  })

  if (!done.ok) {
    const payload = await done.json().catch(() => ({}))
    throw new DtfUploadError(payload.error ?? 'Upload konnte nicht abgeschlossen werden.')
  }

  opts.onProgress?.(100)

  return {
    id: ticket.id,
    filename: file.name,
    mimeType: file.type,
    byteSize: file.size,
    widthPx: dims.width,
    heightPx: dims.height,
    previewUrl: null,
  }
}

/** Die eigene Motiv-Ablage mit frischen Vorschau-URLs. */
export async function listDtfUploads(): Promise<DtfUpload[]> {
  const res = await fetch('/api/dtf/uploads')
  if (!res.ok) throw new DtfUploadError('Ablage konnte nicht geladen werden.')
  const payload = (await res.json()) as { uploads: DtfUpload[] }
  return payload.uploads
}

export async function deleteDtfUpload(id: string): Promise<void> {
  const res = await fetch(`/api/dtf/uploads/${id}`, { method: 'DELETE' })
  if (!res.ok) {
    const payload = await res.json().catch(() => ({}))
    throw new DtfUploadError(payload.error ?? 'Motiv konnte nicht gelöscht werden.')
  }
}
