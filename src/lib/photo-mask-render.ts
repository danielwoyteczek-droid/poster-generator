/**
 * Pure Letter-Mask renderer — drives the canvas drawing for both the
 * client-side export (`usePhotoExport`) and the server-/order-side
 * snapshot re-render (`poster-from-snapshot`). Extracted so neither
 * caller pulls a React/'use client' boundary across into the other.
 */

import { MASK_FONTS, type MaskFontKey } from './letter-mask'
import type { LetterSlot } from '@/hooks/usePhotoEditorStore'

export interface LetterMaskRenderArgs {
  word: string
  slots: LetterSlot[]
  wordWidth: number
  wordX: number
  wordY: number
  defaultSlotColor: string
  maskFontKey: MaskFontKey
  /** Resolved canvas-compatible font family (already passed through
   *  resolveFontFamily()). The CSS variable `var(--font-mask-anton)`
   *  doesn't resolve inside ctx.font — callers must turn it into the
   *  real generated family name first. */
  maskFontFamily: string
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error(`Failed to load image: ${src}`))
    img.src = src
  })
}

/**
 * Reads the actual generated font-family from a hidden probe element.
 * Needed because `ctx.font = "var(--font-mask-anton), Anton"` won't
 * resolve the CSS variable — but probing in the DOM does.
 */
export function resolveFontFamily(cssFamily: string): string {
  const probe = document.createElement('span')
  probe.style.fontFamily = cssFamily
  probe.style.position = 'absolute'
  probe.style.visibility = 'hidden'
  probe.style.left = '-9999px'
  probe.style.top = '0'
  document.body.appendChild(probe)
  const resolved = window.getComputedStyle(probe).fontFamily
  document.body.removeChild(probe)
  return resolved
}

/**
 * Ensures the mask font is loaded before drawing. The customer's
 * letters silently fall back to the system font if we don't await
 * this — which makes the download look different from the live
 * preview, the worst kind of WYSIWYG break.
 */
export async function ensureMaskFontLoaded(maskFontFamily: string): Promise<void> {
  await document.fonts.ready
  await document.fonts.load(`400 100px ${maskFontFamily}`)
}

/**
 * Asks the browser for the actual baseline offset (distance from a span's
 * top edge to the alphabetic baseline) under the same CSS the editor uses
 * for letter-mask glyphs: `display: block; line-height: 1; white-space: pre`.
 *
 * Why DOM measurement? Canvas's `fontBoundingBox*` metrics don't match the
 * browser's CSS line-box rules for display fonts like Anton — the canvas
 * glyph rendered higher than the CSS-rendered glyph by ~5 % of fontSize.
 * Using the browser's own layout result is pixel-perfect by construction.
 *
 * The trick is to attach a zero-sized inline-block child with
 * `vertical-align: baseline` — its top coincides with the baseline of the
 * surrounding line. Same technique used in popular text-metric libs.
 *
 * Result is cached per (font, fontSize) so repeated calls within a single
 * export are essentially free.
 */
const baselineCache = new Map<string, number>()
export function measureCssBaselineOffset(fontFamily: string, fontSize: number): number {
  const key = `${fontFamily}|${fontSize}`
  const cached = baselineCache.get(key)
  if (cached !== undefined) return cached

  const span = document.createElement('span')
  span.style.cssText = [
    'position: absolute',
    'top: 0',
    'left: 0',
    'visibility: hidden',
    'display: block',
    'line-height: 1',
    'white-space: pre',
    'font-weight: 400',
    `font-family: '${fontFamily}', sans-serif`,
    `font-size: ${fontSize}px`,
    'margin: 0',
    'padding: 0',
  ].join(';')
  span.textContent = 'M' // any cap glyph; baseline doesn't depend on glyph shape

  const baselineMarker = document.createElement('span')
  baselineMarker.style.cssText = 'display: inline-block; width: 0; height: 0; vertical-align: baseline'
  span.appendChild(baselineMarker)

  document.body.appendChild(span)
  const spanTop = span.getBoundingClientRect().top
  const baselineTop = baselineMarker.getBoundingClientRect().top
  document.body.removeChild(span)

  const offset = baselineTop - spanTop
  baselineCache.set(key, offset)
  return offset
}

/**
 * Draws the letter-mask onto a canvas context. Each slot either renders
 * the glyph filled with the slot color (no photo) or composites the
 * customer's photo through the glyph shape (with photo).
 */
