import { create } from 'zustand'
import {
  LETTER_MASK_DEFAULT_WORD,
  LETTER_MASK_DEFAULT_SLOT_COLOR,
  LETTER_MASK_DEFAULT_WORD_WIDTH,
  type MaskFontKey,
} from '@/lib/letter-mask'
import type { PosterOrientation } from '@/lib/print-formats'
import type { PhotoFilter } from '@/hooks/useEditorStore'
import type { PhotoMaskKey } from '@/lib/photo-masks'
import {
  DEFAULT_GRID_LAYOUT,
  type GridSlotDefinition,
} from '@/lib/grid-layout'

export type PhotoLayoutMode = 'letter-mask' | 'single-photo' | 'photo-grid'

export type { PosterOrientation }

export interface SlotPhoto {
  storagePath: string
  publicUrl: string
  width: number
  height: number
  /** -0.5 .. 0.5: horizontal pan inside the slot (0 = centered) */
  cropX: number
  /** -0.5 .. 0.5: vertical pan inside the slot (0 = centered) */
  cropY: number
  /** 1.0 .. 4.0: zoom factor inside the slot, 1.0 = cover */
  scale: number
  uploadedAt: string
}

export interface LetterSlot {
  /** Single uppercase character (A-Z, ÄÖÜß). */
  char: string
  photo: SlotPhoto | null
  /** Hex color override; null inherits `defaultSlotColor`. */
  color: string | null
}

/**
 * Single-photo mode state. The customer uploads one photo, picks a mask
 * (full / circle / heart / square / portrait / landscape) and pans/zooms
 * the image inside that mask. Mirrors `SlotPhoto` shape so downstream
 * (export, preset save, persistence) treats both modes the same way.
 */
/**
 * Photo-grid mode: per-slot runtime state that pairs with the layout
 * defined on the preset (`GridSlotDefinition`). Mirrors `LetterSlot`'s
 * shape so that the same upload + crop UX works across both modes.
 */
export interface GridSlotState {
  /** Stable slot id, mirroring the layout definition's id. */
  id: string
  photo: SlotPhoto | null
  /** Hex color override; null inherits `defaultSlotColor`. */
  color: string | null
}

export interface SinglePhotoState {
  storagePath: string
  publicUrl: string
  width: number
  height: number
  /** -0.5 .. 0.5: horizontal pan inside the mask (0 = centered) */
  cropX: number
  /** -0.5 .. 0.5: vertical pan inside the mask (0 = centered) */
  cropY: number
  /** 1.0 .. 4.0: zoom factor inside the mask, 1.0 = cover */
  scale: number
  /** Optional CSS-filter preset id (none / grayscale / sepia). */
  filter: PhotoFilter
  uploadedAt: string
}

interface PhotoEditorStore {
  layoutMode: PhotoLayoutMode
  word: string
  /** Horizontal share of the poster width the word occupies, 0..1. Customer
   *  controls this via a slider — larger value = bigger letters. */
  wordWidth: number
  /** Horizontal center of the word as fraction of poster width (0..1).
   *  0.5 = centered. */
  wordX: number
  /** Top edge of the word as fraction of poster height (0..1). */
  wordY: number
  /** 'portrait' = paper standing tall (default for A4/A3 prints).
   *  'landscape' = paper lying on its side. The canvas flips its aspect
   *  ratio accordingly. */
  orientation: PosterOrientation
  maskFontKey: MaskFontKey
  slots: LetterSlot[]
  defaultSlotColor: string
  selectedSlotIndex: number | null

  /** Single-photo mode: the uploaded photo (or null if not yet provided). */
  singlePhoto: SinglePhotoState | null
  /** Single-photo mode: which mask to clip the photo with. */
  singlePhotoMaskKey: PhotoMaskKey

  /** Photo-grid mode: slot rectangles authored by Admin (frozen for the
   *  customer; preset-fixed). Empty = no preset applied yet. */
  gridLayout: GridSlotDefinition[]
  /** Photo-grid mode: per-slot photo / color state, indexed parallel to
   *  `gridLayout`. Length must always match `gridLayout.length`. */
  gridSlots: GridSlotState[]
  /** Photo-grid mode: which slot the customer last interacted with. */
  selectedGridSlotIndex: number | null

