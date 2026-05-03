/**
 * Grid-Layout (PROJ-32, photo-grid mode) — shared types + helpers for the
 * customer-side `PhotoGridOverlay` and the admin-side `GridLayoutDesigner`.
 *
 * A grid layout is an ordered list of slot rectangles laid out on the
 * poster surface. Each slot defines:
 *   • position (`x`, `y`) as fractions of the poster width / height
 *   • size (`width`, `height`) as fractions
 *   • a clipping shape (`mask`) — the photo inside the slot is clipped to
 *     this shape (rect = no shape clip, full rectangle bleed).
 *
 * The slot positions live inside `presets.config_json.gridLayout.slots`
 * and the customer cannot move them — only fill them with photos and pan
 * within the rectangle. Admin uses `GridLayoutDesigner` to author them.
 */

export type GridSlotMaskKey =
  | 'rect'
  | 'circle'
  | 'heart'
  | 'square'
  | 'portrait'
  | 'landscape'

export interface GridSlotDefinition {
  /** Stable ID across re-renders, e.g. `'slot-0'`. */
  id: string
  /** Left edge as fraction of poster width, 0..1. */
  x: number
  /** Top edge as fraction of poster height, 0..1. */
  y: number
  /** Width as fraction of poster width, 0..1. */
  width: number
  /** Height as fraction of poster height, 0..1. */
  height: number
  /** Shape used to clip the photo inside the rectangle. */
  mask: GridSlotMaskKey
}

export interface GridLayout {
  slots: GridSlotDefinition[]
}

export const GRID_MIN_SLOTS = 2
export const GRID_MAX_SLOTS = 6
export const GRID_SNAP_STEP = 0.05 // 5% of poster width/height

/**
 * Lookup table for the CSS clip-path applied to each slot. Mirrors the
 * shapes used by the single-photo mode (`PHOTO_MASKS`) so that visually
 * the same masks are available across both photo modes.
 */
export const GRID_SLOT_MASKS: Record<GridSlotMaskKey, { label: string; clipPath: string }> = {
  rect: {
    label: 'Rechteck',
    clipPath: 'inset(0)',
  },
  square: {
    label: 'Quadrat',
    clipPath: 'inset(0)',
  },
  circle: {
    label: 'Kreis',
    clipPath: 'circle(50% at 50% 50%)',
  },
  heart: {
    label: 'Herz',
    clipPath:
      "path('M50,88 C50,88 6,60 6,30 C6,15 18,4 32,4 C40,4 46,8 50,14 C54,8 60,4 68,4 C82,4 94,15 94,30 C94,60 50,88 50,88 Z')",
  },
  portrait: {
    label: 'Hochformat',
    clipPath: 'inset(0)',
  },
  landscape: {
    label: 'Querformat',
    clipPath: 'inset(0)',
  },
}

export const GRID_SLOT_MASK_OPTIONS = (Object.keys(GRID_SLOT_MASKS) as GridSlotMaskKey[]).map(
  (key) => ({ key, label: GRID_SLOT_MASKS[key].label }),
)

/** Clamp a fraction value into [0, 1]. */
export function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value))
}

/** Round a fraction to the nearest snap step (default 5 %). */
export function snapFraction(value: number, step: number = GRID_SNAP_STEP): number {
  return Math.round(value / step) * step
}

/**
 * Default starter layout when an admin first switches to photo-grid mode
 * — a clean 2×2 grid with a tiny gutter so the slots don't visually fuse.
 */
export const DEFAULT_GRID_LAYOUT: GridLayout = {
  slots: [
    { id: 'slot-0', x: 0.05, y: 0.05, width: 0.425, height: 0.425, mask: 'rect' },
    { id: 'slot-1', x: 0.525, y: 0.05, width: 0.425, height: 0.425, mask: 'rect' },
    { id: 'slot-2', x: 0.05, y: 0.525, width: 0.425, height: 0.425, mask: 'rect' },
    { id: 'slot-3', x: 0.525, y: 0.525, width: 0.425, height: 0.425, mask: 'rect' },
  ],
}

/** Generate a new stable slot ID that doesn't collide with the existing ones. */
export function nextSlotId(slots: GridSlotDefinition[]): string {
  const used = new Set(slots.map((s) => s.id))
  let n = slots.length
  // Step n upward until we find a free slot. Linear probe is fine — slot
  // count is capped at GRID_MAX_SLOTS so worst case is a few iterations.
  while (used.has(`slot-${n}`)) n += 1
  return `slot-${n}`
}
