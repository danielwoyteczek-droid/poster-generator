/**
 * Photo-grid renderer (PROJ-32) — drives the canvas drawing for the
 * client-side export when `layoutMode === 'photo-grid'`. Mirrors the
 * editor's `PhotoGridOverlay` positioning + per-slot pan/zoom so the
 * exported PNG/PDF matches WYSIWYG.
 *
 * Each slot is laid out as a fractional rectangle on the poster, the
 * photo is "cover"-fit + zoomed (`scale`) + panned (`cropX`, `cropY`)
 * and clipped by the slot's mask shape (rect / circle / heart / …).
 * Empty slots get a flat color fill (per-slot override or fallback).
 */

import type {
  GridSlotDefinition,
  GridSlotMaskKey,
} from './grid-layout'
import type { GridSlotState, SlotPhoto } from '@/hooks/usePhotoEditorStore'

export interface PhotoGridRenderArgs {
  layout: GridSlotDefinition[]
  slots: GridSlotState[]
  defaultSlotColor: string
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
 * Builds the clip path for the given slot mask. Coords are relative to
 * (0, 0) within a `boxW × boxH` rectangle — caller must `ctx.translate()`
 * first so the box origin is at the right poster spot. Same shape table
 * as `photo-single-render.ts` so both modes look identical visually.
 */
function clipMaskInto(
  ctx: CanvasRenderingContext2D,
  maskKey: GridSlotMaskKey,
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
      // as `GRID_SLOT_MASKS.heart.clipPath` and `photo-single-render`.
      const sx = boxW / 100
      const sy = boxH / 100
      ctx.moveTo(50 * sx, 88 * sy)
      ctx.bezierCurveTo(50 * sx, 88 * sy, 6 * sx, 60 * sy, 6 * sx, 30 * sy)
      ctx.bezierCurveTo(6 * sx, 15 * sy, 18 * sx, 4 * sy, 32 * sx, 4 * sy)
      ctx.bezierCurveTo(40 * sx, 4 * sy, 46 * sx, 8 * sy, 50 * sx, 14 * sy)
      ctx.bezierCurveTo(54 * sx, 8 * sy, 60 * sx, 4 * sy, 68 * sx, 4 * sy)
      ctx.bezierCurveTo(82 * sx, 4 * sy, 94 * sx, 15 * sy, 94 * sx, 30 * sy)
      ctx.bezierCurveTo(94 * sx, 60 * sy, 50 * sx, 88 * sy, 50 * sx, 88 * sy)
      ctx.closePath()
      break
    }
    case 'rect':
    case 'square':
    case 'portrait':
    case 'landscape':
    default:
      ctx.rect(0, 0, boxW, boxH)
      break
  }
  ctx.clip()
}

/**
 * Draw one slot — color fill if empty, cover-fit photo if filled. The
 * cover math + crop math mirror `photo-single-render.drawSinglePhoto`
 * and `PhotoGridOverlay` so editor and export agree pixel-for-pixel.
 */
async function drawSlot(
  ctx: CanvasRenderingContext2D,
  def: GridSlotDefinition,
  state: GridSlotState | undefined,
  defaultColor: string,
  W: number,
  H: number,
): Promise<void> {
  const boxX = def.x * W
  const boxY = def.y * H
  const boxW = def.width * W
  const boxH = def.height * H
  const color = state?.color ?? defaultColor
  const photo: SlotPhoto | null = state?.photo ?? null

  ctx.save()
  ctx.translate(boxX, boxY)
  clipMaskInto(ctx, def.mask, boxW, boxH)

  if (!photo) {
    ctx.fillStyle = color
    ctx.fillRect(0, 0, boxW, boxH)
    ctx.restore()
    return
  }

  let img: HTMLImageElement
  try {
    img = await loadImage(photo.publicUrl)
  } catch (err) {
    console.warn('[photo-grid-render] photo load failed:', err)
    ctx.fillStyle = color
    ctx.fillRect(0, 0, boxW, boxH)
    ctx.restore()
    return
  }

  // Cover-scale relative to the box, like CSS `object-cover`. Multiplied
  // by the customer's zoom (`photo.scale`).
  const sx = boxW / photo.width
  const sy = boxH / photo.height
  const coverScale = Math.max(sx, sy) * photo.scale
  const drawW = photo.width * coverScale
  const drawH = photo.height * coverScale
  // Centre, then offset by crop. Same sign convention as
  // `photo-single-render` so editor + export stay in sync.
  const drawX = (boxW - drawW) / 2 - photo.cropX * boxW
  const drawY = (boxH - drawH) / 2 - photo.cropY * boxH

  ctx.drawImage(img, drawX, drawY, drawW, drawH)
  ctx.restore()
}

/**
 * Draws the full photo-grid layout onto the canvas. Slots are rendered
 * in array order — admin can use that to layer overlapping rectangles
 * intentionally, though most layouts won't overlap.
 */
export async function drawPhotoGrid(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  args: PhotoGridRenderArgs,
): Promise<void> {
  const { layout, slots, defaultSlotColor } = args
  if (layout.length === 0) return
  // Run sequentially — image decode is fast enough that parallel doesn't
  // help much, and order matters for any overlapping authored layouts.
  for (let i = 0; i < layout.length; i++) {
    await drawSlot(ctx, layout[i], slots[i], defaultSlotColor, W, H)
  }
}
