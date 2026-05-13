import { create } from 'zustand'
import type { MapMaskKey } from '@/lib/map-masks'
import type { MapPaletteColors } from '@/lib/map-palettes'
import { DEFAULT_SHAPE_CONFIG, type ShapeConfigState } from '@/lib/mask-composer'
import type { ViewState, MarkerState } from '@/hooks/useEditorStore'

export type SlotIndex = 0 | 1 | 2

/**
 * Slot-Anordnung wird DETERMINISTISCH aus `useEditorStore.orientation`
 * abgeleitet — Portrait → drei Karten untereinander, Landscape → drei
 * Karten nebeneinander. Bewusst keine manuelle Override, weil die "kleine
 * Slot-Variante" (z. B. horizontal-3 auf A4-Portrait) physisch nicht lesbar
 * wäre (~70 mm pro Karte).
 *
 * Helper in `wedding-layout.ts` rechnet das beim Render aus.
 */

export interface WeddingSlot {
  viewState: ViewState
  pendingCenter: { lng: number; lat: number; zoom: number } | null
  pendingZoomDelta: number | null
  styleId: string
  paletteId: string
  customPaletteBase: string | null
  customPalette: MapPaletteColors | null
  streetLabelsVisible: boolean
  maskKey: MapMaskKey
  shapeConfig: ShapeConfigState
  marker: MarkerState
  decorationSvgUrl: string | null
  decorationVisible: boolean
  locationName: string
  /** Slot title rendered above the map (e.g. "Wo wir uns trafen"). Empty
   *  string means no label is rendered. The editor shell pre-fills these
   *  from the active locale on mount via `applyDefaultLabels`. */
  label: string
  /** Slot-specific date rendered below the map. Empty string = no date. */
  date: string
}

const DEFAULT_MARKER: MarkerState = {
  enabled: false,
  type: 'classic',
  color: '#1F3A44',
  lat: null,
  lng: null,
}

/** München fallback — matches `useStarMapStore` and `useEditorStore` defaults
 *  so the first paint already shows a recognisable city instead of mid-Atlantic. */
const DEFAULT_VIEW_STATE: ViewState = {
  lng: 11.576124,
  lat: 48.137154,
  zoom: 12,
  viewportWidth: 500,
  viewportHeight: 500,
  bounds: { west: 11.4, south: 48.05, east: 11.75, north: 48.22 },
}

/** All three slots start IDENTICAL (style, palette, mask) so the empty editor
 *  already looks like a coherent triptychon — see PROJ-45 edge case
 *  "Default-Style-Harmonie". Users override per slot from there. */
export function getInitialSlotState(): WeddingSlot {
  return {
    viewState: { ...DEFAULT_VIEW_STATE, bounds: { ...DEFAULT_VIEW_STATE.bounds } },
    pendingCenter: null,
    pendingZoomDelta: null,
    styleId: 'klassisch',
    paletteId: 'classic',
    customPaletteBase: null,
    customPalette: null,
    streetLabelsVisible: true,
    maskKey: 'circle' as MapMaskKey,
    shapeConfig: { ...DEFAULT_SHAPE_CONFIG },
    marker: { ...DEFAULT_MARKER },
    decorationSvgUrl: null,
    decorationVisible: true,
    locationName: '',
    label: '',
    date: '',
  }
}

export interface WeddingEditorStore {
  slots: [WeddingSlot, WeddingSlot, WeddingSlot]
  activeSlotIndex: SlotIndex
  coupleNames: string
  weddingDate: string
  /** Toggled by the poster background renderer — mirrors useEditorStore so
   *  per-poster theming stays one flag, not three. Wedding does NOT support
   *  per-slot dark/light yet. */
  posterDarkMode: boolean

  setActiveSlotIndex: (index: SlotIndex) => void
  updateSlot: (index: SlotIndex, updates: Partial<WeddingSlot>) => void
  setSlotLocation: (index: SlotIndex, lat: number, lng: number, locationName: string) => void
  setSlotLabel: (index: SlotIndex, label: string) => void
  setSlotDate: (index: SlotIndex, date: string) => void
  setSlotViewState: (index: SlotIndex, viewState: ViewState) => void
  flyToSlotLocation: (index: SlotIndex, lng: number, lat: number, zoom?: number) => void
  clearSlotPendingCenter: (index: SlotIndex) => void
  zoomInSlot: (index: SlotIndex) => void
  zoomOutSlot: (index: SlotIndex) => void
  clearSlotZoomDelta: (index: SlotIndex) => void

