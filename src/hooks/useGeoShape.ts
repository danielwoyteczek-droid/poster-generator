/**
 * PROJ-51 follow-up: holds the geo-boundary's projected `ShapeDefinition`.
 *
 * Kept in its own tiny store (not the editor store) because it updates on
 * every map move — only PosterCanvas needs to react, so an isolated store
 * avoids re-rendering the whole editor on each pan frame.
 */
import { create } from 'zustand'
import type { ShapeDefinition } from '@/lib/mask-composer'

interface GeoShapeStore {
  /** Current projected shape for the active geo-boundary, or null. */
  shape: ShapeDefinition | null
  setShape: (shape: ShapeDefinition | null) => void
}

export const useGeoShape = create<GeoShapeStore>((set) => ({
  shape: null,
  setShape: (shape) => set({ shape }),
}))
