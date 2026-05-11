'use client'

import { useRef, useEffect, useState } from 'react'
import { Plus, Minus, LocateFixed } from 'lucide-react'
import { useEditorStore, LAYOUT_MAP_HEIGHT } from '@/hooks/useEditorStore'
import { useCustomMasks } from '@/hooks/useCustomMasks'
import { MAP_MASKS } from '@/lib/map-masks'
import { getPalette } from '@/lib/map-palettes'
import { composeMaskSvg, composeFrameSvg, composeFullbleedMaskSvg, composeSplitSeamSvg, composeSplitMaskHalfSvg, svgToDataUrl, hasAnyFrame } from '@/lib/mask-composer'
import { useRasterizedMaskUrl } from '@/hooks/useRasterizedMaskUrl'
import { useColoredDecoration } from '@/hooks/useColoredDecoration'
import { PRINT_FORMATS, effectiveDimensions, effectiveLogicalCanvas } from '@/lib/print-formats'
import { MapPreview } from './MapPreview'
import { TextBlockOverlay } from './TextBlockOverlay'
import { DraggablePin } from './DraggablePin'
import { PhotoOverlay } from './PhotoOverlay'
import { SplitPhotoOverlay } from './SplitPhotoOverlay'
import { PreviewTriggerButton } from './PreviewTriggerButton'
import { MapAttribution } from './MapAttribution'
import { cn } from '@/lib/utils'

function ClassicPin({ color }: { color: string }) {
  return (
    <svg width="28" height="40" viewBox="0 0 28 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M14 0C6.27 0 0 6.27 0 14C0 24.5 14 40 14 40C14 40 28 24.5 28 14C28 6.27 21.73 0 14 0Z" fill={color} />
      <circle cx="14" cy="13" r="5" fill="white" fillOpacity="0.85" />
    </svg>
  )
}

function HeartPin({ color }: { color: string }) {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M16 30C16 30 2 19 2 10C2 5.58 5.58 2 10 2C12.5 2 14.74 3.18 16 5C17.26 3.18 19.5 2 22 2C26.42 2 30 5.58 30 10C30 19 16 30 16 30Z" fill={color} />
    </svg>
  )
}

function makeMaskStyle(svgPath: string) {
  // Quote the URL: composed mask SVGs can contain literal `(` `)` from the
  // shape's transform attribute (e.g. `transform="translate(44.65 0)
  // scale(0.85)"` for layout-scaled shapes). Unquoted CSS `url(...)` would
  // close at the first inner `)` and silently drop the mask.
  return {
    maskImage: `url("${svgPath}")`,
    WebkitMaskImage: `url("${svgPath}")`,
    maskRepeat: 'no-repeat',
    WebkitMaskRepeat: 'no-repeat',
    maskSize: '100% 100%',
    WebkitMaskSize: '100% 100%',
    maskPosition: 'center',
    WebkitMaskPosition: 'center',
  }
}

export type MobileEditorTool =
  | 'map'
  | 'layout'
  | 'text'
  | 'marker'
  | 'photo'
  | 'export'

interface PosterCanvasProps {
  /** Total horizontal + vertical padding subtracted from wrapper before
   *  computing the poster size. Desktop default is 64 (32 px each side);
   *  Mobile can pass a smaller value to maximize preview real estate. */
  padding?: number
  /** On Mobile, which tab is currently active. Controls which overlay (map,
   *  text, photo, marker) responds to touches — exactly one at a time — so
   *  fingers don't conflict on a small screen. Undefined on Desktop, where
   *  everything is interactive simultaneously. */
  activeMobileTool?: MobileEditorTool
}

