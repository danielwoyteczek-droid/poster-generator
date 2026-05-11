'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { getMapInstance } from '@/hooks/useMapInstance'
import type { ViewState } from '@/hooks/useEditorStore'
import { resolvePinSizePx } from '@/lib/pin-scale'

function ClassicPin({ color, width, height }: { color: string; width: number; height: number }) {
  return (
    <svg width={width} height={height} viewBox="0 0 28 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M14 0C6.27 0 0 6.27 0 14C0 24.5 14 40 14 40C14 40 28 24.5 28 14C28 6.27 21.73 0 14 0Z" fill={color} />
      <circle cx="14" cy="13" r="5" fill="white" fillOpacity="0.85" />
    </svg>
  )
}

function HeartPin({ color, width, height }: { color: string; width: number; height: number }) {
  return (
    <svg width={width} height={height} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M16 30C16 30 2 19 2 10C2 5.58 5.58 2 10 2C12.5 2 14.74 3.18 16 5C17.26 3.18 19.5 2 22 2C26.42 2 30 5.58 30 10C30 19 16 30 16 30Z" fill={color} />
    </svg>
  )
}

interface Props {
  slice: 'primary' | 'secondary'
  containerRef: React.RefObject<HTMLDivElement | null>
  markerLat: number | null | undefined
  markerLng: number | null | undefined
  markerType: 'classic' | 'heart'
  markerColor: string
  viewState: ViewState  // triggers re-render on map pan
  defaultX: string // CSS percentage fallback when no safeArea is provided
  onMove: (lat: number, lng: number) => void
  /** Logical canvas width (PROJ-37). Used together with `canvasHeight` to
   *  size the pin SVG so it stays visually proportional to the poster
   *  across A4/A3/A2 — without this the pin's hardcoded 28×40 / 32×32 px
   *  shrinks relative to a larger canvas. */
  canvasWidth: number
  /** Logical canvas height. Pin size resolves against `min(width, height)`
   *  so flipping orientation (portrait↔landscape) doesn't change the pin
   *  size for the same paper format. */
  canvasHeight: number
  /** When false, disables pointer interaction so the pin is only visible.
   *  Used on Mobile to keep the pin non-draggable from tabs other than
   *  Marker. Defaults to true (Desktop behaviour unchanged). */
  interactive?: boolean
  /**
   * Optional visible-mask half rect, in container fractions (0..1). When
   * provided:
   *  - default position (lat/lng null) sits at the rect's centre instead of
   *    the fixed `defaultX` / 50%, so the pin lands inside the silhouette
   *    even when the mask is letterboxed (e.g. landscape circle).
   *  - projected positions (lat/lng set) get clamped to this rect, so a
   *    panned map can't slide the pin into the empty area outside the
   *    visible silhouette. The pin still represents the same geographic
   *    point — only the visual position is clamped.
   */
  safeArea?: { left: number; right: number; top: number; bottom: number }
}

/**
 * A draggable pin overlay positioned via lat/lng when the user has explicitly
 * dragged it; otherwise anchored to defaultX/50% of the container.
 */
