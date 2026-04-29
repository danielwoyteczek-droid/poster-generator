import { create } from 'zustand'
import type { MapMaskKey } from '@/lib/map-masks'
import type { PrintFormat, PosterOrientation } from '@/lib/print-formats'
import { DEFAULT_SHAPE_CONFIG, type ShapeConfigState } from '@/lib/mask-composer'
import type { PhotoMaskKey } from '@/lib/photo-masks'
import type { MapPaletteColors } from '@/lib/map-palettes'

export type { MapMaskKey, PrintFormat, PosterOrientation, ShapeConfigState }

export type PhotoFilter = 'none' | 'grayscale' | 'sepia'

/**
 * Poster layouts split the canvas into a map area + optional text area.
 * 'full'    — map fills the whole poster, text blocks float on top.
 * 'text-30' — map takes the upper 70%, bottom 30% reserved for text.
 * 'text-15' — map takes the upper 85%, bottom 15% reserved for text.
 */
export type PosterLayoutId = 'full' | 'text-30' | 'text-15'

export const LAYOUT_MAP_HEIGHT: Record<PosterLayoutId, number> = {
  full: 1.0,
  'text-30': 0.7,
  'text-15': 0.85,
}

/**
 * A photo that occupies the "opposite" half of a split map mask.
 * When a split mask is active on the primary map, exactly one of
 * secondMap.enabled or splitPhoto is active at a time.
 */
export interface SplitPhoto {
  storagePath: string
  publicUrl: string
  width: number
  height: number
  filter: PhotoFilter
  /** -0.5 to 0.5: how far to shift the image inside the mask */
  cropX: number
  cropY: number
  /** 1.0 to 4.0: scale factor inside the mask, >1 zooms in */
  cropScale: number
  uploadedAt: string
}

export interface PhotoItem {
  id: string
  storagePath: string
  publicUrl: string
  width: number
  height: number
  maskKey: PhotoMaskKey
  /** 0-1 fractions within the poster */
  x: number
  y: number
  scale: number  // 0-1 fraction of poster width
  /** Crop offset inside the mask: -0.5..0.5 range */
  cropX: number
  cropY: number
  filter: PhotoFilter
  uploadedAt: string
}

export interface ViewState {
  lng: number
  lat: number
  zoom: number
  viewportWidth: number
  viewportHeight: number
  bounds: {
    west: number
    south: number
    east: number
    north: number
  }
}

export interface MarkerState {
  enabled: boolean
  type: 'classic' | 'heart'
  color: string
  /** Explicit pin position. When null, pin follows the map center. */
  lat?: number | null
  lng?: number | null
}

interface PendingCenter {
  lng: number
  lat: number
  zoom: number
}

export interface SecondMapState {
  enabled: boolean
  styleId: string
  paletteId: string
  customPaletteBase: string | null
  customPalette: MapPaletteColors | null
  viewState: ViewState
  pendingCenter: PendingCenter | null
  pendingZoomDelta: number | null
}

export interface TextBlock {
  id: string
  text: string
  x: number        // 0-1, fraction of poster width
  y: number        // 0-1, fraction of poster height
  width: number    // 0-1, fraction of poster width
  fontFamily: string
  fontSize: number // px at preview size
  color: string
  align: 'left' | 'center' | 'right'
  bold: boolean
  uppercase: boolean
  locked: boolean
  isCoordinates: boolean
  label?: string
}

export interface EditorStore {
  viewState: ViewState
  pendingCenter: PendingCenter | null
  pendingZoomDelta: number | null
  styleId: string
  paletteId: string
  customPaletteBase: string | null
  customPalette: MapPaletteColors | null
  streetLabelsVisible: boolean
  /** When true, the poster background follows the active palette's
   *  `background` colour (so the area outside the shape blends with the
   *  map's land colour). When false, the poster bg stays white. */
  posterDarkMode: boolean
  maskKey: MapMaskKey
  printFormat: PrintFormat
  orientation: PosterOrientation
  marker: MarkerState
  secondMap: SecondMapState
  secondMarker: MarkerState
  shapeConfig: ShapeConfigState
  layoutId: PosterLayoutId
  innerMarginMm: number
  locationName: string
  textBlocks: TextBlock[]
  selectedBlockId: string | null
  projectId: string | null
  /**
   * Set when an admin loads an existing preset via "Bearbeiten" in the Admin
   * list. Lets SaveAsPresetButton offer "update existing" alongside "save as
   * new". Cleared on successful save or when the admin starts a fresh design.
   */
  editingPreset: {
    id: string
    name: string
    description: string | null
    posterType: 'map' | 'star-map'
  } | null
  photos: PhotoItem[]
  splitMode: 'none' | 'second-map' | 'photo'
  splitPhoto: SplitPhoto | null
  splitPhotoZone: number

