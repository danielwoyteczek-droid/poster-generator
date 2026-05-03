/**
 * Single-photo renderer — drives the canvas drawing for the client-side
 * export (`usePhotoExport`). Mirrors the editor's `SinglePhotoOverlay`
 * positioning so the exported PNG/PDF matches WYSIWYG.
 *
 * Each mask either fills the whole poster (`full`) or sits centred at
 * 80 % of the poster width with the mask's intrinsic aspect ratio.
 */

import type { PhotoMaskKey } from './photo-masks'
import { PHOTO_MASKS } from './photo-masks'
import type { SinglePhotoState } from '@/hooks/usePhotoEditorStore'
import { filterCss } from './photo-filters'

export interface SinglePhotoRenderArgs {
  photo: SinglePhotoState
  maskKey: PhotoMaskKey
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
 * Builds the clip path for the given mask onto the canvas context. Coords
 * are relative to (0, 0) within a `boxW × boxH` rectangle — caller must
 * `ctx.translate()` first so the box origin is at the right poster spot.
 */
function clipMaskInto(
  ctx: CanvasRenderingContext2D,
  maskKey: PhotoMaskKey,
  boxW: number,
  boxH: number,
): void {
  ctx.beginPath()
  switch (maskKey) {
    case 'circle': {
      const r = Math.min(boxW, boxH) / 2
      ctx.arc(boxW / 2, boxH / 2, r, 0, Math.PI * 2)
      break
    }
    case 'heart': {
      // Hand-traced heart silhouette in 100×100 viewBox space — same path
      // as `PHOTO_MASKS.heart.clipPath`. Transformed into box coords by
      // scaling each segment uniformly.
      const s = boxW / 100 // square (boxW === boxH for heart mask)
      ctx.moveTo(50 * s, 88 * s)
      ctx.bezierCurveTo(50 * s, 88 * s, 6 * s, 60 * s, 6 * s, 30 * s)
      ctx.bezierCurveTo(6 * s, 15 * s, 18 * s, 4 * s, 32 * s, 4 * s)
      ctx.bezierCurveTo(40 * s, 4 * s, 46 * s, 8 * s, 50 * s, 14 * s)
      ctx.bezierCurveTo(54 * s, 8 * s, 60 * s, 4 * s, 68 * s, 4 * s)
      ctx.bezierCurveTo(82 * s, 4 * s, 94 * s, 15 * s, 94 * s, 30 * s)
      ctx.bezierCurveTo(94 * s, 60 * s, 50 * s, 88 * s, 50 * s, 88 * s)
      ctx.closePath()
      break
    }
    case 'full':
    case 'square':
    case 'portrait':
    case 'landscape':
    default:
      // Plain rectangle — no special silhouette.
      ctx.rect(0, 0, boxW, boxH)
      break
  }
  ctx.clip()
}

/**
 * Maps a CSS `filter` token (the same string we set via `filterCss`) onto
 * a canvas context. Browsers that ship Canvas Filters (all evergreens)
 * accept the string verbatim.
 */
function applyCanvasFilter(ctx: CanvasRenderingContext2D, filter: SinglePhotoState['filter']): void {
  const css = filterCss(filter)
  ctx.filter = css === 'none' ? 'none' : css
}

/**
 * Draws the single-photo layout onto a canvas context. Compose:
 *   1. Compute the bounding box (full-bleed for `full`, centred 80 %-wide
 *      box for the others, sized to the mask's aspect ratio).
 *   2. Translate origin to box top-left, install the mask clip path.
 *   3. Compute "cover" sizing for the photo: scale image so its smaller
 *      dimension fully covers the box, multiply by `photo.scale` for the
 *      customer's zoom.
 *   4. Apply the editor's pan offset: (cropX, cropY) ∈ [-0.5, 0.5].
 *      Positive cropX shows the LEFT portion of the photo (mirrors
 *      `SinglePhotoOverlay`'s `bgX = 50 - cropX*100` math).
 *   5. Apply CSS-filter via canvas filter (all evergreens support it).
 *   6. Draw, restore.
 */
export async function drawSinglePhoto(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  args: SinglePhotoRenderArgs,
): Promise<void> {
  const { photo, maskKey } = args
  const mask = PHOTO_MASKS[maskKey]

  let boxW: number
  let boxH: number
  let boxX: number
  let boxY: number

  if (mask.aspectRatio) {
    // Aspect-bound mask — match editor's `width: 80%` + `aspect-ratio`.
    boxW = W * 0.8
    boxH = boxW / mask.aspectRatio
    // If the height would overflow vertically (e.g. landscape on portrait
    // poster), shrink to fit and re-derive the width.
    if (boxH > H * 0.8) {
      boxH = H * 0.8
      boxW = boxH * mask.aspectRatio
    }
    boxX = (W - boxW) / 2
    boxY = (H - boxH) / 2
  } else {
    // Full-bleed mask
    boxW = W
    boxH = H
    boxX = 0
    boxY = 0
  }

  let img: HTMLImageElement
  try {
    img = await loadImage(photo.publicUrl)
  } catch (err) {
    console.warn('[photo-single-render] photo load failed:', err)
    return
  }

  // Cover-scale relative to the box, like CSS `object-cover`.
  const sx = boxW / photo.width
  const sy = boxH / photo.height
  const coverScale = Math.max(sx, sy) * photo.scale
  const drawW = photo.width * coverScale
  const drawH = photo.height * coverScale
  // Centre, then offset by crop. cropX positive = show LEFT portion =
  // photo origin shifts RIGHT (matches editor: bgX < 50 means we move
  // background to show its left side).
  const drawX = (boxW - drawW) / 2 - photo.cropX * boxW
  const drawY = (boxH - drawH) / 2 - photo.cropY * boxH

  ctx.save()
  ctx.translate(boxX, boxY)
  clipMaskInto(ctx, maskKey, boxW, boxH)
  applyCanvasFilter(ctx, photo.filter)
  ctx.drawImage(img, drawX, drawY, drawW, drawH)
  ctx.filter = 'none'
  ctx.restore()
}