export async function drawLetterMask(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  args: LetterMaskRenderArgs,
): Promise<void> {
  const { word, slots, wordWidth, wordX, wordY, defaultSlotColor, maskFontKey, maskFontFamily } = args
  if (word.length === 0) return

  const font = MASK_FONTS[maskFontKey]
  const containerW = wordWidth * W
  const slotW = containerW / word.length
  const slotH = slotW * font.heightOverWidth
  const fontSize = slotW * font.fontSizeOverSlotWidth
  const containerLeft = (wordX - wordWidth / 2) * W
  const containerTop = wordY * H

  // Reproduce CSS `line-height: 1` glyph rendering 1:1.
  //
  // Why not derive from canvas font metrics? Because `fontBoundingBoxAscent`
  // doesn't match the browser's CSS line-box baseline computation for display
  // fonts (Anton et al.) — using halfLeading + ascent gave the wrong y. We
  // ask the browser directly: render an offscreen <span> with the same CSS
  // the editor uses, measure where the actual baseline sits, use that offset.
  // Result is pixel-perfect identical to TextBlockOverlay for any font.
  const emTopOffset = (slotH - fontSize) / 2
  const baselineFromLineTop = measureCssBaselineOffset(maskFontFamily, fontSize)
  const measureCtx = document.createElement('canvas').getContext('2d')!
  measureCtx.font = `400 ${fontSize}px ${maskFontFamily}`

  for (let i = 0; i < slots.length; i++) {
    const slot = slots[i]
    const slotX = containerLeft + i * slotW
    const slotY = containerTop
    const cx = slotX + slotW / 2
    const glyphY = slotY + emTopOffset

    if (slot.photo) {
      // Mask the photo with the letter shape via a temporary canvas:
      // 1. Allocate a temp canvas large enough to contain the rendered glyph
      //    (some characters in display fonts like Anton are wider than their
      //    slot — see PROJ-32 bug: editor's <span> overflows the slot
      //    horizontally, but the export's `tmp = slotW × slotH` would clip
      //    those overflow pixels). We size tmp = max(slotW, glyphW) so the
      //    glyph silhouette renders unclipped, then blit with an offset.
      // 2. Photo position is computed relative to the glyph's bounding box,
      //    matching the editor's CSS `background-clip: text` semantics where
      //    background-position percentages reference the glyph-sized span,
      //    not the slot rect.
      // 3. globalCompositeOperation='destination-in' + fillText keeps only
      //    pixels under the glyph silhouette (alpha-mask).
      // 4. Blit tmp to main canvas with negative offset to absorb any
      //    horizontal overflow — adjacent letters' overflow regions overlap
      //    naturally because tmp is transparent outside the glyph silhouette.
      const photo = slot.photo

      // Measure the glyph using the shared measureCtx (same font already set
      // above for ascent/descent). These dimensions drive both the tmp size
      // and the photo positioning math.
      const glyphW = measureCtx.measureText(slot.char).width
      const glyphH = fontSize // matches editor's `line-height: 1` span height

      const tmpW = Math.ceil(Math.max(slotW, glyphW))
      const tmpH = Math.ceil(Math.max(slotH, glyphH))
      const tmpOffsetX = (tmpW - slotW) / 2
      const tmpOffsetY = (tmpH - slotH) / 2

      const tmp = document.createElement('canvas')
      tmp.width = tmpW
      tmp.height = tmpH
      const tctx = tmp.getContext('2d')
      if (!tctx) continue

      // Glyph position inside tmp — centred horizontally, vertically aligned
      // with editor's `flex items-center` (span centred in slot).
      const glyphLeftInTmp = (tmpW - glyphW) / 2
      const glyphTopInTmp = tmpOffsetY + emTopOffset

      try {
        const img = await loadImage(photo.publicUrl)
        // Cover-scale relative to slot dimensions (matches editor's bgSize
        // computation, which uses `parent.getBoundingClientRect()` = slot).
        const sx = slotW / photo.width
        const sy = slotH / photo.height
        const coverScale = Math.max(sx, sy) * photo.scale
        const drawW = photo.width * coverScale
        const drawH = photo.height * coverScale
        // Position image relative to GLYPH bounds (= editor's span coords),
        // then add tmpOffset so it lives in tmp's coordinate system.
        const drawX = glyphLeftInTmp + (glyphW - drawW) * (0.5 - photo.cropX)
        const drawY = glyphTopInTmp + (glyphH - drawH) * (0.5 - photo.cropY)
        tctx.drawImage(img, drawX, drawY, drawW, drawH)
      } catch (err) {
        // If the photo fails to load, fall back to the slot color so the
        // export still produces a usable poster instead of throwing.
        console.warn('[photo-mask-render] photo load failed, falling back to color:', err)
        tctx.fillStyle = slot.color ?? defaultSlotColor
        tctx.fillRect(0, 0, tmp.width, tmp.height)
      }

      tctx.globalCompositeOperation = 'destination-in'
      tctx.fillStyle = '#000'
      tctx.font = `400 ${fontSize}px ${maskFontFamily}`
      tctx.textAlign = 'center'
      tctx.textBaseline = 'alphabetic'
      tctx.fillText(slot.char, tmpW / 2, glyphTopInTmp + baselineFromLineTop)

      // Blit with negative offset so the slot region of tmp lands at the
      // slot's position on the main canvas. Glyph overflow areas extend
      // into neighbouring slots' regions; that's intentional and matches
      // the editor (transparent tmp pixels outside the glyph keep the
      // neighbour's content visible).
      ctx.drawImage(tmp, slotX - tmpOffsetX, slotY - tmpOffsetY)
    } else {
      // No photo — fill the glyph directly in the slot color
      ctx.fillStyle = slot.color ?? defaultSlotColor
      ctx.font = `400 ${fontSize}px ${maskFontFamily}`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'alphabetic'
      ctx.fillText(slot.char, cx, glyphY + baselineFromLineTop)
    }
  }
}