  setViewState: (vs: ViewState) => void
  flyToLocation: (lng: number, lat: number, zoom?: number) => void
  clearPendingCenter: () => void
  zoomIn: () => void
  zoomOut: () => void
  clearZoomDelta: () => void
  setStyleId: (id: string) => void
  setPaletteId: (id: string) => void
  setCustomPaletteBase: (hex: string | null) => void
  setCustomPalette: (colors: MapPaletteColors | null) => void
  updateCustomPaletteColor: (key: keyof MapPaletteColors, hex: string) => void
  setStreetLabelsVisible: (visible: boolean) => void
  setPosterDarkMode: (value: boolean) => void
  setMaskKey: (key: MapMaskKey) => void
  setPrintFormat: (format: PrintFormat) => void
  setOrientation: (orientation: PosterOrientation) => void
  setMarker: (updates: Partial<MarkerState>) => void
  setSecondMarker: (updates: Partial<MarkerState>) => void
  setShapeConfig: (updates: Partial<ShapeConfigState>) => void
  setShapeOuter: (updates: Partial<ShapeConfigState['outer']>) => void
  setInnerFrame: (updates: Partial<ShapeConfigState['innerFrame']>) => void
  setOuterFrame: (updates: Partial<ShapeConfigState['outerFrame']>) => void
  setLayoutId: (id: PosterLayoutId) => void
  setInnerMarginMm: (mm: number) => void

  setSecondMapEnabled: (enabled: boolean) => void
  setSecondMapStyleId: (id: string) => void
  setSecondMapPaletteId: (id: string) => void
  setSecondMapCustomPaletteBase: (hex: string | null) => void
  setSecondMapCustomPalette: (colors: MapPaletteColors | null) => void
  updateSecondMapCustomPaletteColor: (key: keyof MapPaletteColors, hex: string) => void
  flyToSecondLocation: (lng: number, lat: number, zoom?: number) => void
  clearSecondPendingCenter: () => void
  zoomInSecond: () => void
  zoomOutSecond: () => void
  clearSecondZoomDelta: () => void
  setSecondMapViewState: (vs: ViewState) => void

  setLocationName: (name: string) => void
  addTextBlock: () => void
  updateTextBlock: (id: string, updates: Partial<TextBlock>) => void
  deleteTextBlock: (id: string) => void
  setSelectedBlockId: (id: string | null) => void
  setProjectId: (id: string | null) => void
  setEditingPreset: (preset: EditorStore['editingPreset']) => void
  addPhoto: (photo: Omit<PhotoItem, 'id' | 'uploadedAt'>) => void
  updatePhoto: (id: string, updates: Partial<PhotoItem>) => void
  removePhoto: (id: string) => void
  setSplitMode: (mode: 'none' | 'second-map' | 'photo') => void
  setSplitPhoto: (photo: SplitPhoto | null) => void
  updateSplitPhoto: (updates: Partial<SplitPhoto>) => void
  setSplitPhotoZone: (zone: number) => void
  loadFromConfig: (config: Partial<EditorConfig>) => void
}

export interface EditorConfig {
  viewState: ViewState
  styleId: string
  paletteId: string
  customPaletteBase: string | null
  customPalette: MapPaletteColors | null
  streetLabelsVisible: boolean
  posterDarkMode: boolean
  maskKey: MapMaskKey
  printFormat: PrintFormat
  orientation: PosterOrientation
  marker: MarkerState
  secondMarker: MarkerState
  secondMap: Pick<SecondMapState, 'enabled' | 'styleId' | 'paletteId' | 'customPaletteBase' | 'customPalette' | 'viewState'>
  shapeConfig: ShapeConfigState
  layoutId: PosterLayoutId
  innerMarginMm: number
  textBlocks: TextBlock[]
  locationName: string
  photos: PhotoItem[]
  splitMode: 'none' | 'second-map' | 'photo'
  splitPhoto: SplitPhoto | null
  splitPhotoZone: number
}