export function PosterCanvas({ padding = 64, activeMobileTool }: PosterCanvasProps = {}) {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const posterRef = useRef<HTMLDivElement>(null)
  // PROJ-37: visualSize = was der Customer am Bildschirm sieht (gefittet in
  // den verfügbaren Wrapper-Platz). Wird via CSS-Transform-Scale aus der
  // logicalSize abgeleitet. TextBlockOverlay rendert im LOGICAL-Pixel-Raum
  // (poster div ist logisch dimensioniert) — Schriftgrößen leiten sich
  // direkt aus `logicalCanvas.width × fontSizeFraction` ab, sodass A4/A3/A2
  // automatisch dieselbe Text-zu-Poster-Ratio ergeben.
  const [visualSize, setVisualSize] = useState({ width: 0, height: 0 })
  const [locating, setLocating] = useState(false)

  // On Mobile exactly one overlay is interactive at a time, matched to the
  // active tab. On Desktop (activeMobileTool === undefined) every overlay
  // is interactive simultaneously — unchanged pre-existing behaviour.
  const mapInteractive = activeMobileTool === undefined || activeMobileTool === 'map'
  const textInteractive = activeMobileTool === undefined || activeMobileTool === 'text'
  const photoInteractive = activeMobileTool === undefined || activeMobileTool === 'photo'
  const markerInteractive = activeMobileTool === undefined || activeMobileTool === 'marker'

  const { maskKey, printFormat, orientation, zoomIn, zoomOut, flyToLocation, zoomInSecond, zoomOutSecond, secondMap, marker, secondMarker, shapeConfig, viewState, setMarker, setSecondMarker, setSelectedBlockId, splitMode, splitPhoto, splitPhotoZone, layoutId, innerMarginMm, paletteId, customPalette, posterDarkMode, decorationSvgUrl, decorationVisible, activeSplitMap, setActiveSplitMap } = useEditorStore()
  const mapAreaRef = useRef<HTMLDivElement>(null)
  const { masks: customMasks } = useCustomMasks()
  const mask =
    (MAP_MASKS as Record<string, typeof MAP_MASKS['none']>)[maskKey] ??
    customMasks.find((m) => m.key === maskKey) ??
    MAP_MASKS.none
  const format = PRINT_FORMATS[printFormat]
  const dims = effectiveDimensions(format, orientation)
  const ratio = dims.widthMm / dims.heightMm
  // PROJ-37: Logical Canvas — die virtuelle Pixel-Fläche, in der MapLibre
  // rendert. Größere Logical Canvas = mehr Geografie sichtbar bei gleichem
  // Zoom. Editor-Preview bleibt am Bildschirm gleich (visualSize), wird aber
  // per CSS-Transform-Scale aus der Logical Canvas runter-/hochskaliert.
  const logicalCanvas = effectiveLogicalCanvas(printFormat, orientation)
  const visualScale = visualSize.width > 0 ? visualSize.width / logicalCanvas.width : 1

  const isDualMap = mask.isSplit && splitMode === 'second-map'
  const isSplitPhoto = mask.isSplit && splitMode === 'photo' && splitPhoto != null

  // PROJ-1 migration: users who had split-map active before the
  // auto-enable fix landed end up with secondMarker.enabled=false in
  // their state. Force-enable once on mount so they see the second
  // marker without having to toggle Zweite Ansicht off and on again.
  const secondMarkerMigrationFiredRef = useRef(false)
  useEffect(() => {
    if (secondMarkerMigrationFiredRef.current) return
    if (isDualMap && !secondMarker.enabled) {
      setSecondMarker({ enabled: true })
      secondMarkerMigrationFiredRef.current = true
    }
  }, [isDualMap, secondMarker.enabled, setSecondMarker])
  // Zone 0 = left/first half, zone 1 = right/second half
  const photoIsRightZone = splitPhotoZone === 1
  // Orientation-aware split-half mask URLs. The static SVGs in /public are
  // authored as portrait — composing them on the fly with the right viewBox
  // keeps circles round and hearts heart-shaped in landscape. Falls back to
  // the static asset when the mask has no shape definition.
  const composedSplitLeft = (isDualMap || isSplitPhoto) && mask.shape
    ? svgToDataUrl(composeSplitMaskHalfSvg(mask.shape, 'left', orientation))
    : null
  const composedSplitRight = (isDualMap || isSplitPhoto) && mask.shape
    ? svgToDataUrl(composeSplitMaskHalfSvg(mask.shape, 'right', orientation))
    : null
  const leftMaskUrl = composedSplitLeft ?? mask.leftSvgPath ?? null
  const rightMaskUrl = composedSplitRight ?? mask.rightSvgPath ?? null
  const mapHalfSvg = isSplitPhoto
    ? (photoIsRightZone ? leftMaskUrl : rightMaskUrl)
    : null
  const photoHalfSvg = isSplitPhoto
    ? (photoIsRightZone ? rightMaskUrl : leftMaskUrl)
    : null
  const useComposedMask = !!mask.shape && !isDualMap && !isSplitPhoto
  const layoutMapHeight = LAYOUT_MAP_HEIGHT[layoutId]
  const composedMaskSvgString = useComposedMask && mask.shape
    ? composeMaskSvg(mask.shape, shapeConfig, layoutMapHeight, orientation)
    : null
  // Glow mode uses <radialGradient>, which Chromium doesn't always
  // rasterise from a CSS mask-image SVG data URL. Render those masks
  // through canvas first so the gradient is baked into a PNG.
  // The composed mask SVG follows the canvas aspect (portrait shape
  // viewBox in portrait, A4-landscape viewBox in landscape), so the
  // rasteriser dimensions must match — passing the shape's portrait
  // dims here in landscape would re-distort the freshly-corrected mask.
  const isLandscapeForRaster = orientation === 'landscape'
  const rasterW = mask.shape ? (isLandscapeForRaster ? 841.9 : mask.shape.width) : 0
  const rasterH = mask.shape ? (isLandscapeForRaster ? 595.3 : mask.shape.height) : 0
  const composedMaskDataUrl = useRasterizedMaskUrl(
    composedMaskSvgString,
    shapeConfig.outer.mode === 'glow',
    rasterW,
    rasterH,
  )
  // PROJ-35: Decoration follows the inner-frame colour so heart silhouette +
  // string/love overlay share one unified design colour, even when the user
  // has the inner frame stroke disabled (the colour value is the source).
  const coloredDecorationUrl = useColoredDecoration(decorationSvgUrl, shapeConfig.innerFrame.color)
  const composedFrameDataUrl = useComposedMask && mask.shape && hasAnyFrame(shapeConfig)
    ? svgToDataUrl(composeFrameSvg(mask.shape, shapeConfig, layoutMapHeight, 210, orientation))
    : null

  // Fullbleed (no shape, no split) with outer.mode != 'none' and a margin > 0:
  // build an inset-rectangle mask so the map gets a passe-partout border.
  const fullbleedMaskDataUrl = !mask.shape && !isDualMap && !isSplitPhoto
    ? (() => {
        const svg = composeFullbleedMaskSvg(shapeConfig, orientation)
        return svg ? svgToDataUrl(svg) : null
      })()
    : null

  // For dual-map / split-photo modes — and for fullbleed (no shape, no split) —
  // the shape-bound frame composer doesn't fire because there's no single shape
  // to hug. Render the OUTER frame here too, synthesised against a full-poster
  // rectangle. Dimensions follow `orientation` so the frame matches the
  // canvas aspect; passing `referenceMm = 297` keeps the mm offsets honest
  // when the long edge sits on the X axis.
  const needsSyntheticFrame = (isDualMap || isSplitPhoto || !mask.shape) && shapeConfig.outerFrame.enabled
  const isLandscape = orientation === 'landscape'
  const synthW = isLandscape ? 841.9 : 595.3
  const synthH = isLandscape ? 595.3 : 841.9
  const synthRefMm = isLandscape ? 297 : 210
  const outerFrameForSplit = needsSyntheticFrame
    ? svgToDataUrl(composeFrameSvg(
        {
          viewBox: `0 0 ${synthW} ${synthH}`,
          width: synthW, height: synthH,
          markup: `<rect x="0" y="0" width="${synthW}" height="${synthH}"/>`,
        },
        { ...shapeConfig, innerFrame: { ...shapeConfig.innerFrame, enabled: false } },
        1,
        synthRefMm,
      ))
    : null

  // Inner-frame ("Formkontur") for split modes — split into two SVGs:
  // (1) the silhouette stroke, rendered twice with a left/right half-clip so
  //     each half ends at the centre gap, and
  // (2) the seam lines that close the inner edge of each half, rendered as
  //     a single ungiclipped layer with an SVG <clipPath> on the shape's
  //     interior. Keeping the seams out of the half-clip preserves their
  //     full stroke thickness on both sides of the gap.
  const splitInner = (isDualMap || isSplitPhoto) && mask.shape && shapeConfig.innerFrame.enabled
  // PROJ-37 fix: orientation MUST be passed; composeFrameSvg defaults to
  // 'portrait' when omitted, which made the inner-frame stroke render with
  // portrait geometry while the map mask was correctly landscape. Result:
  // outline misaligned with the masked silhouette (Daniel: "Kontur passt
  // nicht mehr auf die Masks").
  const innerFrameForSplit = splitInner && mask.shape
    ? svgToDataUrl(composeFrameSvg(
        mask.shape,
        { ...shapeConfig, outerFrame: { ...shapeConfig.outerFrame, enabled: false } },
        1,
        210,
        orientation,
      ))
    : null
  // PROJ-1: when the shape provides splitMarkup, render the inner-frame
  // stroke separately for each half so each heart's outline matches its
  // own filled mask. Otherwise fall back to innerFrameForSplit which
  // strokes the combined shape.
  // PROJ-40: also override shapeLandscape.markup, otherwise the landscape
  // branch of composeFrameSvg picks up the COMBINED landscape markup and
  // strokes the full shape — bypassing the per-half override entirely.
  const buildHalfShape = (half: 'left' | 'right') => {
    const sm = mask.shape!.splitMarkup!
    const landscape = mask.shape!.shapeLandscape
    return {
      ...mask.shape!,
      markup: sm[half],
      shapeLandscape: landscape && landscape.splitMarkup
        ? { ...landscape, markup: landscape.splitMarkup[half] }
        : landscape,
    }
  }
  const innerFrameLeft = splitInner && mask.shape?.splitMarkup
    ? svgToDataUrl(composeFrameSvg(
        buildHalfShape('left'),
        { ...shapeConfig, outerFrame: { ...shapeConfig.outerFrame, enabled: false } },
        1,
        210,
        orientation,
      ))
    : null
  const innerFrameRight = splitInner && mask.shape?.splitMarkup
    ? svgToDataUrl(composeFrameSvg(
        buildHalfShape('right'),
        { ...shapeConfig, outerFrame: { ...shapeConfig.outerFrame, enabled: false } },
        1,
        210,
        orientation,
      ))
    : null
  const innerSeamForSplit = splitInner && mask.shape && !mask.noHalfClip
    ? svgToDataUrl(composeSplitSeamSvg(mask.shape, shapeConfig.innerFrame))
    : null

  useEffect(() => {
    if (!wrapperRef.current) return
    const compute = (width: number, height: number) => {
      const availW = width - padding
      const availH = height - padding
      if (availW <= 0 || availH <= 0) return
      if (availW / ratio <= availH) {
        setVisualSize({ width: availW, height: availW / ratio })
      } else {
        setVisualSize({ width: availH * ratio, height: availH })
      }
    }
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      compute(width, height)
    })
    observer.observe(wrapperRef.current)
    compute(wrapperRef.current.clientWidth, wrapperRef.current.clientHeight)
    return () => observer.disconnect()
  }, [ratio, padding])

  const handleLocate = () => {
    if (!navigator.geolocation) return
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        flyToLocation(pos.coords.longitude, pos.coords.latitude, 13)
        setLocating(false)
      },
      () => setLocating(false)
    )
  }

  return (
    <div ref={wrapperRef} className="flex-1 relative bg-muted min-h-0 overflow-hidden flex items-center justify-center">
      <PreviewTriggerButton />
      {/* OSM/MapTiler attribution — outside the poster card, in the editor
          chrome. ODbL-compliant placement, doesn't pollute the canvas. */}
      <MapAttribution className="absolute bottom-1 right-2" />
      {visualSize.width > 0 && (() => {
        // PROJ-37: mmToPx und marginPx leben jetzt im LOGICAL-Pixel-Raum
        // (der Poster-div ist logicalCanvas.width × logicalCanvas.height).
        // Visual-Skalierung passiert via CSS-transform am visualWrapper.
        const mmToPx = logicalCanvas.width / dims.widthMm
        const marginPx = innerMarginMm * mmToPx
        // Layout only shrinks the map when the user has no shape (plain
        // rectangle). Circles, hearts and splits already position themselves
        // in the upper part of the poster, so scaling the container would
        // squash them vertically. Shapes handle their own framing.
        const isPlainRectangle = !mask.shape && !mask.isSplit
        const mapHeightFactor = isPlainRectangle ? LAYOUT_MAP_HEIGHT[layoutId] : 1.0
        return (
        <>
          {/* Visual wrapper: CSS-Transform-Scale skaliert die Logical Canvas
              in den verfügbaren Bildschirm-Platz. Width/Height = visualSize
              damit Layout-Engine den richtigen Bildschirm-Platz reserviert.
              Inhalt (poster-div) lebt im logicalCanvas-Pixel-Raum.
              transform-origin top-left + size-Berechnungen halten alles
              positioniert ohne overflow-Probleme. */}
          <div
            className="flex-none relative overflow-hidden"
            style={{ width: visualSize.width, height: visualSize.height, contain: 'layout size' }}
          >
          <div
            ref={posterRef}
            className="absolute top-0 left-0 shadow-2xl overflow-hidden"
            style={{
              width: logicalCanvas.width,
              height: logicalCanvas.height,
              transform: `scale(${visualScale})`,
              transformOrigin: 'top left',
              backgroundColor: posterDarkMode
                ? (customPalette?.background
                    ?? getPalette(paletteId)?.colors.background
                    ?? '#ffffff')
                : '#ffffff',
            }}
            onPointerDown={() => setSelectedBlockId(null)}
          >
            <div
              ref={mapAreaRef}
              className="absolute"
              style={{
                top: marginPx,
                left: marginPx,
                right: marginPx,
                height: `calc((100% - ${marginPx * 2}px) * ${mapHeightFactor})`,
                // Disable map pan/zoom gestures on Mobile tabs that aren't
                // the Map tab. Child overlays (markers, split-photo) re-enable
                // their own pointer-events via `interactive` props below.
                pointerEvents: mapInteractive ? 'auto' : 'none',
              }}
            >
            {isDualMap ? (() => {
              // 2 mm visual separation between the two map halves, converted
              // from poster millimetres to on-screen pixels so it stays true
              // to scale regardless of preview size.
              const gapHalfPx = mmToPx * 1
              const leftEdge = `calc(50% - ${gapHalfPx}px)`
              const rightEdge = `calc(50% + ${gapHalfPx}px)`
              const defaultLeftClip = `polygon(0 0, ${leftEdge} 0, ${leftEdge} 100%, 0 100%)`
              const defaultRightClip = `polygon(${rightEdge} 0, 100% 0, 100% 100%, ${rightEdge} 100%)`
              // For non-noHalfClip masks the polygon partitions pointer events
              // along the canvas midline. For noHalfClip masks the activeSplitMap
              // toggle (sticky badge above the canvas) decides which map is
              // interactive — the inactive one gets pointer-events:none so it
              // doesn't steal touches in shape overlap zones.
              const leftClip = mask.noHalfClip ? null : defaultLeftClip
              const rightClip = mask.noHalfClip ? null : defaultRightClip
              const usesActiveToggle = Boolean(mask.noHalfClip)
              const primaryInteractive = !usesActiveToggle || activeSplitMap === 'primary'
              const secondaryInteractive = !usesActiveToggle || activeSplitMap === 'secondary'
              return (
              <>
                {/* Left map */}
                <div
                  className="absolute inset-0"
                  style={{
                    ...(leftMaskUrl ? makeMaskStyle(leftMaskUrl) : {}),
                    ...(leftClip ? { clipPath: leftClip } : {}),
                    ...(primaryInteractive ? {} : { pointerEvents: 'none' as const }),
                  }}
                >
                  <MapPreview storeSlice="primary" />
                </div>
                {/* Right map */}
                <div
                  className="absolute inset-0"
                  style={{
                    ...(rightMaskUrl ? makeMaskStyle(rightMaskUrl) : {}),
                    ...(rightClip ? { clipPath: rightClip } : {}),
                    ...(secondaryInteractive ? {} : { pointerEvents: 'none' as const }),
                  }}
                >
                  <MapPreview storeSlice="secondary" />
                </div>
                {/* Active-Map toggle badge — only for masks where pointer events
                    can't be partitioned by a static clip-path (entwined hearts). */}
                {usesActiveToggle && (
                  <div className="absolute top-3 left-1/2 -translate-x-1/2 z-50 flex gap-1 bg-white/90 backdrop-blur-sm rounded-full shadow-md border border-border p-1">
                    <button
                      type="button"
                      onClick={() => setActiveSplitMap('primary')}
                      className={cn(
                        'px-3 py-1 rounded-full text-[11px] font-medium transition-colors',
                        activeSplitMap === 'primary'
                          ? 'bg-primary text-primary-foreground'
                          : 'text-muted-foreground hover:text-foreground',
                      )}
                      title="Linke Karte aktivieren"
                    >
                      Karte 1
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveSplitMap('secondary')}
                      className={cn(
                        'px-3 py-1 rounded-full text-[11px] font-medium transition-colors',
                        activeSplitMap === 'secondary'
                          ? 'bg-primary text-primary-foreground'
                          : 'text-muted-foreground hover:text-foreground',
                      )}
                      title="Rechte Karte aktivieren"
                    >
                      Karte 2
                    </button>
                  </div>
                )}
              </>
              )
            })() : isSplitPhoto && mapHalfSvg && photoHalfSvg ? (
              <>
                {/* Primary map — clipped to its half unless the mask spans both halves */}
                <div
                  className="absolute inset-0"
                  style={{
                    ...makeMaskStyle(mapHalfSvg),
                    ...(mask.noHalfClip
                      ? {}
                      : { clipPath: photoIsRightZone
                          ? 'polygon(0 0, 50% 0, 50% 100%, 0 100%)'
                          : 'polygon(50% 0, 100% 0, 100% 100%, 50% 100%)' }),
                  }}
                >
                  <MapPreview storeSlice="primary" />
                </div>
                {/* Photo on the opposite half */}
                <SplitPhotoOverlay
                  svgPath={photoHalfSvg}
                  side={photoIsRightZone ? 'right' : 'left'}
                  noHalfClip={mask.noHalfClip}
                  interactive={photoInteractive}
                />
              </>
            ) : (
              <div
                className="absolute inset-0"
                style={
                  composedMaskDataUrl
                    ? makeMaskStyle(composedMaskDataUrl)
                    : mask.svgPath
                      ? makeMaskStyle(mask.svgPath)
                      : fullbleedMaskDataUrl
                        ? makeMaskStyle(fullbleedMaskDataUrl)
                        : {}
                }
              >
                <MapPreview storeSlice="primary" />
              </div>
            )}

            {/* Decorative frame (inner + outer, composed from shape + shapeConfig) */}
            {composedFrameDataUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={composedFrameDataUrl}
                alt=""
                className="absolute inset-0 w-full h-full pointer-events-none"
                style={{ objectFit: 'fill' }}
              />
            )}
            {/* Outer frame for dual-map / split-photo modes (no single shape) */}
            {outerFrameForSplit && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={outerFrameForSplit}
                alt=""
                className="absolute inset-0 w-full h-full pointer-events-none"
                style={{ objectFit: 'fill' }}
              />
            )}
            {/* Inner-frame contour ("Formkontur") for dual-map / split-photo
                modes — strokes the silhouette per half so both sides have an
                independent contour ending at the centre gap. Without
                noHalfClip we clip each stroke to its half exactly like the
                maps, so heart/circle splits open up at the midline. */}
            {innerFrameForSplit && (() => {
              if (mask.noHalfClip) {
                // Per-side outlines if the shape provides splitMarkup —
                // one outline per heart, matching its own filled mask.
                if (innerFrameLeft && innerFrameRight) {
                  return (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={innerFrameLeft}
                        alt=""
                        className="absolute inset-0 w-full h-full pointer-events-none"
                        style={{ objectFit: 'fill' }}
                      />
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={innerFrameRight}
                        alt=""
                        className="absolute inset-0 w-full h-full pointer-events-none"
                        style={{ objectFit: 'fill' }}
                      />
                    </>
                  )
                }
                return (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={innerFrameForSplit}
                    alt=""
                    className="absolute inset-0 w-full h-full pointer-events-none"
                    style={{ objectFit: 'fill' }}
                  />
                )
              }
              const gap = mmToPx * 1
              const leftEdge = `calc(50% - ${gap}px)`
              const rightEdge = `calc(50% + ${gap}px)`
              const leftClip = `polygon(0 0, ${leftEdge} 0, ${leftEdge} 100%, 0 100%)`
              const rightClip = `polygon(${rightEdge} 0, 100% 0, 100% 100%, ${rightEdge} 100%)`
              return (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={innerFrameForSplit}
                    alt=""
                    className="absolute inset-0 w-full h-full pointer-events-none"
                    style={{ objectFit: 'fill', clipPath: leftClip, WebkitClipPath: leftClip }}
                  />
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={innerFrameForSplit}
                    alt=""
                    className="absolute inset-0 w-full h-full pointer-events-none"
                    style={{ objectFit: 'fill', clipPath: rightClip, WebkitClipPath: rightClip }}
                  />
                </>
              )
            })()}
            {/* Inner seam lines — closes each half's contour at the centre
                gap. Rendered without a half-clip so the full stroke thickness
                stays visible; the SVG itself confines the lines to the
                shape's interior. */}
            {innerSeamForSplit && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={innerSeamForSplit}
                alt=""
                className="absolute inset-0 w-full h-full pointer-events-none"
                style={{ objectFit: 'fill' }}
              />
            )}

            {/* Primary marker pin — draggable */}
            {marker.enabled && (
              <DraggablePin
                slice="primary"
                containerRef={mapAreaRef}
                markerLat={marker.lat}
                markerLng={marker.lng}
                markerType={marker.type}
                markerColor={marker.color}
                viewState={viewState}
                defaultX={isDualMap ? '25%' : '50%'}
                onMove={(lat, lng) => setMarker({ lat, lng })}
                canvasWidth={logicalCanvas.width}
                interactive={markerInteractive}
              />
            )}

            {/* Secondary marker pin — only in dual map mode */}
            {isDualMap && secondMarker.enabled && (
              <DraggablePin
                slice="secondary"
                containerRef={mapAreaRef}
                markerLat={secondMarker.lat}
                markerLng={secondMarker.lng}
                markerType={secondMarker.type}
                markerColor={secondMarker.color}
                viewState={secondMap.viewState}
                defaultX="75%"
                onMove={(lat, lng) => setSecondMarker({ lat, lng })}
                canvasWidth={logicalCanvas.width}
                interactive={markerInteractive}
              />
            )}
            </div>
            {/* End of map area — photos and text use full poster coords */}

            {/* Decoration overlay — solid-colour SVG drawn over the full poster
                (string + cursive text etc.). Set per preset (config_json) or
                auto-applied from a custom mask's decoration_svg_url (PROJ-35).
                Colour follows shapeConfig.innerFrame.color so it stays in sync
                with the heart silhouette outline. Customer can hide via the
                Karten-Tab toggle (decorationVisible). Sits below photos/text. */}
            {decorationSvgUrl && decorationVisible && coloredDecorationUrl && (() => {
              // PROJ-38 follow-up: decoration must follow the same layout
              // transform the composer applies to the mask, otherwise the
              // two drift apart in non-full layouts (mask shrinks by
              // layoutScale, decoration stays at full A4 size). Combined
              // with the admin-tuned decoration_transform on top so admins
              // can fine-tune alignment in the pre-layout reference frame.
              const decoPxPerUnit = logicalCanvas.width / 595.3
              const layoutScale = (() => {
                if (!mask.shape) return 1
                const fitScale = Math.min(595.3 / mask.shape.width, 841.9 / mask.shape.height)
                const eff = (mask.shape.height * fitScale * (mask.shape.bottomFraction ?? 1)) / 841.9
                return eff > layoutMapHeight ? layoutMapHeight / eff : 1
              })()
              const layoutTxCanvas = 595.3 * (1 - layoutScale) / 2
              const layoutTyCanvas = layoutMapHeight < 1 ? 0 : 0
              const dt = mask.decorationTransform ?? { x: 0, y: 0, scale: 1 }
              const finalScale = layoutScale * dt.scale
              const finalTxCanvas = layoutTxCanvas + layoutScale * dt.x
              const finalTyCanvas = layoutTyCanvas + layoutScale * dt.y
              const isIdentity =
                finalScale === 1 && finalTxCanvas === 0 && finalTyCanvas === 0
              const decoStyle = isIdentity
                ? { objectFit: 'fill' as const }
                : {
                    objectFit: 'fill' as const,
                    transform: `translate(${finalTxCanvas * decoPxPerUnit}px, ${finalTyCanvas * decoPxPerUnit}px) scale(${finalScale})`,
                    transformOrigin: '0 0' as const,
                  }
              return (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={coloredDecorationUrl}
                  alt=""
                  className="absolute inset-0 w-full h-full pointer-events-none"
                  style={decoStyle}
                />
              )
            })()}

            {/* Photo overlay */}
            <PhotoOverlay posterRef={posterRef} interactive={photoInteractive} />

            {/* Text blocks overlay */}
            <TextBlockOverlay canvasWidth={logicalCanvas.width} interactive={textInteractive} />
          </div>
          </div>
          {/* End of visual wrapper (PROJ-37) */}

          {/* Map controls (zoom / locate) — only render when the map is
              interactive. On mobile this hides them unless the customer is
              actively in the Karte tab with sheet open; they sit just
              outside the poster and would otherwise overflow the viewport
              and trigger iOS horizontal rubber-band. (PROJ-43) */}
          {mapInteractive && (isDualMap ? (
            <>
              {/* Left map controls — left of poster */}
              <div
                className="absolute flex flex-col gap-1"
                style={{
                  top: `calc(50% - ${visualSize.height / 2}px)`,
                  left: `calc(50% - ${visualSize.width / 2}px - 44px)`,
                }}
              >
                <button
                  onClick={handleLocate}
                  disabled={locating}
                  className="w-8 h-8 rounded-md bg-white shadow border border-border flex items-center justify-center hover:bg-muted transition-colors disabled:opacity-50"
                  aria-label="Meinen Standort finden"
                  title="Meinen Standort (links)"
                >
                  <LocateFixed className={`w-4 h-4 text-foreground/70 ${locating ? 'animate-pulse' : ''}`} />
                </button>
                <button
                  onClick={zoomIn}
                  className="w-8 h-8 rounded-md bg-white shadow border border-border flex items-center justify-center hover:bg-muted transition-colors"
                  aria-label="Zoom in"
                  title="Hineinzoomen (links)"
                >
                  <Plus className="w-4 h-4 text-foreground/70" />
                </button>
                <button
                  onClick={zoomOut}
                  className="w-8 h-8 rounded-md bg-white shadow border border-border flex items-center justify-center hover:bg-muted transition-colors"
                  aria-label="Zoom out"
                  title="Herauszoomen (links)"
                >
                  <Minus className="w-4 h-4 text-foreground/70" />
                </button>
              </div>

              {/* Right map controls — right of poster */}
              <div
                className="absolute flex flex-col gap-1"
                style={{
                  top: `calc(50% - ${visualSize.height / 2}px)`,
                  left: `calc(50% + ${visualSize.width / 2}px + 12px)`,
                }}
              >
                <button
                  onClick={zoomInSecond}
                  className="w-8 h-8 rounded-md bg-white shadow border border-border flex items-center justify-center hover:bg-muted transition-colors"
                  aria-label="Zoom in"
                  title="Hineinzoomen (rechts)"
                >
                  <Plus className="w-4 h-4 text-foreground/70" />
                </button>
                <button
                  onClick={zoomOutSecond}
                  className="w-8 h-8 rounded-md bg-white shadow border border-border flex items-center justify-center hover:bg-muted transition-colors"
                  aria-label="Zoom out"
                  title="Herauszoomen (rechts)"
                >
                  <Minus className="w-4 h-4 text-foreground/70" />
                </button>
              </div>
            </>
          ) : (
            /* Single map controls — right of poster */
            <div
              className="absolute flex flex-col gap-1"
              style={{
                top: `calc(50% - ${visualSize.height / 2}px)`,
                left: `calc(50% + ${visualSize.width / 2}px + 12px)`,
              }}
            >
              <button
                onClick={handleLocate}
                disabled={locating}
                className="w-8 h-8 rounded-md bg-white shadow border border-border flex items-center justify-center hover:bg-muted transition-colors disabled:opacity-50"
                aria-label="Meinen Standort finden"
                title="Meinen Standort"
              >
                <LocateFixed className={`w-4 h-4 text-foreground/70 ${locating ? 'animate-pulse' : ''}`} />
              </button>
              <button
                onClick={zoomIn}
                className="w-8 h-8 rounded-md bg-white shadow border border-border flex items-center justify-center hover:bg-muted transition-colors"
                aria-label="Zoom in"
                title="Hineinzoomen"
              >
                <Plus className="w-4 h-4 text-foreground/70" />
              </button>
              <button
                onClick={zoomOut}
                className="w-8 h-8 rounded-md bg-white shadow border border-border flex items-center justify-center hover:bg-muted transition-colors"
                aria-label="Zoom out"
                title="Herauszoomen"
              >
                <Minus className="w-4 h-4 text-foreground/70" />
              </button>
            </div>
          ))}
        </>
        )
      })()}
    </div>
  )
}
