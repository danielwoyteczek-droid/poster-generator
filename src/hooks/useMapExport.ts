'use client'

import { useState } from 'react'
import { useEditorStore, type TextBlock, type ViewState, type MarkerState, type SecondMapState, type ShapeConfigState } from './useEditorStore'
import { composeMaskSvg, composeFrameSvg, composeFullbleedMaskSvg, composeSplitSeamSvg, parseShapeSvg, svgToDataUrl, hasAnyFrame } from '@/lib/mask-composer'
import { PRINT_FORMATS, type PrintFormat } from '@/lib/print-formats'
import { MAP_MASKS, type MapMaskKey } from '@/lib/map-masks'
import { resolveMask } from '@/hooks/useCustomMasks'
import { getCoordinatesText } from '@/components/editor/TextBlockOverlay'
import { PHOTO_MASKS, type PhotoMaskKey } from '@/lib/photo-masks'
import { filterCss } from '@/lib/photo-filters'
import { buildPetiteStyle } from '@/lib/petite-style-loader'
import { computeFontScale } from '@/lib/font-scale'
import { getPalette, type MapPaletteColors } from '@/lib/map-palettes'
import type { PhotoItem, SplitPhoto } from './useEditorStore'

// ─── Types ─────────────────────────────────────────────────────────────────

export interface ExportSnapshot {
  viewState: ViewState
  styleId: string
  paletteId?: string
  customPaletteBase?: string | null
  customPalette?: MapPaletteColors | null
  streetLabelsVisible?: boolean
  posterDarkMode?: boolean
  maskKey: MapMaskKey
  marker: MarkerState
  secondMarker: MarkerState
  secondMap: SecondMapState
  shapeConfig?: ShapeConfigState
  textBlocks: TextBlock[]
  locationName: string
  photos?: PhotoItem[]
  splitMode?: 'none' | 'second-map' | 'photo'
  splitPhoto?: SplitPhoto | null
  splitPhotoZone?: number
  layoutId?: import('./useEditorStore').PosterLayoutId
  innerMarginMm?: number
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error(`Failed to load image: ${src}`))
    img.src = src
  })
}

function makePinSVGUrl(type: 'classic' | 'heart', color: string): string {
  const c = encodeURIComponent(color)
  const svg =
    type === 'heart'
      ? `<svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M16 30C16 30 2 19 2 10C2 5.58 5.58 2 10 2C12.5 2 14.74 3.18 16 5C17.26 3.18 19.5 2 22 2C26.42 2 30 5.58 30 10C30 19 16 30 16 30Z" fill="${c}"/></svg>`
      : `<svg width="28" height="40" viewBox="0 0 28 40" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M14 0C6.27 0 0 6.27 0 14C0 24.5 14 40 14 40C14 40 28 24.5 28 14C28 6.27 21.73 0 14 0Z" fill="${c}"/><circle cx="14" cy="13" r="5" fill="white" fill-opacity="0.85"/></svg>`
  return 'data:image/svg+xml;charset=utf-8,' + svg
}

function applyPhotoMask(
  ctx: CanvasRenderingContext2D,
  maskKey: PhotoMaskKey,
  x: number,
  y: number,
  w: number,
  h: number,
): void {
  ctx.beginPath()
  if (maskKey === 'circle') {
    const cx = x + w / 2
    const cy = y + h / 2
    const r = Math.min(w, h) / 2
    ctx.arc(cx, cy, r, 0, Math.PI * 2)
  } else if (maskKey === 'heart') {
    const sx = w / 100
    const sy = h / 100
    ctx.moveTo(x + 50 * sx, y + 88 * sy)
    ctx.bezierCurveTo(x + 50 * sx, y + 88 * sy, x + 6 * sx, y + 60 * sy, x + 6 * sx, y + 30 * sy)
    ctx.bezierCurveTo(x + 6 * sx, y + 15 * sy, x + 18 * sx, y + 4 * sy, x + 32 * sx, y + 4 * sy)
    ctx.bezierCurveTo(x + 40 * sx, y + 4 * sy, x + 46 * sx, y + 8 * sy, x + 50 * sx, y + 14 * sy)
    ctx.bezierCurveTo(x + 54 * sx, y + 8 * sy, x + 60 * sx, y + 4 * sy, x + 68 * sx, y + 4 * sy)
    ctx.bezierCurveTo(x + 82 * sx, y + 4 * sy, x + 94 * sx, y + 15 * sy, x + 94 * sx, y + 30 * sy)
    ctx.bezierCurveTo(x + 94 * sx, y + 60 * sy, x + 50 * sx, y + 88 * sy, x + 50 * sx, y + 88 * sy)
    ctx.closePath()
  } else {
    ctx.rect(x, y, w, h)
  }
  ctx.clip()
}