const DEFAULT_VIEW: ViewState = {
  lng: 11.576124,
  lat: 48.137154,
  zoom: 12,
  viewportWidth: 0,
  viewportHeight: 0,
  bounds: { west: 0, south: 0, east: 0, north: 0 },
}

/**
 * Initial state for all data fields in the editor (no actions). Exported so
 * tools like the Admin "Editor zurücksetzen" button (PROJ-9) can restore it
 * without duplicating defaults.
 */
export const EDITOR_INITIAL_STATE = {
  viewState: DEFAULT_VIEW,
  pendingCenter: null,
  pendingZoomDelta: null,
  styleId: 'klassisch',
  paletteId: 'original',
  customPaletteBase: null,
  customPalette: null,
  streetLabelsVisible: false,
  posterDarkMode: false,
  maskKey: 'none',
  printFormat: 'a4' as const,
  orientation: 'portrait' as const,
  marker: { enabled: false, type: 'classic' as const, color: '#e63946' },
  secondMarker: { enabled: false, type: 'classic' as const, color: '#e63946' },
  shapeConfig: DEFAULT_SHAPE_CONFIG,
  layoutId: 'full' as const,
  innerMarginMm: 0,
  secondMap: {
    enabled: false,
    styleId: 'klassisch',
    paletteId: 'original',
    customPaletteBase: null,
    customPalette: null,
    viewState: DEFAULT_VIEW,
    pendingCenter: null,
    pendingZoomDelta: null,
  },
  textBlocks: [
    {
      id: 'block-title',
      text: 'Dein Moment',
      x: 0.1, y: 0.75, width: 0.8,
      fontFamily: 'Amsterdam',
      fontSize: 32, color: '#000000',
      align: 'center' as const, bold: false, uppercase: false,
      locked: false, isCoordinates: false,
    },
    {
      id: 'block-subtitle',
      text: 'Emma & Leo',
      x: 0.1, y: 0.87, width: 0.8,
      fontFamily: 'CaviarDreams',
      fontSize: 13, color: '#555555',
      align: 'center' as const, bold: false, uppercase: true,
      locked: false, isCoordinates: false, label: 'Name',
    },
    {
      id: 'block-coords',
      text: '',
      x: 0.1, y: 0.91, width: 0.8,
      fontFamily: 'CaviarDreams',
      fontSize: 11, color: '#888888',
      align: 'center' as const, bold: false, uppercase: false,
      locked: false, isCoordinates: true, label: 'Ort & Koordinaten',
    },
  ],
  locationName: 'München',
  selectedBlockId: null,
  projectId: null,
  editingPreset: null,
  photos: [],
  splitMode: 'none' as const,
  splitPhoto: null,
  splitPhotoZone: 1,
}

