'use client'

import { createContext, useContext, useMemo, type ReactNode } from 'react'
import {
  useWeddingEditorStore,
  type WeddingSlot,
  type SlotIndex,
} from '@/hooks/useWeddingEditorStore'

/**
 * Slot binding shared with leaf components (LocationSearch, MapPreview,
 * masks-picker, style-picker, palette-picker) when the wedding editor wraps
 * them. The single-map editor never mounts this provider — leaves call the
 * `useSlotStateOrEditorStore()` hook (Chunk 3) which checks for context and
 * falls back to `useEditorStore`. Until Chunk 3 lands, the context exists
 * but is unused — that's intentional, it lets later chunks plug in without
 * editing every leaf at once.
 */
export interface SlotBinding {
  index: SlotIndex
  slot: WeddingSlot
  /** Slot-local partial updater. Equivalent to
   *  `useWeddingEditorStore.getState().updateSlot(index, updates)` but
   *  baked with the active index so leaf code can stay slot-index-agnostic. */
  updateSlot: (updates: Partial<WeddingSlot>) => void
  /** Force-set the slot's viewState (used by MapPreview when the user pans/zooms). */
  setViewState: (viewState: WeddingSlot['viewState']) => void
  /** Park a target lat/lng/zoom for the next MapPreview render. */
  flyTo: (lng: number, lat: number, zoom?: number) => void
  clearPendingCenter: () => void
  zoomIn: () => void
  zoomOut: () => void
  clearZoomDelta: () => void
}

const SlotStateContext = createContext<SlotBinding | null>(null)

/**
 * Provider used by `WeddingEditorShell` to bind the currently-selected slot
 * for the active sidebar tab. Re-binds whenever the active index changes or
 * the slot's own state changes — so leaf components stay reactive without
 * needing to know which slot they belong to.
 */
export function SlotStateProvider({
  index,
  children,
}: {
  index: SlotIndex
  children: ReactNode
}) {
  const slot = useWeddingEditorStore((s) => s.slots[index])
  const updateSlot = useWeddingEditorStore((s) => s.updateSlot)
  const setSlotViewState = useWeddingEditorStore((s) => s.setSlotViewState)
  const flyToSlotLocation = useWeddingEditorStore((s) => s.flyToSlotLocation)
  const clearSlotPendingCenter = useWeddingEditorStore((s) => s.clearSlotPendingCenter)
  const zoomInSlot = useWeddingEditorStore((s) => s.zoomInSlot)
  const zoomOutSlot = useWeddingEditorStore((s) => s.zoomOutSlot)
  const clearSlotZoomDelta = useWeddingEditorStore((s) => s.clearSlotZoomDelta)

  const binding = useMemo<SlotBinding>(
    () => ({
      index,
      slot,
      updateSlot: (updates) => updateSlot(index, updates),
      setViewState: (viewState) => setSlotViewState(index, viewState),
      flyTo: (lng, lat, zoom) => flyToSlotLocation(index, lng, lat, zoom),
      clearPendingCenter: () => clearSlotPendingCenter(index),
      zoomIn: () => zoomInSlot(index),
      zoomOut: () => zoomOutSlot(index),
      clearZoomDelta: () => clearSlotZoomDelta(index),
    }),
    [
      index,
      slot,
      updateSlot,
      setSlotViewState,
      flyToSlotLocation,
      clearSlotPendingCenter,
      zoomInSlot,
      zoomOutSlot,
      clearSlotZoomDelta,
    ],
  )

  return <SlotStateContext.Provider value={binding}>{children}</SlotStateContext.Provider>
}

/**
 * Returns the active slot binding, or `null` when not inside a
 * `SlotStateProvider`. Leaf components use this via
 * `useSlotStateOrEditorStore()` (Chunk 3) to decide between slot-based and
 * editor-store-based reads.
 */
export function useSlotBinding(): SlotBinding | null {
  return useContext(SlotStateContext)
}