async function drawPhotos(
  ctx: CanvasRenderingContext2D,
  photos: PhotoItem[],
  posterW: number,
  posterH: number,
): Promise<void> {
  for (const photo of photos) {
    let img: HTMLImageElement
    try {
      img = await loadImage(photo.publicUrl)
    } catch {
      continue
    }
    const mask = PHOTO_MASKS[photo.maskKey]
    const x = photo.x * posterW
    const y = photo.y * posterH
    const w = photo.scale * posterW
    const h = mask.aspectRatio
      ? (photo.scale / mask.aspectRatio) * posterW
      : (photo.scale / (img.naturalWidth / img.naturalHeight)) * posterW

    const imgAspect = img.naturalWidth / img.naturalHeight
    const containerAspect = w / h
    let drawW: number, drawH: number
    if (imgAspect > containerAspect) {
      drawH = h
      drawW = h * imgAspect
    } else {
      drawW = w
      drawH = w / imgAspect
    }
    const dx = x + (w - drawW) / 2 + photo.cropX * w
    const dy = y + (h - drawH) / 2 + photo.cropY * h

    ctx.save()
    applyPhotoMask(ctx, photo.maskKey, x, y, w, h)
    const css = filterCss(photo.filter)
    if (css !== 'none') ctx.filter = css
    ctx.drawImage(img, dx, dy, drawW, drawH)
    ctx.filter = 'none'
    ctx.restore()
  }
}

async function drawSplitPhoto(
  ctx: CanvasRenderingContext2D,
  splitPhoto: SplitPhoto,
  svgPath: string,
  posterW: number,
  posterH: number,
): Promise<void> {
  let img: HTMLImageElement
  try {
    img = await loadImage(splitPhoto.publicUrl)
  } catch {
    return
  }

  const off = document.createElement('canvas')
  off.width = posterW
  off.height = posterH
  const octx = off.getContext('2d')!

  // object-cover geometry to fill the full poster area, respecting cropScale/X/Y
  const imgAspect = img.naturalWidth / img.naturalHeight
  const containerAspect = posterW / posterH
  let drawW: number, drawH: number
  if (imgAspect > containerAspect) {
    drawH = posterH
    drawW = posterH * imgAspect
  } else {
    drawW = posterW
    drawH = posterW / imgAspect
  }
  drawW *= splitPhoto.cropScale
  drawH *= splitPhoto.cropScale
  const dx = (posterW - drawW) / 2 + splitPhoto.cropX * posterW
  const dy = (posterH - drawH) / 2 + splitPhoto.cropY * posterH

  const css = filterCss(splitPhoto.filter)
  if (css !== 'none') octx.filter = css
  octx.drawImage(img, dx, dy, drawW, drawH)
  octx.filter = 'none'

  const maskImg = await loadImage(svgPath)
  octx.globalCompositeOperation = 'destination-in'
  octx.drawImage(maskImg, 0, 0, posterW, posterH)
  octx.globalCompositeOperation = 'source-over'
  ctx.drawImage(off, 0, 0)
}

function wait(ms: number) {
  return new Promise<void>((resolve) => window.setTimeout(resolve, ms))
}

/**
 * Projects a lat/lng to pixel-space within a canvas of size width×height, using
 * a rectangular viewport described by `bounds`. Uses Web-Mercator (valid
 * because our maps are flat: no pitch, no bearing).
 */
function projectLngLat(
  lng: number, lat: number,
  bounds: ViewState['bounds'],
  width: number, height: number,
): { x: number; y: number } {
  const toMerc = (lo: number, la: number) => {
    const x = (lo + 180) / 360
    const y = (1 - Math.log(Math.tan((la * Math.PI) / 180) + 1 / Math.cos((la * Math.PI) / 180)) / Math.PI) / 2
    return { x, y }
  }
  const p = toMerc(lng, lat)
  const nw = toMerc(bounds.west, bounds.north)
  const se = toMerc(bounds.east, bounds.south)
  const spanX = se.x - nw.x || 1
  const spanY = se.y - nw.y || 1
  return {
    x: ((p.x - nw.x) / spanX) * width,
    y: ((p.y - nw.y) / spanY) * height,
  }
}

function waitForEventOnce(target: any, eventName: string) {
  return new Promise<void>((resolve) => {
    const handler = () => { target.off(eventName, handler); resolve() }
    target.on(eventName, handler)
  })
}

async function waitForMapStable(map: any) {
  if (!map.loaded()) {
    await waitForEventOnce(map, 'load')
  }
  // Headless-Browser-Quirk (PROJ-30): idle-Event feuert in Headless-Chromium
  // manchmal nicht zuverlässig. Fallback nach 8s — Tiles sind dann praktisch
  // immer da, und triggerRepaint() unten erzwingt einen frischen Render.
  await Promise.race([
    new Promise<void>((resolve) => { map.once('idle', () => resolve()) }),
    new Promise<void>((resolve) => setTimeout(resolve, 8000)),
  ])
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
  await wait(150)
}

