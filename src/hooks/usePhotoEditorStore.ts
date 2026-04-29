import { create } from 'zustand'
import {
  LETTER_MASK_DEFAULT_WORD,
  LETTER_MASK_DEFAULT_SLOT_COLOR,
  LETTER_MASK_DEFAULT_WORD_WIDTH,
  type MaskFontKey,
} from '@/lib/letter-mask'
import type { PosterOrientation } from '@/lib/print-formats'

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

interface PhotoEditorStore {
  layoutMode: PhotoLayoutMode
  word: string
  /** Horizontal share of the poster width the word occupies, 0..1. Customer
   *  controls this via a slider — larger value = bigger letters. */
  wordWidth: number
  /** 'portrait' = paper standing tall (default for A4/A3 prints).
   *  'landscape' = paper lying on its side. The canvas flips its aspect
   *  ratio accordingly. */
  orientation: PosterOrientation
  maskFontKey: MaskFontKey
  slots: LetterSlot[]
  defaultSlotColor: string
  selectedSlotIndex: number | null

  setWord: (word: string) => void
  setWordWidth: (width: number) => void
  setOrientation: (orientation: PosterOrientation) => void
  setSlotPhoto: (index: number, photo: SlotPhoto | null) => void
  updateSlotCrop: (
    index: number,
    updates: Partial<Pick<SlotPhoto, 'cropX' | 'cropY' | 'scale'>>,
  ) => void
  setSlotColor: (index: number, color: string | null) => void
  setDefaultSlotColor: (color: string) => void
  setSelectedSlotIndex: (index: number | null) => void
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

export const usePhotoEditorStore = create<PhotoEditorStore>((set) => ({
  layoutMode: 'letter-mask',
  word: LETTER_MASK_DEFAULT_WORD,
  wordWidth: LETTER_MASK_DEFAULT_WORD_WIDTH,
  orientation: 'portrait',
  maskFontKey: 'anton',
  slots: INITIAL_SLOTS,
  defaultSlotColor: LETTER_MASK_DEFAULT_SLOT_COLOR,
  selectedSlotIndex: null,

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

  resetPhotoEditor: () =>
    set({
      layoutMode: 'letter-mask',
      word: LETTER_MASK_DEFAULT_WORD,
      wordWidth: LETTER_MASK_DEFAULT_WORD_WIDTH,
      orientation: 'portrait',
      maskFontKey: 'anton',
      slots: buildSlotsFromWord(LETTER_MASK_DEFAULT_WORD, []),
      defaultSlotColor: LETTER_MASK_DEFAULT_SLOT_COLOR,
      selectedSlotIndex: null,
    }),
}))
