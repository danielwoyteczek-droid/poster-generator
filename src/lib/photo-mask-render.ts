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

  for (let i = 0; i < slots.length; i++) {
    const slot = slots[i]
    const slotX = containerLeft + i * slotW
    const slotY = containerTop
    const cx = slotX + slotW / 2
    const cy = slotY + slotH / 2

    if (slot.photo) {
      // Mask the photo with the letter shape via a temporary canvas:
      // 1. Draw the photo (cover-sized + cropX/cropY pan applied)
      // 2. globalCompositeOperation = 'destination-in' + fillText keeps
      //    only the pixels under the glyph
      // 3. Blit the temp canvas onto the main canvas at the slot rect
      const photo = slot.photo
      const tmp = document.createElement('canvas')
      tmp.width = Math.ceil(slotW)
      tmp.height = Math.ceil(slotH)
      const tctx = tmp.getContext('2d')
      if (!tctx) continue

      try {
        const img = await loadImage(photo.publicUrl)
        const sx = tmp.width / photo.width
        const sy = tmp.height / photo.height
        const coverScale = Math.max(sx, sy) * photo.scale
        const drawW = photo.width * coverScale
        const drawH = photo.height * coverScale
        // Center, then shift by cropX/cropY (pan offsets, -0.5..0.5 of
        // slot dimension — same convention as LetterMaskOverlay)
        const drawX = (tmp.width - drawW) / 2 - photo.cropX * tmp.width
        const drawY = (tmp.height - drawH) / 2 - photo.cropY * tmp.height
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
      tctx.textBaseline = 'middle'
      tctx.fillText(slot.char, tmp.width / 2, tmp.height / 2)

      ctx.drawImage(tmp, slotX, slotY)
    } else {
      // No photo — fill the glyph directly in the slot color
      ctx.fillStyle = slot.color ?? defaultSlotColor
      ctx.font = `400 ${fontSize}px ${maskFontFamily}`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(slot.char, cx, cy)
    }
  }
}