  setCoupleNames: (names: string) => void
  setWeddingDate: (date: string) => void
  setPosterDarkMode: (on: boolean) => void

  /** Bulk-apply locale-default labels (e.g. "Wo wir uns trafen" …) from the
   *  editor shell on mount. Only fills slots whose label is still empty so
   *  refresh/draft-restore doesn't clobber a user's custom edits. */
  applyDefaultLabels: (labels: [string, string, string]) => void

  reset: () => void
}

export function getWeddingInitialState() {
  return {
    slots: [getInitialSlotState(), getInitialSlotState(), getInitialSlotState()] as [
      WeddingSlot,
      WeddingSlot,
      WeddingSlot,
    ],
    activeSlotIndex: 0 as SlotIndex,
    coupleNames: '',
    weddingDate: '',
    posterDarkMode: false,
  }
}

function patchSlot(
  slots: [WeddingSlot, WeddingSlot, WeddingSlot],
  index: SlotIndex,
  updates: Partial<WeddingSlot>,
): [WeddingSlot, WeddingSlot, WeddingSlot] {
  const next = [...slots] as [WeddingSlot, WeddingSlot, WeddingSlot]
  next[index] = { ...next[index], ...updates }
  return next
}

export const useWeddingEditorStore = create<WeddingEditorStore>((set) => ({
  ...getWeddingInitialState(),

  setActiveSlotIndex: (activeSlotIndex) => set({ activeSlotIndex }),

  updateSlot: (index, updates) =>
    set((s) => ({ slots: patchSlot(s.slots, index, updates) })),

  setSlotLocation: (index, lat, lng, locationName) =>
    set((s) => ({
      slots: patchSlot(s.slots, index, {
        locationName,
        // Park lat/lng in pendingCenter — the slot's MapPreview will fly
        // there on next render and then clear via `clearSlotPendingCenter`.
        // Mirrors useEditorStore.setLocation behaviour.
        pendingCenter: { lng, lat, zoom: s.slots[index].viewState.zoom },
      }),
    })),

  setSlotLabel: (index, label) =>
    set((s) => ({ slots: patchSlot(s.slots, index, { label }) })),

  setSlotDate: (index, date) =>
    set((s) => ({ slots: patchSlot(s.slots, index, { date }) })),

  setSlotViewState: (index, viewState) =>
    set((s) => ({ slots: patchSlot(s.slots, index, { viewState }) })),

  flyToSlotLocation: (index, lng, lat, zoom) =>
    set((s) => ({
      slots: patchSlot(s.slots, index, {
        pendingCenter: { lng, lat, zoom: zoom ?? s.slots[index].viewState.zoom },
      }),
    })),

  clearSlotPendingCenter: (index) =>
    set((s) => ({ slots: patchSlot(s.slots, index, { pendingCenter: null }) })),

  zoomInSlot: (index) =>
    set((s) => ({
      slots: patchSlot(s.slots, index, {
        pendingZoomDelta: (s.slots[index].pendingZoomDelta ?? 0) + 1,
      }),
    })),

  zoomOutSlot: (index) =>
    set((s) => ({
      slots: patchSlot(s.slots, index, {
        pendingZoomDelta: (s.slots[index].pendingZoomDelta ?? 0) - 1,
      }),
    })),

  clearSlotZoomDelta: (index) =>
    set((s) => ({ slots: patchSlot(s.slots, index, { pendingZoomDelta: null }) })),

  setCoupleNames: (coupleNames) => set({ coupleNames }),
  setWeddingDate: (weddingDate) => set({ weddingDate }),
  setPosterDarkMode: (posterDarkMode) => set({ posterDarkMode }),

  applyDefaultLabels: (labels) =>
    set((s) => {
      const next = [...s.slots] as [WeddingSlot, WeddingSlot, WeddingSlot]
      for (let i = 0; i < 3; i++) {
        const slot = next[i as SlotIndex]
        if (slot.label === '') {
          next[i as SlotIndex] = { ...slot, label: labels[i] }
        }
      }
      return { slots: next }
    }),

  reset: () => set(getWeddingInitialState()),
}))
