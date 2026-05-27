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
    /** Outward offset of the stroke in mm. 0 = stroke sits exactly on the
     *  circle edge (legacy behaviour). > 0 = stroke is drawn at radius +
     *  offset, leaving a transparent ring between circle and frame. Only
     *  applies to the default circle silhouette — custom masks (PROJ-40)
     *  ignore this so a complex outline doesn't need a parallel offset path. */
    offset: number // mm
  }
  /** Stroke around the poster rectangle (uses outer.margin for positioning) */
  outerFrame: {
    enabled: boolean
    color: string
    thickness: number // mm
    style: 'single' | 'double'
    gap: number    // mm between double lines
  }
  /** Single horizontal decoration line — admin-only tool for divider/accent
   *  lines between the circle and the title block, or under the coords. */
  decoLine: {
    enabled: boolean
    /** Vertical position as fraction of poster height (0 = top, 1 = bottom). */
    y: number
    /** Line length in mm, drawn centred horizontally. */
    lengthMm: number
    /** Stroke thickness in mm. */
    thicknessMm: number
    color: string
  }
  /** Second independent horizontal decoration line — same shape as decoLine,
   *  fully independent position/length/thickness/color. Optional so old
   *  serialised state without this field still parses. */
  decoLine2?: {
    enabled: boolean
    y: number
    lengthMm: number
    thicknessMm: number
    color: string
  }
}

export const DEFAULT_STAR_FRAME_CONFIG: StarMapFrameConfig = {
  outer: { mode: 'none', opacity: 0.3, margin: 10 },
  innerFrame: { enabled: false, color: '#1a1a1a', thickness: 0.7, offset: 3 },
  outerFrame: { enabled: false, color: '#1a1a1a', thickness: 0.7, style: 'single', gap: 1.5 },
  decoLine: { enabled: false, y: 0.62, lengthMm: 60, thicknessMm: 0.5, color: '#1a1a1a' },
  decoLine2: { enabled: false, y: 0.72, lengthMm: 60, thicknessMm: 0.5, color: '#1a1a1a' },
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
  /**
   * Optional narrow-down filter for the twelve zodiac constellations.
   * `null` means all twelve zodiacs are visible alongside the other
   * 77 IAU constellations — the customer-facing default. An explicit
   * array narrows the visible zodiacs to the listed IAU codes. Empty
   * array hides all zodiacs but the other constellations still draw.
   */
  visibleZodiacIds: string[] | null
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
  /** PROJ-40: silhouette mask applied to the sky layer. `'circle'` = no
   *  custom clipping (today's behaviour). Built-in keys (`heart-single`,
   *  `house`, `frame1`) and custom-mask keys (`custom-...`) reshape the
   *  visible sky area to that silhouette. The renderer applies the mask
   *  via `globalCompositeOperation = 'destination-in'` after the sky is
   *  drawn — see star-map-renderer.ts. */
  maskKey: string
  frameConfig: StarMapFrameConfig
  previewWidth: number
  previewHeight: number

  setLocation: (lat: number, lng: number, name: string) => void
  setDatetime: (dt: string) => void
  setPosterBgColor: (color: string) => void
  setSkyBgColor: (color: string) => void
  setStarColor: (color: string) => void
  setShowConstellations: (show: boolean) => void
  setVisibleZodiacIds: (ids: string[] | null) => void
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
  setMaskKey: (key: string) => void
  setOuter: (updates: Partial<StarMapFrameConfig['outer']>) => void
  setInnerFrame: (updates: Partial<StarMapFrameConfig['innerFrame']>) => void
  setOuterFrame: (updates: Partial<StarMapFrameConfig['outerFrame']>) => void
  setDecoLine: (updates: Partial<StarMapFrameConfig['decoLine']>) => void
  setDecoLine2: (updates: Partial<NonNullable<StarMapFrameConfig['decoLine2']>>) => void
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
    visibleZodiacIds: null,
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
    maskKey: 'circle',
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
  setVisibleZodiacIds: (visibleZodiacIds) => set({ visibleZodiacIds }),
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
  setMaskKey: (maskKey) => set({ maskKey }),
  setOuter: (updates) => set((s) => ({ frameConfig: { ...s.frameConfig, outer: { ...s.frameConfig.outer, ...updates } } })),
  setInnerFrame: (updates) => set((s) => ({ frameConfig: { ...s.frameConfig, innerFrame: { ...s.frameConfig.innerFrame, ...updates } } })),
  setOuterFrame: (updates) => set((s) => ({ frameConfig: { ...s.frameConfig, outerFrame: { ...s.frameConfig.outerFrame, ...updates } } })),
  setDecoLine: (updates) => set((s) => ({ frameConfig: { ...s.frameConfig, decoLine: { ...s.frameConfig.decoLine, ...updates } } })),
  setDecoLine2: (updates) => set((s) => ({ frameConfig: { ...s.frameConfig, decoLine2: { ...(s.frameConfig.decoLine2 ?? { enabled: false, y: 0.72, lengthMm: 60, thicknessMm: 0.5, color: '#1a1a1a' }), ...updates } } })),
  setPreviewSize: (previewWidth, previewHeight) => set({ previewWidth, previewHeight }),
}))