  setLayoutMode: (mode: PhotoLayoutMode) => void
  setWord: (word: string) => void
  setWordWidth: (width: number) => void
  setWordPosition: (updates: Partial<{ x: number; y: number }>) => void
  setOrientation: (orientation: PosterOrientation) => void
  setSlotPhoto: (index: number, photo: SlotPhoto | null) => void
  updateSlotCrop: (
    index: number,
    updates: Partial<Pick<SlotPhoto, 'cropX' | 'cropY' | 'scale'>>,
  ) => void
  setSlotColor: (index: number, color: string | null) => void
  setDefaultSlotColor: (color: string) => void
  setSelectedSlotIndex: (index: number | null) => void

  setSinglePhoto: (photo: SinglePhotoState | null) => void
  updateSinglePhotoCrop: (
    updates: Partial<Pick<SinglePhotoState, 'cropX' | 'cropY' | 'scale' | 'filter'>>,
  ) => void
  setSinglePhotoMaskKey: (mask: PhotoMaskKey) => void

  /** Replace the current grid layout (admin-side editor + preset apply).
   *  Reconciles `gridSlots` so each layout id has a corresponding state
   *  entry — existing entries are kept by id, new ids get an empty slot. */
  setGridLayout: (slots: GridSlotDefinition[]) => void
  setGridSlotPhoto: (index: number, photo: SlotPhoto | null) => void
  updateGridSlotCrop: (
    index: number,
    updates: Partial<Pick<SlotPhoto, 'cropX' | 'cropY' | 'scale'>>,
  ) => void
  setGridSlotColor: (index: number, color: string | null) => void
  setSelectedGridSlotIndex: (index: number | null) => void

  resetPhotoEditor: () => void
}

function buildSlotsFromWord(word: string, prev: LetterSlot[]): LetterSlot[] {
  return Array.from(word, (char, i) => {
    const old = prev[i]
    if (old && old.char === char) return old
    return { char, photo: null, color: null }
  })
}

const INITIAL_SLOTS = buildSlotsFromWord(LETTER_MASK_DEFAULT_WORD, [])

const DEFAULT_WORD_X = 0.5
const DEFAULT_WORD_Y = 0.12

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value))
}

const DEFAULT_SINGLE_PHOTO_MASK: PhotoMaskKey = 'full'

/**
 * Reconcile a list of grid slot states against a fresh layout. Slots that
 * keep their id retain their photo / color; slots whose id disappears get
 * dropped; new ids get an empty `{ photo: null, color: null }` entry.
 */
function reconcileGridSlots(
  layout: GridSlotDefinition[],
  prev: GridSlotState[],
): GridSlotState[] {
  const byId = new Map(prev.map((s) => [s.id, s]))
  return layout.map(
    (def) => byId.get(def.id) ?? { id: def.id, photo: null, color: null },
  )
}

const INITIAL_GRID_LAYOUT: GridSlotDefinition[] = DEFAULT_GRID_LAYOUT.slots.map((s) => ({ ...s }))
const INITIAL_GRID_SLOTS: GridSlotState[] = INITIAL_GRID_LAYOUT.map((s) => ({
  id: s.id,
  photo: null,
  color: null,
}))

