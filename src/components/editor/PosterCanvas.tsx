'use client'

import { useRef, useEffect, useState } from 'react'
import { Plus, Minus, LocateFixed } from 'lucide-react'
import { useEditorStore, LAYOUT_MAP_HEIGHT } from '@/hooks/useEditorStore'
import { computeFontScale } from '@/lib/font-scale'
import { useCustomMasks } from '@/hooks/useCustomMasks'
import { MAP_MASKS } from '@/lib/map-masks'
import { composeMaskSvg, composeFrameSvg, svgToDataUrl, hasAnyFrame } from '@/lib/mask-composer'
import { PRINT_FORMATS } from '@/lib/print-formats'
import { MapPreview } from './MapPreview'
import { TextBlockOverlay } from './TextBlockOverlay'
import { DraggablePin } from './DraggablePin'
import { PhotoOverlay } from './PhotoOverlay'
import { SplitPhotoOverlay } from './SplitPhotoOverlay'

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
  return {
    maskImage: `url(${svgPath})`,
    WebkitMaskImage: `url(${svgPath})`,
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
  const [posterSize, setPosterSize] = useState({ width: 0, height: 0 })
  const [locating, setLocating] = useState(false)
  const fontScale = computeFontScale(posterSize.width)

  // On Mobile exactly one overlay is interactive at a time, matched to the
  // active tab. On Desktop (activeMobileTool === undefined) every overlay
  // is interactive simultaneously — unchanged pre-existing behaviour.
  const mapInteractive = activeMobileTool === undefined || activeMobileTool === 'map'
  const textInteractive = activeMobileTool === undefined || activeMobileTool === 'text'
  const photoInteractive = activeMobileTool === undefined || activeMobileTool === 'photo'
  const markerInteractive = activeMobileTool === undefined || activeMobileTool === 'marker'

  const { maskKey, printFormat, zoomIn, zoomOut, flyToLocation, zoomInSecond, zoomOutSecond, secondMap, marker, secondMarker, shapeConfig, viewState, setMarker, setSecondMarker, setSelectedBlockId, splitMode, splitPhoto, splitPhotoZone, layoutId, innerMarginMm } = useEditorStore()
  const mapAreaRef = useRef<HTMLDivElement>(null)
  const { masks: customMasks } = useCustomMasks()
  const mask =
    (MAP_MASKS as Record<string, typeof MAP_MASKS['none']>)[maskKey] ??
    customMasks.find((m) => m.key === maskKey) ??
    MAP_MASKS.none
  const format = PRINT_FORMATS[printFormat]
  const ratio = format.widthMm / format.heightMm

  const isDualMap = mask.isSplit && splitMode === 'second-map'
  const isSplitPhoto = mask.isSplit && splitMode === 'photo' && splitPhoto != null
  // Zone 0 = left/first half, zone 1 = right/second half
  const photoIsRightZone = splitPhotoZone === 1
  const mapHalfSvg = isSplitPhoto
    ? (photoIsRightZone ? mask.leftSvgPath : mask.rightSvgPath)
    : null
  const photoHalfSvg = isSplitPhoto
    ? (photoIsRightZone ? mask.rightSvgPath : mask.leftSvgPath)
    : null
  const useComposedMask = !!mask.shape && !isDualMap && !isSplitPhoto
  const layoutMapHeight = LAYOUT_MAP_HEIGHT[layoutId]
  const composedMaskDataUrl = useComposedMask && mask.shape
    ? svgToDataUrl(composeMaskSvg(mask.shape, shapeConfig, layoutMapHeight))
    : null
  const composedFrameDataUrl = useComposedMask && mask.shape && hasAnyFrame(shapeConfig)
    ? svgToDataUrl(composeFrameSvg(mask.shape, shapeConfig, layoutMapHeight))
    : null

  useEffect(() => {
    if (!wrapperRef.current) return
    const compute = (width: number, height: number) => {
      const availW = width - padding
      const availH = height - padding
      if (availW <= 0 || availH <= 0) return
      if (availW / ratio <= availH) {
        setPosterSize({ width: availW, height: availW / ratio })
      } else {
        setPosterSize({ width: availH * ratio, height: availH })
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
      {posterSize.width > 0 && (() => {
        const mmToPx = posterSize.width / format.widthMm
        const marginPx = innerMarginMm * mmToPx
        // Layout only shrinks the map when the user has no shape (plain
        // rectangle). Circles, hearts and splits already position themselves
        // in the upper part of the poster, so scaling the container would
        // squash them vertically. Shapes handle their own framing.
        const isPlainRectangle = !mask.shape && !mask.isSplit
        const mapHeightFactor = isPlainRectangle ? LAYOUT_MAP_HEIGHT[layoutId] : 1.0
        return (
        <>
          <div
            ref={posterRef}
            className="relative bg-white shadow-2xl overflow-hidden flex-none"
            style={{ width: posterSize.width, height: posterSize.height }}
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
              const leftClip = `polygon(0 0, ${leftEdge} 0, ${leftEdge} 100%, 0 100%)`
              const rightClip = `polygon(${rightEdge} 0, 100% 0, 100% 100%, ${rightEdge} 100%)`
              return (
              <>
                {/* Left map — clip-path restricts pointer events to left half unless the
                    mask explicitly extends across the midline */}
                <div
                  className="absolute inset-0"
                  style={{
                    ...(mask.leftSvgPath ? makeMaskStyle(mask.leftSvgPath) : {}),
                    ...(mask.noHalfClip ? {} : { clipPath: leftClip }),
                  }}
                >
                  <MapPreview storeSlice="primary" />
                </div>
                {/* Right map — same, but clipped to the right half */}
                <div
                  className="absolute inset-0"
                  style={{
                    ...(mask.rightSvgPath ? makeMaskStyle(mask.rightSvgPath) : {}),
                    ...(mask.noHalfClip ? {} : { clipPath: rightClip }),
                  }}
                >
                  <MapPreview storeSlice="secondary" />
                </div>
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
                interactive={markerInteractive}
              />
            )}
            </div>
            {/* End of map area — photos and text use full poster coords */}

            {/* Photo overlay */}
            <PhotoOverlay posterRef={posterRef} interactive={photoInteractive} />

            {/* Text blocks overlay */}
            <TextBlockOverlay fontScale={fontScale} interactive={textInteractive} />
          </div>

          {isDualMap ? (
            <>
              {/* Left map controls — left of poster */}
              <div
                className="absolute flex flex-col gap-1"
                style={{
                  top: `calc(50% - ${posterSize.height / 2}px)`,
                  left: `calc(50% - ${posterSize.width / 2}px - 44px)`,
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
                  top: `calc(50% - ${posterSize.height / 2}px)`,
                  left: `calc(50% + ${posterSize.width / 2}px + 12px)`,
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
                top: `calc(50% - ${posterSize.height / 2}px)`,
                left: `calc(50% + ${posterSize.width / 2}px + 12px)`,
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
          )}
        </>
        )
      })()}
    </div>
  )
}
