'use client'

import { useRef, useState } from 'react'

/**
 * PROJ-36: Drag/tap-resize state for the mobile canvas-vs-sidebar split.
 *
 * - Drag → free vh movement, snap to nearest of [12, 30, 58] on release
 * - Tap (no movement) → toggle between Default 58vh and Collapsed 12vh
 *
 * The caller renders the canvas with `style={{ height: canvasVh + 'vh' }}`
 * and the drag-handle with `{...handleProps}`. `isDragging` is exposed so
 * the canvas can disable its height transition during active drag — without
 * it, the canvas lags behind the finger one frame.
 *
 * Used by all three mobile editor layouts (Map, Star-Map, Foto).
 */

const SNAP_POINTS_VH = [12, 30, 58] as const
const DEFAULT_CANVAS_VH = 58
const COLLAPSED_CANVAS_VH = 12
const TAP_THRESHOLD_PX = 4
const MIN_VH = 8
const MAX_VH = 72

export function useCanvasResize() {
  const [canvasVh, setCanvasVh] = useState<number>(DEFAULT_CANVAS_VH)
  const [isDragging, setIsDragging] = useState(false)
  const dragRef = useRef({ startY: 0, startVh: DEFAULT_CANVAS_VH, moved: false })

  const handleProps = {
    role: 'separator' as const,
    'aria-orientation': 'horizontal' as const,
    onPointerDown: (e: React.PointerEvent) => {
      e.currentTarget.setPointerCapture(e.pointerId)
      dragRef.current = { startY: e.clientY, startVh: canvasVh, moved: false }
      setIsDragging(true)
    },
    onPointerMove: (e: React.PointerEvent) => {
      if (!e.currentTarget.hasPointerCapture(e.pointerId)) return
      const deltaY = e.clientY - dragRef.current.startY
      if (Math.abs(deltaY) > TAP_THRESHOLD_PX) dragRef.current.moved = true
      const deltaVh = (deltaY / window.innerHeight) * 100
      const next = Math.max(MIN_VH, Math.min(MAX_VH, dragRef.current.startVh + deltaVh))
      setCanvasVh(next)
    },
    onPointerUp: (e: React.PointerEvent) => {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId)
      }
      setIsDragging(false)
      if (!dragRef.current.moved) {
        // Tap — toggle between Default and Collapsed. "Other side" rule:
        // upper half snaps to Collapsed, lower half snaps back to Default.
        setCanvasVh(canvasVh > 35 ? COLLAPSED_CANVAS_VH : DEFAULT_CANVAS_VH)
        return
      }
      // Drag release — snap to nearest defined point.
      const nearest = SNAP_POINTS_VH.reduce(
        (best, p) => (Math.abs(p - canvasVh) < Math.abs(best - canvasVh) ? p : best),
        SNAP_POINTS_VH[0],
      )
      setCanvasVh(nearest)
    },
    onPointerCancel: (e: React.PointerEvent) => {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId)
      }
      setIsDragging(false)
    },
  }

  const canvasStyle: React.CSSProperties = {
    height: `${canvasVh}vh`,
    transition: isDragging ? 'none' : 'height 200ms ease-out',
  }

  return { canvasVh, canvasStyle, handleProps, isDragging }
}
