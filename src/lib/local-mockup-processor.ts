/**
 * PROJ-52: Local-Mockup-Provider — server-side overlay processing.
 *
 * Eine flach gerenderte PSD wird vom Admin als PNG hochgeladen:
 *  - überall opak: Hintergrund, Rahmen, Schatten
 *  - im Smart-Object-Bereich: Magenta-Füllung (#FF00FF Toleranz)
 *
 * Diese Lib:
 *  1. Validiert den Upload (Größe, PNG-Header, Mindestabmessungen)
 *  2. Findet die Bounding-Box der Magenta-Pixel (optional)
 *  3. Ersetzt Magenta + 2 px Antialias-Ring durch volle Transparenz
 *  4. Liefert das verarbeitete PNG + Slot-Koordinaten zurück
 *
 * Außerdem: composeLocalMockup() zieht das Poster ins Slot-Rechteck und
 * legt das Overlay-PNG darüber — wird vom render-worker aufgerufen.
 *
 * Stilistisch parallel zu @/lib/dynamic-mockups-client (gleicher Vertrag:
 * Input poster → Output composite buffer).
 */
import sharp from 'sharp'

// ─── Typen ─────────────────────────────────────────────────────────────────

export interface SlotRect {
  x: number
  y: number
  width: number
  height: number
  canvasWidth: number
  canvasHeight: number
}

export interface ProcessedOverlay {
  processedPng: Buffer
  slot: SlotRect
  magentaPixelCount: number
}

/**
 * Optionaler Annotation-Layer, der NACH dem Mockup-Overlay als oberste Ebene
 * auf das Composite gelegt wird (Pfeile, Beschriftungen, Erklärungs-Grafiken
 * für Etsy-Listings o. Ä.). Muss transparenter PNG-Buffer in Mockup-Canvas-
 * Maßen sein — wird ohne Resize 1:1 draufkomponiert.
 *
 * Workflow-Entscheidung (PROJ-54, 2026-06-03): Bewusst kein eigener
 * Skalierungs-/Positionierungs-Pfad. Wer einen kleineren Rahmen oder
 * versetzten Mockup-Bereich braucht, baut das direkt ins Mockup-Overlay-PSD
 * ein (Smart-Object kleiner, Hintergrund größer) — der Compositor bleibt
 * dadurch eine reine 1:1-Maschine.
 */
export interface ComposeLocalMockupParams {
  posterBuffer: Buffer
  overlayBuffer: Buffer
  slot: SlotRect
  annotationBuffer?: Buffer
}

// ─── Magenta-Detection-Heuristik ───────────────────────────────────────────
// Pure Magenta = (255, 0, 255). Photoshop-Export ergibt durch Farbprofil-
// Konvertierung leicht abweichende Werte (typisch (255, 13, 255)) und an
// Antialiasing-Kanten gegen den dunklen Rahmen blassere Werte wie (140, 8,
// 140). Wir akzeptieren alles, wo R und B deutlich höher sind als G, und
// schließen reines Dunkelgrau über eine R+B-Untergrenze aus.

const MAGENTA_MIN_BRIGHTNESS = 80
const MAGENTA_GREEN_RATIO = 0.45
const DILATION_RADIUS = 2

function isMagenta(r: number, g: number, b: number): boolean {
  if (r + b < MAGENTA_MIN_BRIGHTNESS) return false
  const minRB = Math.min(r, b)
  return g < minRB * MAGENTA_GREEN_RATIO
}

// ─── Validation ───────────────────────────────────────────────────────────

export const MAX_OVERLAY_BYTES = 5 * 1024 * 1024  // 5 MB
export const MIN_OVERLAY_DIM = 800
export const MAX_OVERLAY_DIM = 4000

export class OverlayValidationError extends Error {
  constructor(message: string, public code: string) {
    super(message)
    this.name = 'OverlayValidationError'
  }
}

