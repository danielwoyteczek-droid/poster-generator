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
  setOuter: (updates) => set((s) => ({ frameConfig: { ...s.frameConfig, outer: { ...s.frameConfig.outer, ...updates } } })),
  setInnerFrame: (updates) => set((s) => ({ frameConfig: { ...s.frameConfig, innerFrame: { ...s.frameConfig.innerFrame, ...updates } } })),
  setOuterFrame: (updates) => set((s) => ({ frameConfig: { ...s.frameConfig, outerFrame: { ...s.frameConfig.outerFrame, ...updates } } })),
  setPreviewSize: (previewWidth, previewHeight) => set({ previewWidth, previewHeight }),
}))