export function DraggablePin({
  slice, containerRef, markerLat, markerLng, markerType, markerColor,
  viewState, defaultX, onMove, canvasWidth, canvasHeight, interactive = true, safeArea,
}: Props) {
  const pinSize = resolvePinSizePx(markerType, canvasWidth, canvasHeight)
  const [dragging, setDragging] = useState(false)
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null)
  const pinRef = useRef<HTMLDivElement>(null)

  // Compute the pin's pixel position within the container. Either:
  //  - from marker.lat/lng (via map.project) when explicitly placed
  //  - from safeArea centre / defaultX / 50% when not placed
  //  - from dragPos during an active drag
  const computePosition = useCallback((): { left: string; top: string } => {
    if (dragPos) {
      return { left: `${dragPos.x}px`, top: `${dragPos.y}px` }
    }
    if (markerLat != null && markerLng != null) {
      const map = getMapInstance(slice)
      const containerEl = containerRef.current
      if (map && containerEl) {
        const pt = map.project([markerLng, markerLat])
        // Clamp the projected position into the visible-mask rect so a
        // panned map can't drag the pin into the empty letterbox area
        // outside the silhouette. Acts on the rendered pixels only — the
        // stored marker.lat/lng (and the geographic meaning) stay intact.
        if (safeArea) {
          const w = containerEl.clientWidth
          const h = containerEl.clientHeight
          const minX = safeArea.left * w
          const maxX = safeArea.right * w
          const minY = safeArea.top * h
          const maxY = safeArea.bottom * h
          const cx = Math.max(minX, Math.min(maxX, pt.x))
          const cy = Math.max(minY, Math.min(maxY, pt.y))
          return { left: `${cx}px`, top: `${cy}px` }
        }
        return { left: `${pt.x}px`, top: `${pt.y}px` }
      }
    }
    if (safeArea) {
      // Default: centre of the half-mask rect, so the pin sits comfortably
      // inside the visible silhouette regardless of orientation/aspect.
      const cxPct = ((safeArea.left + safeArea.right) / 2) * 100
      const cyPct = ((safeArea.top + safeArea.bottom) / 2) * 100
      return { left: `${cxPct}%`, top: `${cyPct}%` }
    }
    return { left: defaultX, top: '50%' }
  }, [dragPos, markerLat, markerLng, slice, containerRef, defaultX, viewState, safeArea])
  // `viewState` intentionally in deps so the pin re-projects after pan/zoom

  const [pos, setPos] = useState(computePosition)
  useEffect(() => { setPos(computePosition()) }, [computePosition])

  const handlePointerDown = (e: React.PointerEvent) => {
    e.stopPropagation()
    const container = containerRef.current
    if (!container) return
    setDragging(true)
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)

    // PROJ-37: container lebt innerhalb des CSS-transform-skalierten Poster-
    // divs (Logical Canvas Pattern). getBoundingClientRect() liefert daher
    // VISUELLE Pixel (post-transform), während clientWidth/Height die
    // LOGISCHEN Layout-Pixel zurückgeben. Pin-CSS-Positionen + map.unproject
    // erwarten beide LOGISCHE Pixel — das Verhältnis rect-vs-clientWidth
    // gibt uns den Skalierungsfaktor ohne dass DraggablePin visualScale
    // explizit wissen muss.
    const visualRect = container.getBoundingClientRect()
    const logicalW = container.clientWidth
    const logicalH = container.clientHeight
    const toLogical = (clientX: number, clientY: number) => {
      const xV = clientX - visualRect.left
      const yV = clientY - visualRect.top
      const xL = visualRect.width > 0 ? (xV / visualRect.width) * logicalW : xV
      const yL = visualRect.height > 0 ? (yV / visualRect.height) * logicalH : yV
      return {
        x: Math.max(0, Math.min(logicalW, xL)),
        y: Math.max(0, Math.min(logicalH, yL)),
      }
    }

    // Pin-Anker (bottom-center, weil das Pin-Element via translate(-50%,-100%)
    // dort verankert ist) im Logical-Pixel-Raum berechnen. Der Touch-Punkt
    // sitzt typischerweise NICHT exakt auf dem Anker — gerade auf Mobile
    // legt der Finger irgendwo in den Pin-Body. Ohne Offset-Tracking würde
    // der Pin beim ersten Move-Event auf den Touch-Punkt springen
    // ("Pin springt nach links oben"). Wir merken uns delta = touch − anchor
    // und verschieben den Pin damit, sodass der Pin relativ zum Cursor stehen
    // bleibt.
    const pinEl = e.currentTarget as HTMLElement
    const pinVisualRect = pinEl.getBoundingClientRect()
    const anchorVx = pinVisualRect.left + pinVisualRect.width / 2 - visualRect.left
    const anchorVy = pinVisualRect.bottom - visualRect.top
    const anchorLx = visualRect.width > 0 ? (anchorVx / visualRect.width) * logicalW : anchorVx
    const anchorLy = visualRect.height > 0 ? (anchorVy / visualRect.height) * logicalH : anchorVy
    const startTouch = toLogical(e.clientX, e.clientY)
    const offsetX = startTouch.x - anchorLx
    const offsetY = startTouch.y - anchorLy

    const handleMove = (ev: PointerEvent) => {
      const t = toLogical(ev.clientX, ev.clientY)
      setDragPos({
        x: Math.max(0, Math.min(logicalW, t.x - offsetX)),
        y: Math.max(0, Math.min(logicalH, t.y - offsetY)),
      })
    }
    const handleUp = (ev: PointerEvent) => {
      document.removeEventListener('pointermove', handleMove)
      document.removeEventListener('pointerup', handleUp)
      setDragging(false)
      const t = toLogical(ev.clientX, ev.clientY)
      const x = Math.max(0, Math.min(logicalW, t.x - offsetX))
      const y = Math.max(0, Math.min(logicalH, t.y - offsetY))
      setDragPos(null)
      // Convert pixel position back to lat/lng via MapTiler unproject
      const map = getMapInstance(slice)
      if (map) {
        const ll = map.unproject([x, y])
        onMove(ll.lat, ll.lng)
      }
    }
    document.addEventListener('pointermove', handleMove)
    document.addEventListener('pointerup', handleUp)
  }

  return (
    <div
      ref={pinRef}
      data-testid={`marker-pin-${slice}`}
      className={
        interactive
          ? 'absolute cursor-grab active:cursor-grabbing touch-none select-none'
          : 'absolute select-none'
      }
      style={{
        left: pos.left,
        top: pos.top,
        transform: 'translateX(-50%) translateY(-100%)',
        zIndex: 10,
        opacity: dragging ? 0.85 : 1,
        pointerEvents: interactive ? 'auto' : 'none',
      }}
      onPointerDown={interactive ? handlePointerDown : undefined}
      title={interactive ? 'Pin verschieben' : undefined}
    >
      {markerType === 'heart'
        ? <HeartPin color={markerColor} width={pinSize.width} height={pinSize.height} />
        : <ClassicPin color={markerColor} width={pinSize.width} height={pinSize.height} />}
    </div>
  )
}