export const useEditorStore = create<EditorStore>((set) => ({
  ...EDITOR_INITIAL_STATE,

  setViewState: (viewState) => set({ viewState }),
  flyToLocation: (lng, lat, zoom = 13) =>
    // Reset pin to map-center when the user picks a new location
    set((s) => ({ pendingCenter: { lng, lat, zoom }, marker: { ...s.marker, lat: null, lng: null } })),
  clearPendingCenter: () => set({ pendingCenter: null }),
  zoomIn: () => set({ pendingZoomDelta: 1 }),
  zoomOut: () => set({ pendingZoomDelta: -1 }),
  clearZoomDelta: () => set({ pendingZoomDelta: null }),
  setStyleId: (styleId) => set({ styleId }),
  setPaletteId: (paletteId) => set({ paletteId }),
  setCustomPaletteBase: (customPaletteBase) => set({ customPaletteBase }),
  setCustomPalette: (customPalette) => set({ customPalette }),
  updateCustomPaletteColor: (key, hex) =>
    set((s) => ({
      customPalette: { ...(s.customPalette ?? ({} as MapPaletteColors)), [key]: hex },
    })),
  setStreetLabelsVisible: (streetLabelsVisible) => set({ streetLabelsVisible }),
  setPosterDarkMode: (posterDarkMode) => set({ posterDarkMode }),
  setMaskKey: (maskKey) => set({ maskKey }),
  setPrintFormat: (printFormat) => set({ printFormat }),
  setOrientation: (orientation) => set({ orientation }),
  setMarker: (updates) => set((s) => ({ marker: { ...s.marker, ...updates } })),
  setSecondMarker: (updates) => set((s) => ({ secondMarker: { ...s.secondMarker, ...updates } })),
  setShapeConfig: (updates) => set((s) => ({ shapeConfig: { ...s.shapeConfig, ...updates } })),
  setShapeOuter: (updates) => set((s) => ({ shapeConfig: { ...s.shapeConfig, outer: { ...s.shapeConfig.outer, ...updates } } })),
  setInnerFrame: (updates) => set((s) => ({ shapeConfig: { ...s.shapeConfig, innerFrame: { ...s.shapeConfig.innerFrame, ...updates } } })),
  setOuterFrame: (updates) => set((s) => ({ shapeConfig: { ...s.shapeConfig, outerFrame: { ...s.shapeConfig.outerFrame, ...updates } } })),
  setLayoutId: (id) => set((s) => {
    // Layout is top-level. Changing it resets Formkontur (innerMarginMm) and
    // the decorative Rand so the new layout's visual change is immediately
    // obvious instead of being masked by leftover decorations.
    const resetInnerFrame = { ...s.shapeConfig.innerFrame, enabled: false }
    const resetShapeConfig = { ...s.shapeConfig, innerFrame: resetInnerFrame }

    // Reposition text blocks that sit above the new text area so they don't
    // get clipped off-canvas. Keeps all typed text intact; only y changes.
    // Leave a 5 % bottom buffer so repositioned blocks don't overshoot the
    // poster edge once their own height is added.
    const textAreaStart = LAYOUT_MAP_HEIGHT[id]
    const textAreaEnd = 0.95
    if (textAreaStart >= textAreaEnd) {
      return { layoutId: id, innerMarginMm: 0, shapeConfig: resetShapeConfig }
    }
    const outsideCount = s.textBlocks.filter((b) => b.y < textAreaStart).length
    const gap = (textAreaEnd - textAreaStart) / (outsideCount + 1)
    let placed = 0
    const textBlocks = s.textBlocks.map((b) => {
      if (b.y >= textAreaStart) return b
      placed += 1
      return { ...b, y: textAreaStart + gap * placed }
    })
    return { layoutId: id, innerMarginMm: 0, shapeConfig: resetShapeConfig, textBlocks }
  }),
  setInnerMarginMm: (mm) => set({ innerMarginMm: Math.max(0, Math.min(10, mm)) }),

  setSecondMapEnabled: (enabled) => set((s) => ({ secondMap: { ...s.secondMap, enabled } })),
  setSecondMapStyleId: (id) => set((s) => ({ secondMap: { ...s.secondMap, styleId: id } })),
  setSecondMapPaletteId: (id) => set((s) => ({ secondMap: { ...s.secondMap, paletteId: id } })),
  setSecondMapCustomPaletteBase: (hex) => set((s) => ({ secondMap: { ...s.secondMap, customPaletteBase: hex } })),
  setSecondMapCustomPalette: (colors) => set((s) => ({ secondMap: { ...s.secondMap, customPalette: colors } })),
  updateSecondMapCustomPaletteColor: (key, hex) =>
    set((s) => ({
      secondMap: {
        ...s.secondMap,
        customPalette: { ...(s.secondMap.customPalette ?? ({} as MapPaletteColors)), [key]: hex },
      },
    })),
  flyToSecondLocation: (lng, lat, zoom = 13) =>
    set((s) => ({ secondMap: { ...s.secondMap, pendingCenter: { lng, lat, zoom } } })),
  clearSecondPendingCenter: () => set((s) => ({ secondMap: { ...s.secondMap, pendingCenter: null } })),
  zoomInSecond: () => set((s) => ({ secondMap: { ...s.secondMap, pendingZoomDelta: 1 } })),
  zoomOutSecond: () => set((s) => ({ secondMap: { ...s.secondMap, pendingZoomDelta: -1 } })),
  clearSecondZoomDelta: () => set((s) => ({ secondMap: { ...s.secondMap, pendingZoomDelta: null } })),
  setSecondMapViewState: (vs) => set((s) => ({ secondMap: { ...s.secondMap, viewState: vs } })),

  addTextBlock: () => {
    const id = `block-${Date.now()}`
    set((s) => ({
      textBlocks: [...s.textBlocks, {
        id, text: 'Neuer Text',
        x: 0.1, y: 0.5, width: 0.8,
        fontFamily: 'CaviarDreams',
        fontSize: 16, color: '#000000',
        align: 'center', bold: false, uppercase: false,
        locked: false, isCoordinates: false,
      }],
      selectedBlockId: id,
    }))
  },
  updateTextBlock: (id, updates) => set((s) => ({
    textBlocks: s.textBlocks.map(b => b.id === id ? { ...b, ...updates } : b),
  })),
  deleteTextBlock: (id) => set((s) => ({
    textBlocks: s.textBlocks.filter(b => b.id !== id),
    selectedBlockId: s.selectedBlockId === id ? null : s.selectedBlockId,
  })),
  setLocationName: (name) => set({ locationName: name }),
  setSelectedBlockId: (id) => set({ selectedBlockId: id }),
  setProjectId: (id) => set({ projectId: id }),
  setEditingPreset: (preset) => set({ editingPreset: preset }),
  addPhoto: (photo) =>
    set((s) => ({
      photos: [
        ...s.photos,
        { ...photo, id: crypto.randomUUID(), uploadedAt: new Date().toISOString() },
      ],
    })),
  updatePhoto: (id, updates) =>
    set((s) => ({
      photos: s.photos.map((p) => (p.id === id ? { ...p, ...updates } : p)),
    })),
  removePhoto: (id) =>
    set((s) => ({
      photos: s.photos.filter((p) => p.id !== id),
    })),
  setSplitMode: (splitMode) =>
    set((s) => ({
      splitMode,
      secondMap: { ...s.secondMap, enabled: splitMode === 'second-map' },
      // Keep the uploaded split photo around so switching modes doesn't
      // force the user to re-upload. It just becomes inactive.
    })),
  setSplitPhoto: (photo) => set({ splitPhoto: photo }),
  updateSplitPhoto: (updates) =>
    set((s) => ({ splitPhoto: s.splitPhoto ? { ...s.splitPhoto, ...updates } : null })),
  setSplitPhotoZone: (splitPhotoZone) => set({ splitPhotoZone }),
  loadFromConfig: (config) => set((s) => ({
    viewState: config.viewState ?? s.viewState,
    styleId: config.styleId ?? s.styleId,
    paletteId: config.paletteId ?? s.paletteId,
    customPaletteBase: config.customPaletteBase ?? s.customPaletteBase,
    customPalette: config.customPalette ?? s.customPalette,
    streetLabelsVisible: config.streetLabelsVisible ?? s.streetLabelsVisible,
    posterDarkMode: config.posterDarkMode ?? s.posterDarkMode,
    maskKey: config.maskKey ?? s.maskKey,
    printFormat: config.printFormat ?? s.printFormat,
    orientation: config.orientation ?? s.orientation,
    marker: config.marker ?? s.marker,
    secondMarker: config.secondMarker ?? s.secondMarker,
    shapeConfig: config.shapeConfig ?? s.shapeConfig,
    layoutId: config.layoutId ?? s.layoutId,
    innerMarginMm: config.innerMarginMm ?? s.innerMarginMm,
    secondMap: config.secondMap
      ? { ...s.secondMap, ...config.secondMap, pendingCenter: null, pendingZoomDelta: null }
      : s.secondMap,
    textBlocks: config.textBlocks ?? s.textBlocks,
    locationName: config.locationName ?? s.locationName,
    photos: config.photos ?? s.photos,
    splitMode: config.splitMode ?? s.splitMode,
    splitPhoto: config.splitPhoto ?? s.splitPhoto,
    splitPhotoZone: config.splitPhotoZone ?? s.splitPhotoZone,
    pendingCenter: config.viewState
      ? { lng: config.viewState.lng, lat: config.viewState.lat, zoom: config.viewState.zoom }
      : s.pendingCenter,
  })),
}))