export async function validateOverlayBuffer(buffer: Buffer): Promise<{ width: number; height: number; hasAlpha: boolean }> {
  if (buffer.length > MAX_OVERLAY_BYTES) {
    throw new OverlayValidationError(
      `Datei zu groß (${(buffer.length / 1024 / 1024).toFixed(1)} MB, Limit ${MAX_OVERLAY_BYTES / 1024 / 1024} MB)`,
      'too_large',
    )
  }
  // PNG-Magic-Number: 89 50 4E 47 0D 0A 1A 0A
  if (buffer.length < 8 ||
      buffer[0] !== 0x89 || buffer[1] !== 0x50 || buffer[2] !== 0x4e || buffer[3] !== 0x47) {
    throw new OverlayValidationError('Nur PNG-Dateien werden akzeptiert', 'not_png')
  }

  let meta: sharp.Metadata
  try {
    meta = await sharp(buffer).metadata()
  } catch (err) {
    throw new OverlayValidationError(`PNG nicht lesbar: ${(err as Error).message}`, 'unreadable')
  }

  const width = meta.width ?? 0
  const height = meta.height ?? 0
  if (width < MIN_OVERLAY_DIM || height < MIN_OVERLAY_DIM) {
    throw new OverlayValidationError(
      `Mindestgröße ${MIN_OVERLAY_DIM}×${MIN_OVERLAY_DIM} px, hochgeladen ${width}×${height}`,
      'too_small',
    )
  }
  if (width > MAX_OVERLAY_DIM || height > MAX_OVERLAY_DIM) {
    throw new OverlayValidationError(
      `Maximalgröße ${MAX_OVERLAY_DIM}×${MAX_OVERLAY_DIM} px, hochgeladen ${width}×${height}`,
      'too_large_dim',
    )
  }

  return { width, height, hasAlpha: meta.hasAlpha === true }
}

// ─── Magenta → Transparenz + Bounding-Box ─────────────────────────────────

/**
 * Findet die Bounding-Box aller Magenta-Pixel + 2-px-Dilation und ersetzt
 * sie durch volle Transparenz. Liefert das verarbeitete PNG + Slot-Rect.
 *
 * Wirft, wenn kein Magenta gefunden wurde — der Admin muss dann manuelle
 * Slot-Koordinaten angeben.
 */
export async function detectMagentaSlotAndStrip(buffer: Buffer): Promise<ProcessedOverlay> {
  const image = sharp(buffer).ensureAlpha()
  const { data, info } = await image.raw().toBuffer({ resolveWithObject: true })
  const { width, height, channels } = info
  if (channels !== 4) throw new OverlayValidationError('Erwarte 4 Kanäle (RGBA)', 'bad_channels')

  // 1. Pass: Magenta-Mask + Bounding-Box
  const magentaMask = new Uint8Array(width * height)
  let minX = width
  let minY = height
  let maxX = -1
  let maxY = -1
  let magentaCount = 0

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4
      if (isMagenta(data[i], data[i + 1], data[i + 2])) {
        magentaMask[y * width + x] = 1
        magentaCount++
        if (x < minX) minX = x
        if (y < minY) minY = y
        if (x > maxX) maxX = x
        if (y > maxY) maxY = y
      }
    }
  }

  if (magentaCount === 0) {
    throw new OverlayValidationError(
      'Kein Magenta-Marker (#FF00FF) gefunden. Smart-Object im PSD muss vollflächig mit Magenta gefüllt sein, oder Slot-Koordinaten manuell angeben.',
      'no_magenta',
    )
  }

  // 2. Pass: Dilation fängt antialiased Restkanten ab, die unter der
  // Threshold liegen — sonst bleibt am Rand des Slots ein blasser Magenta-
  // Saum sichtbar.
  const clearMask = new Uint8Array(magentaMask)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (magentaMask[y * width + x]) continue
      let found = false
      for (let dy = -DILATION_RADIUS; dy <= DILATION_RADIUS && !found; dy++) {
        const ny = y + dy
        if (ny < 0 || ny >= height) continue
        for (let dx = -DILATION_RADIUS; dx <= DILATION_RADIUS && !found; dx++) {
          const nx = x + dx
          if (nx < 0 || nx >= width) continue
          if (magentaMask[ny * width + nx]) found = true
        }
      }
      if (found) {
        clearMask[y * width + x] = 1
        if (x < minX) minX = x
        if (y < minY) minY = y
        if (x > maxX) maxX = x
        if (y > maxY) maxY = y
      }
    }
  }

  // 3. Pass: Pixel transparent setzen
  for (let p = 0; p < clearMask.length; p++) {
    if (!clearMask[p]) continue
    const i = p * 4
    data[i]     = 0
    data[i + 1] = 0
    data[i + 2] = 0
    data[i + 3] = 0
  }

  const slot: SlotRect = {
    x: minX,
    y: minY,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
    canvasWidth: width,
    canvasHeight: height,
  }

  const processedPng = await sharp(data, { raw: { width, height, channels: 4 } })
    .png({ compressionLevel: 9 })
    .toBuffer()

  return { processedPng, slot, magentaPixelCount: magentaCount }
}

