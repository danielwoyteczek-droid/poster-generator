'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { getMapInstance } from '@/hooks/useMapInstance'
import type { ViewState } from '@/hooks/useEditorStore'

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

interface Props {
  slice: 'primary' | 'secondary'
  containerRef: React.RefObject<HTMLDivElement | null>
  markerLat: number | null | undefined
  markerLng: number | null | undefined
  markerType: 'classic' | 'heart'
  markerColor: string
  viewState: ViewState  // triggers re-render on map pan
  defaultX: string // CSS percentage, e.g. '50%' or '25%'
  onMove: (lat: number, lng: number) => void
}

/**
 * A draggable pin overlay positioned via lat/lng when the user has explicitly
 * dragged it; otherwise anchored to defaultX/50% of the container.
 */
export function DraggablePin({
  slice, containerRef, markerLat, markerLng, markerType, markerColor,
  viewState, defaultX, onMove,
}: Props) {
  const [dragging, setDragging] = useState(false)
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null)
  const pinRef = useRef<HTMLDivElement>(null)

  // Compute the pin's pixel position within the container. Either:
  //  - from marker.lat/lng (via map.project) when explicitly placed
  //  - from defaultX/50% when not placed (follows map center)
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
        // MapTiler's container is the map viewport; our containerRef is the poster.
        // Map container dimensions === poster container dimensions (they share size in our layout).
        return { left: `${pt.x}px`, top: `${pt.y}px` }
      }
    }
    return { left: defaultX, top: '50%' }
  }, [dragPos, markerLat, markerLng, slice, containerRef, defaultX, viewState])
  // `viewState` intentionally in deps so the pin re-projects after pan/zoom

  const [pos, setPos] = useState(computePosition)
  useEffect(() => { setPos(computePosition()) }, [computePosition])

  const handlePointerDown = (e: React.PointerEvent) => {
    e.stopPropagation()
    const container = containerRef.current
    if (!container) return
    setDragging(true)
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)

    const rect = container.getBoundingClientRect()

    const handleMove = (ev: PointerEvent) => {
      const x = Math.max(0, Math.min(rect.width, ev.clientX - rect.left))
      const y = Math.max(0, Math.min(rect.height, ev.clientY - rect.top))
      setDragPos({ x, y })
    }
    const handleUp = (ev: PointerEvent) => {
      document.removeEventListener('pointermove', handleMove)
      document.removeEventListener('pointerup', handleUp)
      setDragging(false)
      const x = Math.max(0, Math.min(rect.width, ev.clientX - rect.left))
      const y = Math.max(0, Math.min(rect.height, ev.clientY - rect.top))
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
      className="absolute cursor-grab active:cursor-grabbing touch-none select-none"
      style={{
        left: pos.left,
        top: pos.top,
        transform: 'translateX(-50%) translateY(-100%)',
        zIndex: 10,
        opacity: dragging ? 0.85 : 1,
      }}
      onPointerDown={handlePointerDown}
      title="Pin verschieben"
    >
      {markerType === 'heart' ? <HeartPin color={markerColor} /> : <ClassicPin color={markerColor} />}
    </div>
  )
}
