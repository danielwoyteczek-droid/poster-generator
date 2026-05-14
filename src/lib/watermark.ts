/**
 * PROJ-50: Free-Tier-Watermark fuer Poster-Exporte.
 *
 * Wird beim Render-Zeitpunkt auf das fertige Canvas appliziert, gesteuert
 * vom Server-Flag aus /api/business/authorize-export. Server kann den
 * Watermark nicht enforcen (Render passiert client-side im Browser-Canvas)
 * — der Client trusted dem API-Flag. Trust-Boundary akzeptiert fuer v1.
 *
 * Visual: kleine Wortmarke unten rechts, dezent transparent, in der
 * Brand-Font Cormorant Garamond (siehe project_brand_fonts.md). Soll fuer
 * Etsy-Kreatoren kommerziell unbrauchbar sein, aber Hobby-Privatposter
 * nicht ruinieren.
 */

export interface WatermarkOptions {
  /**
   * Wenn `true`, wird der Watermark auf das Canvas appliziert. Default false.
   */
  watermark?: boolean
}

const WATERMARK_TEXT = 'petite-moment.com'
// Font-Groesse relativ zur Output-Breite (gleiche Logik wie Text-Blocks
// in poster-from-snapshot.ts). 1.4% der Breite = ~28 px bei A4-300dpi.
const WATERMARK_FONT_FRACTION = 0.014
const WATERMARK_OPACITY = 0.4
// Margin von der Ecke, ebenfalls relativ zur Breite.
const WATERMARK_MARGIN_FRACTION = 0.025

/**
 * Appliziert den Free-Tier-Watermark auf ein vollstaendig gerendertes
 * Canvas. Modifiziert das Canvas in-place. Idempotent NICHT — mehrfacher
 * Aufruf zeichnet den Watermark mehrfach (aber Aufrufer ist immer
 * renderPreview, das frisch baut).
 */
export function applyWatermark(canvas: HTMLCanvasElement | OffscreenCanvas): void {
  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null
  if (!ctx) return

  const W = canvas.width
  const H = canvas.height
  const fontSize = Math.max(14, Math.round(W * WATERMARK_FONT_FRACTION))
  const margin = Math.round(W * WATERMARK_MARGIN_FRACTION)

  ctx.save()
  try {
    ctx.font = `${fontSize}px "Cormorant Garamond", "Times New Roman", serif`
    ctx.fillStyle = 'rgba(31, 58, 68, 1)' // Brand-Tiefpetrol #1F3A44
    ctx.globalAlpha = WATERMARK_OPACITY
    ctx.textAlign = 'right'
    ctx.textBaseline = 'alphabetic'
    // Position: rechts unten, mit Margin.
    ctx.fillText(WATERMARK_TEXT, W - margin, H - margin)
  } finally {
    ctx.restore()
  }
}
