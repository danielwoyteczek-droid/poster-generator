import { DTF_TARGET_DPI } from './dtf-constants'
import type { DtfTextElement } from '@/hooks/useDtfStore'

/**
 * PROJ-55: Textelement in ein Bild mit Druckauflösung verwandeln.
 *
 * Läuft im Browser beim Ablegen in den Warenkorb. Danach ist Text für
 * Vorschau und Druckdatei schlicht ein Bild mehr — kein zweiter Zeichenweg,
 * keine Schrifteinbettung in der PDF, und vor allem: **Vorschau und Druck
 * können nicht auseinanderlaufen**, weil beide dieselbe Rastergrafik zeigen.
 * Bei einem Produkt mit verbindlicher Druckfreigabe wiegt das schwerer als
 * scharfe Vektorkanten.
 *
 * Der Map-Editor macht es beim Export genauso — dort zeichnet
 * `useMapExport` Text mit `ctx.fillText` auf die Leinwand. Wir bleiben also
 * konsistent zum Bestehenden.
 *
 * Zeilen entstehen ausschließlich durch Zeilenumbrüche im Text; der Editor
 * bricht nicht automatisch um. Damit ist die Zeilenaufteilung hier und im
 * Editor zwangsläufig identisch.
 */

/** Zeilenhöhe als Vielfaches der Schriftgröße — muss zu DtfTextRender passen. */
const LINE_HEIGHT = 1.15

export interface RasteredText {
  blob: Blob
  widthPx: number
  heightPx: number
  widthMm: number
  heightMm: number
}

export async function rasterizeTextElement(el: DtfTextElement): Promise<RasteredText> {
  const pxPerMm = DTF_TARGET_DPI / 25.4
  const fontSizePx = el.fontSizeMm * pxPerMm
  const lines = (el.uppercase ? el.text.toUpperCase() : el.text).split('\n')

  // Erst messen, dann zeichnen: Die Leinwand muss groß genug sein, bevor
  // etwas darauf landet.
  const measureCanvas = document.createElement('canvas')
  const measureCtx = measureCanvas.getContext('2d')
  if (!measureCtx) throw new Error('Canvas nicht verfügbar')

  const fontSpec = `${el.bold ? '700' : '400'} ${fontSizePx}px "${el.fontFamily}", system-ui, sans-serif`
  measureCtx.font = fontSpec
  // Laufweite als Vielfaches der Schriftgröße, wie im Editor. Canvas2D
  // versteht sie erst ab Chrome 99 / Safari 16.4; ältere Browser ignorieren
  // sie stillschweigend — dieselbe Einschränkung wie beim Poster-Export.
  measureCtx.letterSpacing = `${el.letterSpacingEm * fontSizePx}px`

  const lineWidths = lines.map((line) => measureCtx.measureText(line || ' ').width)
  const contentWidth = Math.max(1, ...lineWidths)
  const lineHeightPx = fontSizePx * LINE_HEIGHT
  const contentHeight = lineHeightPx * lines.length

  // Etwas Luft, damit Unterlängen und weit auslaufende Schreibschriften
  // nicht abgeschnitten werden.
  const padding = Math.ceil(fontSizePx * 0.25)
  const widthPx = Math.ceil(contentWidth) + padding * 2
  const heightPx = Math.ceil(contentHeight) + padding * 2

  const canvas = document.createElement('canvas')
  canvas.width = widthPx
  canvas.height = heightPx
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas nicht verfügbar')

  // Kein Hintergrund füllen — der Bogen ist Folie. Eine weiße Fläche würde
  // mitgedruckt und den Transfer zum Aufkleber machen.
  ctx.font = fontSpec
  ctx.letterSpacing = `${el.letterSpacingEm * fontSizePx}px`
  ctx.fillStyle = el.color
  ctx.textBaseline = 'top'
  ctx.textAlign = el.align === 'center' ? 'center' : el.align === 'right' ? 'right' : 'left'

  const originX =
    el.align === 'center' ? widthPx / 2 : el.align === 'right' ? widthPx - padding : padding

  lines.forEach((line, index) => {
    // Innerhalb der Zeilenhöhe zentrieren, damit die Grundlinie sitzt.
    const y = padding + index * lineHeightPx + (lineHeightPx - fontSizePx) / 2
    ctx.fillText(line, originX, y)
  })

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/png'),
  )
  if (!blob) throw new Error('Text konnte nicht gerastert werden')

  return {
    blob,
    widthPx,
    heightPx,
    widthMm: widthPx / pxPerMm,
    heightMm: heightPx / pxPerMm,
  }
}