/**
 * Variante ohne Magenta-Detection: Admin liefert Slot-Rechteck manuell,
 * Overlay-PNG bleibt ungeändert (Smart-Object-Bereich ist im Upload bereits
 * transparent). Nur Validation und Slot-Bounds-Check.
 */
export async function applyManualSlot(buffer: Buffer, slot: Omit<SlotRect, 'canvasWidth' | 'canvasHeight'>): Promise<ProcessedOverlay> {
  const meta = await sharp(buffer).metadata()
  const width = meta.width ?? 0
  const height = meta.height ?? 0

  if (slot.x < 0 || slot.y < 0 || slot.x + slot.width > width || slot.y + slot.height > height) {
    throw new OverlayValidationError(
      `Slot-Rechteck (${slot.x}/${slot.y} ${slot.width}×${slot.height}) liegt außerhalb der Canvas-Grenzen ${width}×${height}`,
      'slot_out_of_bounds',
    )
  }
  if (slot.width <= 0 || slot.height <= 0) {
    throw new OverlayValidationError('Slot-Breite/Höhe muss > 0 sein', 'slot_invalid_dimensions')
  }

  return {
    processedPng: buffer,
    slot: { ...slot, canvasWidth: width, canvasHeight: height },
    magentaPixelCount: 0,
  }
}

// ─── Compositing (Worker-Pfad) ────────────────────────────────────────────

/**
 * Komponiert ein Poster-PNG in ein lokales Mockup-Overlay.
 *  1. Output-Canvas hat die Größe des Overlays (typisch 1500×1500)
 *  2. Poster wird mit cover-fit ins Slot-Rect skaliert
 *  3. Überstand wird auf das Slot-Rect zugeschnitten
 *  4. Overlay-PNG wird oben drauf gelegt (Rahmen + Schatten erscheinen)
 *
 * Liefert einen JPEG-Buffer für effiziente Speicherung (Composites brauchen
 * keine Transparenz mehr, JPG spart 60-80% gegenüber PNG).
 */
export async function composeLocalMockup(params: ComposeLocalMockupParams): Promise<Buffer> {
  const { posterBuffer, overlayBuffer, slot, annotationBuffer } = params

  const outBg = sharp({
    create: {
      width: slot.canvasWidth,
      height: slot.canvasHeight,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  }).png()

  // 1. Poster auf Slot-Größe bringen (cover-fit, gleich beschnitten)
  const fittedPoster = await sharp(posterBuffer)
    .resize(slot.width, slot.height, { fit: 'cover', position: 'center' })
    .toBuffer()

  // 2. Composite: Poster ins Slot → Mockup-Overlay → optional Annotation oben drauf
  const layers: { input: Buffer; top: number; left: number }[] = [
    { input: fittedPoster, top: slot.y, left: slot.x },
    { input: overlayBuffer, top: 0, left: 0 },
  ]
  if (annotationBuffer) {
    layers.push({ input: annotationBuffer, top: 0, left: 0 })
  }

  const composed = await outBg
    .composite(layers)
    .jpeg({ quality: 88, mozjpeg: true })
    .toBuffer()

  return composed
}
