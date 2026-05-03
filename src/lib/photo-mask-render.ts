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

  // Reproduce CSS `line-height: 1` glyph rendering 1:1. Naive
  // `textBaseline: 'top'` lines up the em-square top with `glyphY`, but for
  // display fonts like Anton the visible glyph extends ABOVE the em-square
  // (ascent + descent > fontSize). CSS handles this via half-leading
  // (negative for tall fonts). We mirror that here using fontBounding
  // metrics + an alphabetic-baseline anchor — matches `drawTextBlocks` in
  // useMapExport. PROJ-32: word visually slid up in portrait export
  // because of this mismatch.
  const emTopOffset = (slotH - fontSize) / 2
  const measureCtx = document.createElement('canvas').getContext('2d')!
  measureCtx.font = `400 ${fontSize}px ${maskFontFamily}`
  const fm = measureCtx.measureText('Hg')
  const ascent = fm.fontBoundingBoxAscent > 0 ? fm.fontBoundingBoxAscent : fontSize * 0.8
  const descent = fm.fontBoundingBoxDescent > 0 ? fm.fontBoundingBoxDescent : fontSize * 0.2
  const halfLeading = (fontSize - ascent - descent) / 2
  // Distance from line-box top (= emTopOffset in slot coords) to baseline.
  const baselineFromLineTop = halfLeading + ascent

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