// ─── Offscreen map renderer ────────────────────────────────────────────────

async function renderMapOffscreen({
  styleId,
  vs,
  previewW,
  previewH,
  outputW,
  outputH,
  paletteId,
  customPaletteBase,
  customPalette,
  streetLabelsVisible,
}: {
  styleId: string
  vs: ViewState
  previewW: number
  previewH: number
  outputW: number
  outputH: number
  paletteId?: string
  customPaletteBase?: string | null
  customPalette?: MapPaletteColors | null
  streetLabelsVisible?: boolean
}): Promise<{ canvas: HTMLCanvasElement; bounds: ViewState['bounds'] }> {
  const maptilersdk = await import('@maptiler/sdk')
  const apiKey = process.env.NEXT_PUBLIC_MAPTILER_API_KEY!

  const pixelRatio = (outputW / previewW + outputH / previewH) / 2

  const container = document.createElement('div')
  // Keep the element off-screen but do NOT use opacity:0 — iOS Safari may
  // skip WebGL rendering for fully transparent elements.
  container.style.cssText = `position:fixed;left:-99999px;top:0;width:${previewW}px;height:${previewH}px;pointer-events:none;`
  document.body.appendChild(container)

  const resolvedStyle = await buildPetiteStyle({
    layoutId: styleId,
    paletteId: paletteId ?? 'mint',
    customPaletteBase: customPaletteBase ?? null,
    customPalette: customPalette ?? null,
    streetLabelsVisible: streetLabelsVisible ?? false,
    apiKey,
  })

  let map: any = null
  try {
    maptilersdk.config.apiKey = apiKey
    map = new maptilersdk.Map({
      container,
      style: resolvedStyle as any,
      center: [vs.lng, vs.lat],
      zoom: vs.zoom,
      attributionControl: false,
      navigationControl: false,
      geolocateControl: false,
      fullscreenControl: false,
      scaleControl: false,
      hash: false,
      interactive: false,
      preserveDrawingBuffer: true,
      pitch: 0,
      bearing: 0,
      fadeDuration: 0,
      renderWorldCopies: false,
      pixelRatio,
      maxCanvasSize: [8192, 8192],
    } as any)

    map.resize()
    await waitForMapStable(map)

    // iOS Safari WebGL quirk: by the time we reach getCanvas() the framebuffer
    // may already have been cleared for compositing, even with
    // preserveDrawingBuffer:true. Force a fresh render right before capture
    // and wait for its 'render' event so the buffer is guaranteed populated.
    await new Promise<void>((resolve) => {
      let done = false
      const finish = () => {
        if (done) return
        done = true
        resolve()
      }
      map.once('render', finish)
      map.triggerRepaint?.()
      // Safety timeout in case the render event never fires (e.g. style
      // already fully painted) — don't hang the export forever.
      setTimeout(finish, 500)
    })

    const srcCanvas = map.getCanvas() as HTMLCanvasElement
    const dst = document.createElement('canvas')
    dst.width = outputW
    dst.height = outputH
    dst.getContext('2d')!.drawImage(srcCanvas, 0, 0, outputW, outputH)

    // Bounds aus dem tatsächlich gerenderten Map-Viewport ablesen — überschreibt
    // ggf. veraltete bounds aus dem Editor-Store (im Headless-Mode bleiben die
    // sonst auf den Default-Werten {0,0,0,0} und brechen die Marker-Projektion).
    const lngLatBounds = map.getBounds()
    const bounds = {
      west: lngLatBounds.getWest(),
      south: lngLatBounds.getSouth(),
      east: lngLatBounds.getEast(),
      north: lngLatBounds.getNorth(),
    }

    return { canvas: dst, bounds }
  } finally {
    try { map?.remove?.() } catch { /* ignore */ }
    container.remove()
  }
}

// ─── Mask application ──────────────────────────────────────────────────────

async function applyMask(canvas: HTMLCanvasElement, svgPath: string): Promise<HTMLCanvasElement> {
  const out = document.createElement('canvas')
  out.width = canvas.width
  out.height = canvas.height
  const ctx = out.getContext('2d')!
  ctx.drawImage(canvas, 0, 0)
  const maskImg = await loadImage(svgPath)
  ctx.globalCompositeOperation = 'destination-in'
  ctx.drawImage(maskImg, 0, 0, out.width, out.height)
  ctx.globalCompositeOperation = 'source-over'
  return out
}

// ─── Text blocks ───────────────────────────────────────────────────────────

