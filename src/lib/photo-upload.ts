import imageCompression from 'browser-image-compression'
import { createClient } from './supabase-browser'
import { getOrCreateGuestSessionId } from './guest-session'

const BUCKET = 'user-photos'
const MAX_SIZE_MB = 10
const TARGET_MAX_MB = 2
const TARGET_MAX_EDGE = 2400

export interface UploadedPhoto {
  storagePath: string
  publicUrl: string
  width: number
  height: number
}

/**
 * Converts HEIC/HEIF images to JPEG for browser compatibility.
 * Only runs client-side.
 */
async function convertHeicIfNeeded(file: File): Promise<File> {
  const isHeic =
    file.type === 'image/heic' ||
    file.type === 'image/heif' ||
    /\.(heic|heif)$/i.test(file.name)
  if (!isHeic) return file

  const heic2any = (await import('heic2any')).default as (opts: {
    blob: Blob
    toType?: string
    quality?: number
  }) => Promise<Blob | Blob[]>

  const converted = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.85 })
  const blob = Array.isArray(converted) ? converted[0] : converted
  return new File([blob], file.name.replace(/\.(heic|heif)$/i, '.jpg'), {
    type: 'image/jpeg',
    lastModified: Date.now(),
  })
}

async function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight })
      URL.revokeObjectURL(url)
    }
    img.onerror = reject
    img.src = url
  })
}

export interface UploadOptions {
  /** Set when the user is logged in. If undefined, the upload lands under
   *  the anonymous guest folder and a session UUID from localStorage. */
  userId?: string | null
  guestSessionId?: string
  onProgress?: (percent: number) => void
}

export async function uploadPhoto(file: File, opts: UploadOptions): Promise<UploadedPhoto> {
  if (file.size > MAX_SIZE_MB * 1024 * 1024) {
    throw new Error(`Datei zu groß — maximal ${MAX_SIZE_MB} MB erlaubt.`)
  }

  opts.onProgress?.(5)

  const converted = await convertHeicIfNeeded(file)
  opts.onProgress?.(25)

  const compressed = await imageCompression(converted, {
    maxSizeMB: TARGET_MAX_MB,
    maxWidthOrHeight: TARGET_MAX_EDGE,
    useWebWorker: true,
    fileType: 'image/jpeg',
    initialQuality: 0.85,
  })
  opts.onProgress?.(60)

  const dims = await getImageDimensions(compressed)

  const supabase = createClient()
  const uuid = crypto.randomUUID()
  const now = new Date()
  const ym = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`
  const folder = opts.userId ? opts.userId : `anon/${opts.guestSessionId ?? 'unknown'}`
  const storagePath = `${folder}/${ym}/${uuid}.jpg`

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, compressed, {
      cacheControl: '3600',
      contentType: 'image/jpeg',
      upsert: false,
    })

  if (error) throw new Error(`Upload fehlgeschlagen: ${error.message}`)
  opts.onProgress?.(95)

  const signedUrl = await getPhotoSignedUrl(storagePath, opts.guestSessionId)

  opts.onProgress?.(100)

  return {
    storagePath,
    publicUrl: signedUrl,
    width: dims.width,
    height: dims.height,
  }
}

/**
 * Signierte Lese-URL für ein Foto.
 *
 * Läuft seit Migration 20260810100001 über den Server statt über den
 * Anon-Key. Grund: Die anon-SELECT-Policy auf `user-photos` prüfte nur, ob
 * der Ordner `anon` heißt — nicht, welchem Gast er gehört. Damit konnte
 * jeder Gast die Fotos aller anderen lesen. Die Policy ist entfernt, das
 * Signieren übernimmt `/api/photos/sign` mit Besitzprüfung.
 *
 * Für angemeldete Nutzer prüft der Server gegen `auth.uid()`; für Gäste
 * gegen die mitgeschickte Sitzungs-ID.
 */
export async function getPhotoSignedUrl(
  storagePath: string,
  guestSessionId?: string,
): Promise<string> {
  const res = await fetch('/api/photos/sign', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      storagePath,
      guestSessionId: guestSessionId ?? guestSessionIdForPath(storagePath),
      action: 'sign',
    }),
  })
  if (!res.ok) {
    const payload = await res.json().catch(() => ({}))
    throw new Error(payload.error ?? 'Konnte Foto-URL nicht erstellen.')
  }
  const { signedUrl } = (await res.json()) as { signedUrl: string }
  return signedUrl
}

/**
 * Löscht ein Foto. Ebenfalls serverseitig, siehe `getPhotoSignedUrl` —
 * die anon-DELETE-Policy erlaubte jedem Gast das Löschen fremder Fotos.
 */
export async function deletePhoto(
  storagePath: string,
  guestSessionId?: string,
): Promise<void> {
  await fetch('/api/photos/sign', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      storagePath,
      guestSessionId: guestSessionId ?? guestSessionIdForPath(storagePath),
      action: 'delete',
    }),
  })
}

/**
 * Gast-Sitzung für einen Pfad, falls der Aufrufer sie nicht mitgibt.
 *
 * Die sechs Aufrufstellen in den Editoren rufen `deletePhoto(path)` und
 * `getPhotoSignedUrl(path)` ohne Sitzungs-ID auf — bei angemeldeten Nutzern
 * braucht der Server sie auch nicht. Für Gäste holen wir sie hier aus dem
 * localStorage, statt alle Aufrufstellen anzufassen.
 *
 * Nur bei `anon/…`-Pfaden: Bei einem Pfad, der mit einer User-ID beginnt,
 * würde eine mitgeschickte Gast-ID die Prüfung nur unnötig verwirren.
 */
function guestSessionIdForPath(storagePath: string): string | undefined {
  if (!storagePath.startsWith('anon/')) return undefined
  try {
    return getOrCreateGuestSessionId()
  } catch {
    return undefined
  }
}
