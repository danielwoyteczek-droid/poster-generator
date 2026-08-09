/**
 * Komponiert ein Poster-Canvas in ein Rahmen-Mockup (PSD-Export).
 *
 * Source-of-Truth: assets/mockups/frame-portrait.psd
 *   → flach exportiert als assets/mockups/frame-portrait.png (Smart-Object in Magenta)
 *   → via scripts/build-frame-mockup.ts verarbeitet zu:
 *      - public/mockups/frame-{orientation}.png (Magenta → transparent)
 *      - public/mockups/frame-config.json (canvas + slot rect)
 */
import frameConfig from './frame-mockup-config.json'

type Orientation = 'portrait' | 'landscape'

interface SlotRect {
  x: number
  y: number
  width: number
  height: number
}

interface FrameVariant {
  file: string
  canvasWidth: number
  canvasHeight: number
  slot: SlotRect
}

const CONFIG = frameConfig as Record<Orientation, FrameVariant>

const overlayCache = new Map<string, Promise<HTMLImageElement>>()

function loadOverlay(url: string): Promise<HTMLImageElement> {
  const cached = overlayCache.get(url)
  if (cached) return cached
  const promise = new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error(`Konnte Mockup-Overlay nicht laden: ${url}`))
    img.src = url
  })
  overlayCache.set(url, promise)
  return promise
}

export function hasFrameMockup(orientation: Orientation): boolean {
  return CONFIG[orientation] != null
}

/**
 * Komponiert das übergebene Poster-Canvas in das Rahmen-Mockup.
 * - Skaliert das Poster mit `cover` in den Smart-Object-Slot
 *   (DIN-Aspect 1:√2 entspricht praktisch dem Slot-Aspect, daher kein nennenswerter Crop)
 * - Legt das Mockup-PNG (Rahmen + Schatten + Hintergrund) darüber
 * - Liefert ein neues Canvas in der Mockup-Auflösung zurück
 */
export async function composeFrameMockup(
  posterCanvas: HTMLCanvasElement,
  orientation: Orientation = 'portrait',
): Promise<HTMLCanvasElement> {
  const variant = CONFIG[orientation]
  if (!variant) throw new Error(`Kein Mockup für Orientation "${orientation}" konfiguriert`)

  const out = document.createElement('canvas')
  out.width = variant.canvasWidth
  out.height = variant.canvasHeight
  const ctx = out.getContext('2d')
  if (!ctx) throw new Error('2D-Context konnte nicht erzeugt werden')

  const { slot } = variant
  const posterRatio = posterCanvas.width / posterCanvas.height
  const slotRatio = slot.width / slot.height

  // cover-fit: Poster füllt den Slot vollständig, eventueller Überstand
  // wird gleich vom Overlay verdeckt
  let drawW: number, drawH: number
  if (posterRatio > slotRatio) {
    drawH = slot.height
    drawW = drawH * posterRatio
  } else {
    drawW = slot.width
    drawH = drawW / posterRatio
  }
  const drawX = slot.x + (slot.width - drawW) / 2
  const drawY = slot.y + (slot.height - drawH) / 2

  ctx.save()
  ctx.beginPath()
  ctx.rect(slot.x, slot.y, slot.width, slot.height)
  ctx.clip()
  ctx.drawImage(posterCanvas, drawX, drawY, drawW, drawH)
  ctx.restore()

  const overlay = await loadOverlay(variant.file)
  ctx.drawImage(overlay, 0, 0, variant.canvasWidth, variant.canvasHeight)

  return out
}