async function ensureFontsLoaded(textBlocks: TextBlock[]) {
  await document.fonts.ready
  const families = [...new Set(textBlocks.map((b) => b.fontFamily))]
  await Promise.all(families.flatMap((f) => [
    document.fonts.load(`normal 16px "${f}"`),
    document.fonts.load(`bold 16px "${f}"`),
  ]))
}

function drawTextBlocks(
  ctx: CanvasRenderingContext2D,
  textBlocks: TextBlock[],
  displayTexts: Record<string, string>,
  W: number,
  H: number,
  previewW: number,
  previewH: number,
) {
  const scaleX = W / previewW
  // Match PosterCanvas's live preview so text renders at the same
  // poster-relative ratio on every device and every render path.
  const fontScale = computeFontScale(previewW)

  for (const block of textBlocks) {
    const raw = displayTexts[block.id] ?? block.text
    const text = block.uppercase ? raw.toUpperCase() : raw
    if (!text.trim()) continue

    const scaledFontSize = Math.max(8, Math.round(block.fontSize * scaleX * fontScale))
    const weight = block.bold ? 'bold' : 'normal'
    ctx.font = `${weight} ${scaledFontSize}px "${block.fontFamily}", sans-serif`
    ctx.fillStyle = block.color
    ctx.textAlign = block.align
    ctx.textBaseline = 'alphabetic'

    const blockLeft = block.x * W
    const blockTop = block.y * H
    const blockW = block.width * W
    const lineH = Math.round(scaledFontSize * 1.2)

    // Reproduce CSS line-height:1.2 exactly, including fonts whose content area > line-height.
    // halfLeading = (lineHeight - contentArea) / 2 — can be negative for tall/script fonts.
    const m = ctx.measureText('Hg')
    const ascent = m.fontBoundingBoxAscent > 0 ? m.fontBoundingBoxAscent : scaledFontSize * 0.8
    const descent = m.fontBoundingBoxDescent > 0 ? m.fontBoundingBoxDescent : scaledFontSize * 0.2
    const halfLeading = (lineH - ascent - descent) / 2
    const firstBaselineY = blockTop + halfLeading + ascent

    const anchorX =
      block.align === 'center' ? blockLeft + blockW / 2
      : block.align === 'right' ? blockLeft + blockW
      : blockLeft

    for (const [i, line] of text.split('\n').entries()) {
      ctx.fillText(line, anchorX, firstBaselineY + i * lineH)
    }
  }
}

// ─── Canvas builder ────────────────────────────────────────────────────────

