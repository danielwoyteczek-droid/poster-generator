import { create } from 'zustand'

function toDatetimeLocal(date: Date): string {
  const p = (n: number) => n.toString().padStart(2, '0')
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}T${p(date.getHours())}:${p(date.getMinutes())}`
}

export interface StarMapFrameConfig {
  /** Backdrop zone around the sky circle (faded sky gradient in a rectangle) */
  outer: {
    mode: 'none' | 'opacity' | 'full'
    opacity: number // 0..1
    margin: number  // mm from poster edge
  }
  /** Stroke around the sky circle */
  innerFrame: {
    enabled: boolean
    color: string
    thickness: number // mm
  }
  /** Stroke around the poster rectangle (uses outer.margin for positioning) */
  outerFrame: {
    enabled: boolean
    color: string
    thickness: number // mm
    style: 'single' | 'double'
    gap: number    // mm between double lines
  }
}

export const DEFAULT_STAR_FRAME_CONFIG: StarMapFrameConfig = {
  outer: { mode: 'none', opacity: 0.3, margin: 10 },
  innerFrame: { enabled: false, color: '#ffffff', thickness: 0.7 },
  outerFrame: { enabled: false, color: '#1a1a1a', thickness: 0.7, style: 'single', gap: 1.5 },
}

interface StarMapStore {
  lat: number
  lng: number
  locationName: string
  datetime: string
  posterBgColor: string
  skyBgColor: string
  starColor: string
  showConstellations: boolean
  showMilkyWay: boolean
  showSun: boolean
  showMoon: boolean
  showPlanets: boolean
  showCompass: boolean
  showGrid: boolean
  /** Opacity of the celestial coordinate grid lines, 0.05..1.0. Only matters
   *  when showGrid is true. Stored separately so users can dial in the look. */
  gridOpacity: number
  /** How many stars to plot, 0.05..1.0. Maps to a magnitude cutoff: 1.0 plots
   *  all ~9000 stars in the catalogue (mag ≤ 7.5), 0.05 keeps only the
   *  brightest ~50 (mag ≤ 3.7). 0.7 ≈ naked-eye limit. Lower values let the
   *  constellations / coordinate grid breathe. */
  starDensity: number
  /** Painted/watercolor sky texture (key from `STAR_TEXTURES` manifest, or
   *  `null` for solid sky-color). Customer-facing under "Farben" in the
   *  Star-Map editor. */
  textureKey: string | null
  /** Opacity of the sky texture, 0.3..1.0. Only matters when textureKey !== null. */
  textureOpacity: number
  frameConfig: StarMapFrameConfig
  previewWidth: number
  previewHeight: number

  setLocation: (lat: number, lng: number, name: string) => void
  setDatetime: (dt: string) => void
  setPosterBgColor: (color: string) => void
  setSkyBgColor: (color: string) => void
  setStarColor: (color: string) => void
  setShowConstellations: (show: boolean) => void
  setShowMilkyWay: (show: boolean) => void
  setShowSun: (show: boolean) => void
  setShowMoon: (show: boolean) => void
  setShowPlanets: (show: boolean) => void
  setShowCompass: (show: boolean) => void
  setShowGrid: (show: boolean) => void
  setGridOpacity: (opacity: number) => void
  setStarDensity: (density: number) => void
  setTextureKey: (key: string | null) => void
  setTextureOpacity: (opacity: number) => void
  setOuter: (updates: Partial<StarMapFrameConfig['outer']>) => void
  setInnerFrame: (updates: Partial<StarMapFrameConfig['innerFrame']>) => void
  setOuterFrame: (updates: Partial<StarMapFrameConfig['outerFrame']>) => void
  setPreviewSize: (width: number, height: number) => void
}

/**
 * Initial data state (no actions). Called as a function so `datetime` reflects
 * the current moment when the user resets — old date wouldn't make sense.
 * Used by the Admin "Editor zurücksetzen" tool (PROJ-9).
 */
export function getStarMapInitialState() {
  return {
    lat: 48.137154,
    lng: 11.576124,
    locationName: 'München',
    datetime: toDatetimeLocal(new Date()),
    posterBgColor: '#ffffff',
    skyBgColor: '#000000',
    starColor: '#ffffff',
    showConstellations: false,
    showMilkyWay: false,
    showSun: false,
    showMoon: false,
    showPlanets: false,
    showCompass: true,
    showGrid: false,
    gridOpacity: 0.32,
    starDensity: 0.7,
    textureKey: null,
    textureOpacity: 0.9,
    frameConfig: DEFAULT_STAR_FRAME_CONFIG,
    previewWidth: 500,
    previewHeight: 707,
  }
}

export const useStarMapStore = create<StarMapStore>((set) => ({
  ...getStarMapInitialState(),

  setLocation: (lat, lng, locationName) => set({ lat, lng, locationName }),
  setDatetime: (datetime) => set({ datetime }),
  setPosterBgColor: (posterBgColor) => set({ posterBgColor }),
  setSkyBgColor: (skyBgColor) => set({ skyBgColor }),
  setStarColor: (starColor) => set({ starColor }),
  setShowConstellations: (showConstellations) => set({ showConstellations }),
  setShowMilkyWay: (showMilkyWay) => set({ showMilkyWay }),
  setShowSun: (showSun) => set({ showSun }),
  setShowMoon: (showMoon) => set({ showMoon }),
  setShowPlanets: (showPlanets) => set({ showPlanets }),
  setShowCompass: (showCompass) => set({ showCompass }),
  setShowGrid: (showGrid) => set({ showGrid }),
  setGridOpacity: (gridOpacity) => set({ gridOpacity: Math.max(0.05, Math.min(1, gridOpacity)) }),
  setStarDensity: (starDensity) => set({ starDensity: Math.max(0.05, Math.min(1, starDensity)) }),
  setTextureKey: (textureKey) => set({ textureKey }),
  setTextureOpacity: (textureOpacity) => set({ textureOpacity: Math.max(0.3, Math.min(1, textureOpacity)) }),
  setOuter: (updates) => set((s) => ({ frameConfig: { ...s.frameConfig, outer: { ...s.frameConfig.outer, ...updates } } })),
  setInnerFrame: (updates) => set((s) => ({ frameConfig: { ...s.frameConfig, innerFrame: { ...s.frameConfig.innerFrame, ...updates } } })),
  setOuterFrame: (updates) => set((s) => ({ frameConfig: { ...s.frameConfig, outerFrame: { ...s.frameConfig.outerFrame, ...updates } } })),
  setPreviewSize: (previewWidth, previewHeight) => set({ previewWidth, previewHeight }),
}))