export const usePhotoEditorStore = create<PhotoEditorStore>((set) => ({
  layoutMode: 'letter-mask',
  word: LETTER_MASK_DEFAULT_WORD,
  wordWidth: LETTER_MASK_DEFAULT_WORD_WIDTH,
  wordX: DEFAULT_WORD_X,
  wordY: DEFAULT_WORD_Y,
  orientation: 'portrait',
  maskFontKey: 'anton',
  slots: INITIAL_SLOTS,
  defaultSlotColor: LETTER_MASK_DEFAULT_SLOT_COLOR,
  selectedSlotIndex: null,
  singlePhoto: null,
  singlePhotoMaskKey: DEFAULT_SINGLE_PHOTO_MASK,
  gridLayout: INITIAL_GRID_LAYOUT,
  gridSlots: INITIAL_GRID_SLOTS,
  selectedGridSlotIndex: null,

  setLayoutMode: (mode) => set({ layoutMode: mode }),

  setWord: (word) =>
    set((s) => ({
      word,
      slots: buildSlotsFromWord(word, s.slots),
      selectedSlotIndex:
        s.selectedSlotIndex !== null && s.selectedSlotIndex < word.length
          ? s.selectedSlotIndex
          : null,
    })),

  setWordWidth: (width) => set({ wordWidth: width }),

  setWordPosition: (updates) =>
    set((s) => ({
      wordX: updates.x !== undefined ? clamp01(updates.x) : s.wordX,
      wordY: updates.y !== undefined ? clamp01(updates.y) : s.wordY,
    })),

  setOrientation: (orientation) => set({ orientation }),

  setSlotPhoto: (index, photo) =>
    set((s) => ({
      slots: s.slots.map((slot, i) => (i === index ? { ...slot, photo } : slot)),
    })),

  updateSlotCrop: (index, updates) =>
    set((s) => ({
      slots: s.slots.map((slot, i) => {
        if (i !== index || !slot.photo) return slot
        return { ...slot, photo: { ...slot.photo, ...updates } }
      }),
    })),

  setSlotColor: (index, color) =>
    set((s) => ({
      slots: s.slots.map((slot, i) => (i === index ? { ...slot, color } : slot)),
    })),

  setDefaultSlotColor: (color) => set({ defaultSlotColor: color }),

  setSelectedSlotIndex: (index) => set({ selectedSlotIndex: index }),

  setSinglePhoto: (photo) =>
    set({
      singlePhoto: photo,
    }),

  updateSinglePhotoCrop: (updates) =>
    set((s) => {
      if (!s.singlePhoto) return {}
      return { singlePhoto: { ...s.singlePhoto, ...updates } }
    }),

  setSinglePhotoMaskKey: (mask) => set({ singlePhotoMaskKey: mask }),

  setGridLayout: (slots) =>
    set((s) => ({
      gridLayout: slots,
      gridSlots: reconcileGridSlots(slots, s.gridSlots),
      selectedGridSlotIndex:
        s.selectedGridSlotIndex !== null && s.selectedGridSlotIndex < slots.length
          ? s.selectedGridSlotIndex
          : null,
    })),

  setGridSlotPhoto: (index, photo) =>
    set((s) => ({
      gridSlots: s.gridSlots.map((slot, i) => (i === index ? { ...slot, photo } : slot)),
    })),

  updateGridSlotCrop: (index, updates) =>
    set((s) => ({
      gridSlots: s.gridSlots.map((slot, i) => {
        if (i !== index || !slot.photo) return slot
        return { ...slot, photo: { ...slot.photo, ...updates } }
      }),
    })),

  setGridSlotColor: (index, color) =>
    set((s) => ({
      gridSlots: s.gridSlots.map((slot, i) => (i === index ? { ...slot, color } : slot)),
    })),

  setSelectedGridSlotIndex: (index) => set({ selectedGridSlotIndex: index }),

  resetPhotoEditor: () =>
    set({
      layoutMode: 'letter-mask',
      word: LETTER_MASK_DEFAULT_WORD,
      wordWidth: LETTER_MASK_DEFAULT_WORD_WIDTH,
      wordX: DEFAULT_WORD_X,
      wordY: DEFAULT_WORD_Y,
      orientation: 'portrait',
      maskFontKey: 'anton',
      slots: buildSlotsFromWord(LETTER_MASK_DEFAULT_WORD, []),
      defaultSlotColor: LETTER_MASK_DEFAULT_SLOT_COLOR,
      selectedSlotIndex: null,
      singlePhoto: null,
      singlePhotoMaskKey: DEFAULT_SINGLE_PHOTO_MASK,
      gridLayout: DEFAULT_GRID_LAYOUT.slots.map((s) => ({ ...s })),
      gridSlots: DEFAULT_GRID_LAYOUT.slots.map((s) => ({
        id: s.id,
        photo: null,
        color: null,
      })),
      selectedGridSlotIndex: null,
    }),
}))