export async function buildPosterCanvas(
  format: PrintFormat,
  store: ExportSnapshot,
): Promise<HTMLCanvasElement> {
  const fmt = PRINT_FORMATS[format]
  const W = fmt.widthPx
  const H = fmt.heightPx

  const { viewState, styleId, maskKey, marker, secondMarker, secondMap, shapeConfig, textBlocks, locationName } = store
  const mask = (await resolveMask(maskKey)) ?? MAP_MASKS.none
  const splitMode = store.splitMode ?? (secondMap.enabled ? 'second-map' : 'none')
  const splitPhoto = store.splitPhoto ?? null
  const splitPhotoZone = store.splitPhotoZone ?? 1
  const isDualMap = mask.isSplit && splitMode === 'second-map'
  const isSplitPhoto = mask.isSplit && splitMode === 'photo' && splitPhoto != null

  // Layout + Innenrand (PROJ-21) — compute the target rectangle for the map
  // area within the full poster canvas. Photos and text still use the full
  // poster coords. Layout only shrinks the map container for plain
  // rectangles — shapes (circle, heart, splits) already sit in the upper
  // portion of the poster and would look squashed if the container shrank.
  const LAYOUT_FACTORS = { full: 1.0, 'text-30': 0.7, 'text-15': 0.85 }
  const rawLayoutFactor = LAYOUT_FACTORS[store.layoutId ?? 'full']
  const isPlainRectangle = !mask.shape && !mask.isSplit
  // Plain rectangles crop the map container directly; shapes keep the
  // container at full poster size and scale the shape SVG itself inside.
  const layoutFactor = isPlainRectangle ? rawLayoutFactor : 1.0
  const layoutMapHeightForShape = mask.shape ? rawLayoutFactor : 1.0
  const mmToPx = W / fmt.widthMm
  const marginPx = Math.max(0, (store.innerMarginMm ?? 0) * mmToPx)
  const mapTargetX = marginPx
  const mapTargetY = marginPx
  const mapTargetW = W - 2 * marginPx
  const mapTargetH = (H - 2 * marginPx) * layoutFactor

  // Build a dynamic mask from shape + shapeConfig for non-split masks.
  // Split masks fall back to their baked SVG files (no composition).
  async function applyComposedMask(srcCanvas: HTMLCanvasElement): Promise<HTMLCanvasElement> {
    if (!mask.shape || !shapeConfig) return srcCanvas
    const maskSvg = composeMaskSvg(mask.shape, shapeConfig, layoutMapHeightForShape)
    const out = document.createElement('canvas')
    out.width = srcCanvas.width
    out.height = srcCanvas.height
    const c = out.getContext('2d')!
    c.drawImage(srcCanvas, 0, 0)
    const maskImg = await loadImage(svgToDataUrl(maskSvg))
    c.globalCompositeOperation = 'destination-in'
    c.drawImage(maskImg, 0, 0, out.width, out.height)
    c.globalCompositeOperation = 'source-over'
    return out
  }

  // Fullbleed (no shape, no split) mask: applies an inset-rect to the map so
  // a passe-partout border appears around it. Returns srcCanvas unchanged when
  // no fullbleed mask is needed (mode 'none' or all margins 0).
  async function applyFullbleedMask(srcCanvas: HTMLCanvasElement): Promise<HTMLCanvasElement> {
    if (!shapeConfig) return srcCanvas
    const maskSvg = composeFullbleedMaskSvg(shapeConfig)
    if (!maskSvg) return srcCanvas
    const out = document.createElement('canvas')
    out.width = srcCanvas.width
    out.height = srcCanvas.height
    const c = out.getContext('2d')!
    c.drawImage(srcCanvas, 0, 0)
    const maskImg = await loadImage(svgToDataUrl(maskSvg))
    c.globalCompositeOperation = 'destination-in'
    c.drawImage(maskImg, 0, 0, out.width, out.height)
    c.globalCompositeOperation = 'source-over'
    return out
  }

  const previewW = viewState.viewportWidth > 0 ? viewState.viewportWidth : 500
  const previewH = viewState.viewportHeight > 0 ? viewState.viewportHeight : Math.round(previewW * (H / W))

  await ensureFontsLoaded(textBlocks)

  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')!
  // Match the live preview's poster background. When darkMode is on,
  // bleed the active palette's background colour through so the area
  // outside the shape blends with the map's land colour (otherwise the
  // mask edge against pure white is jarring on dark palettes).
  const posterBg = store.posterDarkMode
    ? (store.customPalette?.background
        ?? getPalette(store.paletteId ?? '')?.colors.background
        ?? '#ffffff')
    : '#ffffff'
  ctx.fillStyle = posterBg
  ctx.fillRect(0, 0, W, H)

  // Bounds, die der Offscreen-Render-Schritt tatsächlich produziert hat —
  // werden für die Marker-Pin-Projektion verwendet. Im Headless-Mode sind
  // die Editor-Store-Bounds nämlich Default-Null, weil keine live MapPreview
  // sie aktualisiert. (Im Editor stimmen sie zufällig.)
  let renderedBounds: ViewState['bounds'] | null = null
  let secondRenderedBounds: ViewState['bounds'] | null = null

  if (isDualMap) {
    // 2 mm visual split between the two halves, matching the preview clip-path
    const splitGapHalfPx = (mmToPx * 1)
    const midlineX = mapTargetX + mapTargetW / 2
    const leftClipW = midlineX - splitGapHalfPx - mapTargetX
    const rightClipX = midlineX + splitGapHalfPx
    const rightClipW = mapTargetX + mapTargetW - rightClipX

    // Left map (primary)
    const leftRender = await renderMapOffscreen({ styleId, vs: viewState, previewW, previewH, outputW: W, outputH: H, paletteId: store.paletteId, customPaletteBase: store.customPaletteBase, customPalette: store.customPalette, streetLabelsVisible: store.streetLabelsVisible })
    let leftCanvas = leftRender.canvas
    renderedBounds = leftRender.bounds
    if (mask.leftSvgPath) leftCanvas = await applyMask(leftCanvas, mask.leftSvgPath)
    ctx.save()
    ctx.beginPath()
    ctx.rect(mapTargetX, mapTargetY, leftClipW, mapTargetH)
    ctx.clip()
    ctx.drawImage(leftCanvas, 0, 0, W, H, mapTargetX, mapTargetY, mapTargetW, mapTargetH)
    ctx.restore()

    // Right map (secondary)
    const secVS = secondMap.viewState
    const secPreviewW = secVS.viewportWidth > 0 ? secVS.viewportWidth : previewW
    const secPreviewH = secVS.viewportHeight > 0 ? secVS.viewportHeight : previewH
    const rightRender = await renderMapOffscreen({ styleId: secondMap.styleId, vs: secVS, previewW: secPreviewW, previewH: secPreviewH, outputW: W, outputH: H, paletteId: secondMap.paletteId, customPaletteBase: secondMap.customPaletteBase, customPalette: secondMap.customPalette, streetLabelsVisible: store.streetLabelsVisible })
    let rightCanvas = rightRender.canvas
    secondRenderedBounds = rightRender.bounds
    if (mask.rightSvgPath) rightCanvas = await applyMask(rightCanvas, mask.rightSvgPath)
    ctx.save()
    ctx.beginPath()
    ctx.rect(rightClipX, mapTargetY, rightClipW, mapTargetH)
    ctx.clip()
    ctx.drawImage(rightCanvas, 0, 0, W, H, mapTargetX, mapTargetY, mapTargetW, mapTargetH)
    ctx.restore()
  } else if (isSplitPhoto && splitPhoto && mask.leftSvgPath && mask.rightSvgPath) {
    const photoIsRightZone = splitPhotoZone === 1
    const mapSideSvg = photoIsRightZone ? mask.leftSvgPath : mask.rightSvgPath
    const photoSideSvg = photoIsRightZone ? mask.rightSvgPath : mask.leftSvgPath

    // Without an explicit poster-middle rect-clip, the SVG-internal
    // <clipPath> in the half-mask SVGs is not always honoured when loaded
    // as an Image, so both halves end up masking to the FULL shape — and
    // since the photo is drawn on top of the map, only the photo is visible.
    // Dual-map (above) already does this; split-photo was missing it.
    // mask.noHalfClip opts out for masks where the silhouettes intentionally
    // cross the midline (entwined hearts etc.).
    const splitGapHalfPx = mmToPx * 1
    const midlineX = mapTargetX + mapTargetW / 2
    const leftHalfRect = { x: mapTargetX, w: midlineX - splitGapHalfPx - mapTargetX }
    const rightHalfRect = {
      x: midlineX + splitGapHalfPx,
      w: mapTargetX + mapTargetW - midlineX - splitGapHalfPx,
    }
    const mapHalfRect = photoIsRightZone ? leftHalfRect : rightHalfRect
    const photoHalfRect = photoIsRightZone ? rightHalfRect : leftHalfRect

    const drawHalf = (source: HTMLCanvasElement, half: { x: number; w: number }) => {
      if (mask.noHalfClip) {
        ctx.drawImage(source, 0, 0, W, H, mapTargetX, mapTargetY, mapTargetW, mapTargetH)
        return
      }
      ctx.save()
      ctx.beginPath()
      ctx.rect(half.x, mapTargetY, half.w, mapTargetH)
      ctx.clip()
      ctx.drawImage(source, 0, 0, W, H, mapTargetX, mapTargetY, mapTargetW, mapTargetH)
      ctx.restore()
    }

    const splitRender = await renderMapOffscreen({ styleId, vs: viewState, previewW, previewH, outputW: W, outputH: H, paletteId: store.paletteId, customPaletteBase: store.customPaletteBase, customPalette: store.customPalette, streetLabelsVisible: store.streetLabelsVisible })
    let mapCanvas = splitRender.canvas
    renderedBounds = splitRender.bounds
    mapCanvas = await applyMask(mapCanvas, mapSideSvg)
    drawHalf(mapCanvas, mapHalfRect)

    // Split photo is drawn into a full-poster offscreen canvas, then scaled
    // into the same target rect so the split halves stay aligned.
    const photoCanvas = document.createElement('canvas')
    photoCanvas.width = W
    photoCanvas.height = H
    const photoCtx = photoCanvas.getContext('2d')!
    await drawSplitPhoto(photoCtx, splitPhoto, photoSideSvg, W, H)
    drawHalf(photoCanvas, photoHalfRect)
  } else {
    const mainRender = await renderMapOffscreen({ styleId, vs: viewState, previewW, previewH, outputW: W, outputH: H, paletteId: store.paletteId, customPaletteBase: store.customPaletteBase, customPalette: store.customPalette, streetLabelsVisible: store.streetLabelsVisible })
    let mapCanvas = mainRender.canvas
    renderedBounds = mainRender.bounds
    if (mask.shape) {
      mapCanvas = await applyComposedMask(mapCanvas)
    } else if (mask.svgPath) {
      mapCanvas = await applyMask(mapCanvas, mask.svgPath)
    } else {
      // Fullbleed: no shape, no split-svg. Apply passe-partout mask if user
      // configured a margin via "Außenbereich → Voll".
      mapCanvas = await applyFullbleedMask(mapCanvas)
    }
    ctx.drawImage(mapCanvas, 0, 0, W, H, mapTargetX, mapTargetY, mapTargetW, mapTargetH)
  }

  // Build display texts for coordinate blocks — pin position takes precedence over map center
  const coordLat = marker.lat ?? viewState.lat
  const coordLng = marker.lng ?? viewState.lng
  const displayTexts: Record<string, string> = {}
  for (const block of textBlocks) {
    displayTexts[block.id] = block.isCoordinates
      ? getCoordinatesText(coordLat, coordLng, locationName)
      : block.text
  }

  // Photos (before text so text sits on top)
  await drawPhotos(ctx, store.photos ?? [], W, H)

  // Text blocks
  drawTextBlocks(ctx, textBlocks, displayTexts, W, H, previewW, previewH)

  // Decorative frame (inner + outer), composed from shape + shapeConfig.
  // For shape masks the frame hugs the silhouette and draws into the map
  // target rect. For dual/split modes the outer frame is synthesised against
  // a full-poster rectangle, while the inner frame ("Formkontur") strokes
  // the split mask's combined silhouette when one is defined.
  if (!isDualMap && !isSplitPhoto && mask.shape && shapeConfig && hasAnyFrame(shapeConfig)) {
    const frameSvg = composeFrameSvg(mask.shape, shapeConfig, layoutMapHeightForShape)
    const frameImg = await loadImage(svgToDataUrl(frameSvg))
    ctx.drawImage(frameImg, mapTargetX, mapTargetY, mapTargetW, mapTargetH)
  } else if (shapeConfig && (isDualMap || isSplitPhoto || !mask.shape)) {
    if (shapeConfig.outerFrame.enabled) {
      const syntheticShape = {
        viewBox: '0 0 595.3 841.9',
        width: 595.3, height: 841.9,
        markup: '<rect x="0" y="0" width="595.3" height="841.9"/>',
      }
      const frameSvg = composeFrameSvg(
        syntheticShape,
        { ...shapeConfig, innerFrame: { ...shapeConfig.innerFrame, enabled: false } },
        1,
      )
      const frameImg = await loadImage(svgToDataUrl(frameSvg))
      ctx.drawImage(frameImg, mapTargetX, mapTargetY, mapTargetW, mapTargetH)
    }
    if (shapeConfig.innerFrame.enabled && mask.shape && (isDualMap || isSplitPhoto)) {
      // Outer silhouette stroke — clipped per half so the contour ends at
      // the centre gap on each side instead of crossing the seam.
      const contourSvg = composeFrameSvg(
        mask.shape,
        { ...shapeConfig, outerFrame: { ...shapeConfig.outerFrame, enabled: false } },
        1,
      )
      const contourImg = await loadImage(svgToDataUrl(contourSvg))
      if (mask.noHalfClip) {
        ctx.drawImage(contourImg, mapTargetX, mapTargetY, mapTargetW, mapTargetH)
      } else {
        const gapHalfPx = mmToPx * 1
        const midX = mapTargetX + mapTargetW / 2
        const leftW = midX - gapHalfPx - mapTargetX
        const rightX = midX + gapHalfPx
        const rightW = mapTargetX + mapTargetW - rightX
        ctx.save()
        ctx.beginPath()
        ctx.rect(mapTargetX, mapTargetY, leftW, mapTargetH)
        ctx.clip()
        ctx.drawImage(contourImg, mapTargetX, mapTargetY, mapTargetW, mapTargetH)
        ctx.restore()
        ctx.save()
        ctx.beginPath()
        ctx.rect(rightX, mapTargetY, rightW, mapTargetH)
        ctx.clip()
        ctx.drawImage(contourImg, mapTargetX, mapTargetY, mapTargetW, mapTargetH)
        ctx.restore()
        // Seam lines — drawn ungiclipped so the full stroke thickness stays
        // visible across the gap. SVG-internal clipPath confines them to
        // the shape's interior.
        const seamSvg = composeSplitSeamSvg(mask.shape, shapeConfig.innerFrame)
        const seamImg = await loadImage(svgToDataUrl(seamSvg))
        ctx.drawImage(seamImg, mapTargetX, mapTargetY, mapTargetW, mapTargetH)
      }
    }
  }

  // Marker pins — position from marker.lat/lng when dragged, else centered above mask.
  // Pins live inside the map target rect, so transform full-poster coords into it.
  const pinScale = W / previewW
  const scaleX = mapTargetW / W
  const scaleY = mapTargetH / H
  const toTargetX = (x: number) => mapTargetX + x * scaleX
  const toTargetY = (y: number) => mapTargetY + y * scaleY
  if (marker.enabled) {
    const pinImg = await loadImage(makePinSVGUrl(marker.type, marker.color))
    const [pw, ph] = marker.type === 'heart' ? [32, 32] : [28, 40]
    let cx = (isDualMap ? 0.25 : 0.5) * W
    let cy = 0.5 * H
    // Bevorzuge die tatsächlich gerenderten Bounds (aus Offscreen-Map),
    // weil viewState.bounds im Headless-Mode auf Default-Null bleibt.
    const projBounds = renderedBounds ?? viewState.bounds
    if (marker.lat != null && marker.lng != null && projBounds) {
      const pt = projectLngLat(marker.lng, marker.lat, projBounds, W, H)
      cx = pt.x; cy = pt.y
    }
    ctx.drawImage(pinImg, toTargetX(cx) - (pw * pinScale) / 2, toTargetY(cy) - ph * pinScale, pw * pinScale, ph * pinScale)
  }
  if (isDualMap && secondMarker.enabled) {
    const pinImg = await loadImage(makePinSVGUrl(secondMarker.type, secondMarker.color))
    const [pw, ph] = secondMarker.type === 'heart' ? [32, 32] : [28, 40]
    let cx = 0.75 * W
    let cy = 0.5 * H
    const sVS = secondMap.viewState
    const secProjBounds = secondRenderedBounds ?? sVS?.bounds
    if (secondMarker.lat != null && secondMarker.lng != null && secProjBounds) {
      // Offscreen the right map is also rendered at full width — project using its bounds
      // then shift into the right half of the poster.
      const pt = projectLngLat(secondMarker.lng, secondMarker.lat, secProjBounds, W, H)
      cx = 0.5 * W + pt.x * 0.5  // right map lives in the 0.5..1.0 x-range
      cy = pt.y
    }
    ctx.drawImage(pinImg, toTargetX(cx) - (pw * pinScale) / 2, toTargetY(cy) - ph * pinScale, pw * pinScale, ph * pinScale)
  }

  return canvas
}

