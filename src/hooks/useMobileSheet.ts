'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

const TAP_MOVEMENT_THRESHOLD_PX = 10
const TAP_DURATION_THRESHOLD_MS = 300
const KEYBOARD_HEIGHT_THRESHOLD_PX = 150

export type SheetState = 'closed' | 'open' | 'open-keyboard'

interface UseMobileSheetOptions<Tab extends string> {
  initialTab: Tab
}

interface UseMobileSheetReturn<Tab extends string> {
  isOpen: boolean
  sheetState: SheetState
  activeTab: Tab
  /** Bound to the tab-bar buttons. Tapping a closed sheet's tab opens it; tapping the current tab when open swaps content (no-op in that case). */
  openTab: (tab: Tab) => void
  close: () => void
  /** Spread onto the canvas wrapper. Triggers `close()` on a short, stationary tap whose target is NOT marked `data-canvas-interactive`. Pan/pinch/marker-tap leak through naturally. */
  canvasTapHandlers: {
    onPointerDown: (e: React.PointerEvent) => void
    onPointerMove: (e: React.PointerEvent) => void
    onPointerUp: (e: React.PointerEvent) => void
    onPointerCancel: (e: React.PointerEvent) => void
  }
}

/**
 * PROJ-43: Mobile tap-sheet state machine + canvas tap-to-close detector +
 * iOS keyboard awareness. Shared by all three editor layouts (Map, Star-Map,
 * Foto). One hook = one source of truth for "is the sheet open and how tall
 * is it right now".
 *
 * The keyboard branch listens to `visualViewport.resize` — when the visible
 * viewport shrinks by more than ~150 px, we assume the on-screen keyboard
 * appeared and grow the sheet to ~90% so the focused input stays above the
 * keyboard.
 */
export function useMobileSheet<Tab extends string>({
  initialTab,
}: UseMobileSheetOptions<Tab>): UseMobileSheetReturn<Tab> {
  const [isOpen, setIsOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<Tab>(initialTab)
  const [keyboardOpen, setKeyboardOpen] = useState(false)

  // visualViewport — Safari shrinks layout viewport when keyboard is up.
  useEffect(() => {
    const vv = typeof window !== 'undefined' ? window.visualViewport : null
    if (!vv) return
    const onResize = () => {
      const layoutHeight = window.innerHeight
      const visibleHeight = vv.height
      setKeyboardOpen(layoutHeight - visibleHeight > KEYBOARD_HEIGHT_THRESHOLD_PX)
    }
    vv.addEventListener('resize', onResize)
    onResize()
    return () => vv.removeEventListener('resize', onResize)
  }, [])

  const openTab = useCallback((tab: Tab) => {
    setActiveTab(tab)
    setIsOpen(true)
  }, [])

  const close = useCallback(() => {
    setIsOpen(false)
  }, [])

  // Tap-vs-pan detector. We don't capture the pointer — that would block
  // MapLibre's own drag handling. We just observe down/move/up and decide on
  // up whether it qualified as a tap.
  const tapRef = useRef({ startX: 0, startY: 0, startTime: 0, moved: false, target: null as Element | null })

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    tapRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startTime: e.timeStamp,
      moved: false,
      target: e.target as Element,
    }
  }, [])

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (tapRef.current.moved) return
    const dx = Math.abs(e.clientX - tapRef.current.startX)
    const dy = Math.abs(e.clientY - tapRef.current.startY)
    if (dx > TAP_MOVEMENT_THRESHOLD_PX || dy > TAP_MOVEMENT_THRESHOLD_PX) {
      tapRef.current.moved = true
    }
  }, [])

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    if (!isOpen) return
    if (tapRef.current.moved) return
    if (e.timeStamp - tapRef.current.startTime > TAP_DURATION_THRESHOLD_MS) return
    // Interactive opt-out: a marker / text-block / button can mark itself with
    // [data-canvas-interactive] to prevent canvas-tap-collapse on its hits.
    const target = tapRef.current.target
    if (target && target.closest('[data-canvas-interactive]')) return
    setIsOpen(false)
  }, [isOpen])

  const onPointerCancel = useCallback(() => {
    tapRef.current.moved = true
  }, [])

  return {
    isOpen,
    sheetState: !isOpen ? 'closed' : keyboardOpen ? 'open-keyboard' : 'open',
    activeTab,
    openTab,
    close,
    canvasTapHandlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel },
  }
}