// ─── Download helpers ──────────────────────────────────────────────────────

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b: Blob | null) => (b ? resolve(b) : reject(new Error('Canvas toBlob failed'))), 'image/png'),
  )
}

function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
      .replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
    || 'poster'
  )
}

// ─── Hook ──────────────────────────────────────────────────────────────────

export function useMapExport() {
  const [isExporting, setIsExporting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { viewState, styleId, paletteId, customPaletteBase, customPalette, streetLabelsVisible, posterDarkMode, maskKey, marker, secondMarker, secondMap, shapeConfig, textBlocks, locationName, photos, splitMode, splitPhoto, splitPhotoZone, layoutId, innerMarginMm } =
    useEditorStore()

  const run = async (format: PrintFormat, type: 'png' | 'pdf') => {
    setIsExporting(true)
    setError(null)
    try {
      const snapshot: ExportSnapshot = {
        viewState, styleId, paletteId, customPaletteBase, customPalette, streetLabelsVisible, posterDarkMode, maskKey, marker, secondMarker, secondMap, shapeConfig, textBlocks, locationName, photos, splitMode, splitPhoto, splitPhotoZone, layoutId, innerMarginMm,
      }
      const canvas = await buildPosterCanvas(format, snapshot)
      const pngBlob = await canvasToBlob(canvas)
      const filename = `${slugify(locationName)}-poster`

      if (type === 'png') {
        const url = URL.createObjectURL(pngBlob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${filename}.png`
        a.click()
        URL.revokeObjectURL(url)
      } else {
        const { PDFDocument } = await import('pdf-lib')
        const fmt = PRINT_FORMATS[format]
        const MM_TO_PT = 72 / 25.4
        const pdfDoc = await PDFDocument.create()
        const page = pdfDoc.addPage([fmt.widthMm * MM_TO_PT, fmt.heightMm * MM_TO_PT])
        const pngImage = await pdfDoc.embedPng(new Uint8Array(await pngBlob.arrayBuffer()))
        page.drawImage(pngImage, { x: 0, y: 0, width: fmt.widthMm * MM_TO_PT, height: fmt.heightMm * MM_TO_PT })
        const pdfBytes = await pdfDoc.save()
        const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${filename}.pdf`
        a.click()
        URL.revokeObjectURL(url)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export fehlgeschlagen')
    } finally {
      setIsExporting(false)
    }
  }

  const renderPreview = async (format: PrintFormat): Promise<string> => {
    const snapshot: ExportSnapshot = {
      viewState, styleId, paletteId, customPaletteBase, customPalette, streetLabelsVisible, posterDarkMode, maskKey, marker, secondMarker, secondMap, shapeConfig, textBlocks, locationName, photos, splitMode, splitPhoto, splitPhotoZone, layoutId, innerMarginMm,
    }
    const canvas = await buildPosterCanvas(format, snapshot)
    return canvas.toDataURL('image/png')
  }

  return {
    exportPNG: (format: PrintFormat) => run(format, 'png'),
    exportPDF: (format: PrintFormat) => run(format, 'pdf'),
    renderPreview,
    isExporting,
    error,
  }
}
