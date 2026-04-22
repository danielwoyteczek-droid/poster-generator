import { create } from 'zustand'
import type { MapMaskKey } from '@/lib/map-masks'
import type { PrintFormat } from '@/lib/print-formats'
import { DEFAULT_SHAPE_CONFIG, type ShapeConfigState } from '@/lib/mask-composer'
import type { PhotoMaskKey } from '@/lib/photo-masks'

export type { MapMaskKey, PrintFormat, ShapeConfigState }

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
  streetLabelsVisible: boolean
  maskKey: MapMaskKey
  printFormat: PrintFormat
  marker: MarkerState
  secondMap: SecondMapState
  secondMarker: MarkerState
  shapeConfig: ShapeConfigState
  locationName: string
  textBlocks: TextBlock[]
  selectedBlockId: string | null
  projectId: string | null
  photos: PhotoItem[]

  setViewState: (vs: ViewState) => void
  flyToLocation: (lng: number, lat: number, zoom?: number) => void
  clearPendingCenter: () => void
  zoomIn: () => void
  zoomOut: () => void
  clearZoomDelta: () => void
  setStyleId: (id: string) => void
  setPaletteId: (id: string) => void
  setCustomPaletteBase: (hex: string | null) => void
  setStreetLabelsVisible: (visible: boolean) => void
  setMaskKey: (key: MapMaskKey) => void
  setPrintFormat: (format: PrintFormat) => void
  setMarker: (updates: Partial<MarkerState>) => void
  setSecondMarker: (updates: Partial<MarkerState>) => void
  setShapeConfig: (updates: Partial<ShapeConfigState>) => void
  setShapeOuter: (updates: Partial<ShapeConfigState['outer']>) => void
  setInnerFrame: (updates: Partial<ShapeConfigState['innerFrame']>) => void
  setOuterFrame: (updates: Partial<ShapeConfigState['outerFrame']>) => void

  setSecondMapEnabled: (enabled: boolean) => void
  setSecondMapStyleId: (id: string) => void
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
  addPhoto: (photo: Omit<PhotoItem, 'id' | 'uploadedAt'>) => void
  updatePhoto: (id: string, updates: Partial<PhotoItem>) => void
  removePhoto: (id: string) => void
  loadFromConfig: (config: Partial<EditorConfig>) => void
}

export interface EditorConfig {
  viewState: ViewState
  styleId: string
  paletteId: string
  customPaletteBase: string | null
  streetLabelsVisible: boolean
  maskKey: MapMaskKey
  printFormat: PrintFormat
  marker: MarkerState
  secondMarker: MarkerState
  secondMap: Pick<SecondMapState, 'enabled' | 'styleId' | 'viewState'>
  shapeConfig: ShapeConfigState
  textBlocks: TextBlock[]
  locationName: string
  photos: PhotoItem[]
}

const DEFAULT_VIEW: ViewState = {
  lng: 11.576124,
  lat: 48.137154,
  zoom: 12,
  viewportWidth: 0,
  viewportHeight: 0,
  bounds: { west: 0, south: 0, east: 0, north: 0 },
}

export const useEditorStore = create<EditorStore>((set) => ({
  viewState: DEFAULT_VIEW,
  pendingCenter: null,
  pendingZoomDelta: null,
  styleId: '019ce7b9-403f-703d-95e6-3936bbfe60dc',
  paletteId: 'mint',
  customPaletteBase: null,
  streetLabelsVisible: false,
  maskKey: 'none',
  printFormat: 'a4',
  marker: { enabled: false, type: 'classic', color: '#e63946' },
  secondMarker: { enabled: false, type: 'classic', color: '#e63946' },
  shapeConfig: DEFAULT_SHAPE_CONFIG,
  secondMap: {
    enabled: false,
    styleId: 'streets-v2',
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
      align: 'center', bold: false, uppercase: false,
      locked: false, isCoordinates: false,
    },
    {
      id: 'block-subtitle',
      text: 'Emma & Leo',
      x: 0.1, y: 0.87, width: 0.8,
      fontFamily: 'CaviarDreams',
      fontSize: 13, color: '#555555',
      align: 'center', bold: false, uppercase: true,
      locked: false, isCoordinates: false, label: 'Name',
    },
    {
      id: 'block-coords',
      text: '',
      x: 0.1, y: 0.91, width: 0.8,
      fontFamily: 'CaviarDreams',
      fontSize: 11, color: '#888888',
      align: 'center', bold: false, uppercase: false,
      locked: false, isCoordinates: true, label: 'Ort & Koordinaten',
    },
  ],
  locationName: 'München',
  selectedBlockId: null,
  projectId: null,
  photos: [],

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
  setStreetLabelsVisible: (streetLabelsVisible) => set({ streetLabelsVisible }),
  setMaskKey: (maskKey) => set({ maskKey }),
  setPrintFormat: (printFormat) => set({ printFormat }),
  setMarker: (updates) => set((s) => ({ marker: { ...s.marker, ...updates } })),
  setSecondMarker: (updates) => set((s) => ({ secondMarker: { ...s.secondMarker, ...updates } })),
  setShapeConfig: (updates) => set((s) => ({ shapeConfig: { ...s.shapeConfig, ...updates } })),
  setShapeOuter: (updates) => set((s) => ({ shapeConfig: { ...s.shapeConfig, outer: { ...s.shapeConfig.outer, ...updates } } })),
  setInnerFrame: (updates) => set((s) => ({ shapeConfig: { ...s.shapeConfig, innerFrame: { ...s.shapeConfig.innerFrame, ...updates } } })),
  setOuterFrame: (updates) => set((s) => ({ shapeConfig: { ...s.shapeConfig, outerFrame: { ...s.shapeConfig.outerFrame, ...updates } } })),

  setSecondMapEnabled: (enabled) => set((s) => ({ secondMap: { ...s.secondMap, enabled } })),
  setSecondMapStyleId: (id) => set((s) => ({ secondMap: { ...s.secondMap, styleId: id } })),
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
  loadFromConfig: (config) => set((s) => ({
    viewState: config.viewState ?? s.viewState,
    styleId: config.styleId ?? s.styleId,
    paletteId: config.paletteId ?? s.paletteId,
    customPaletteBase: config.customPaletteBase ?? s.customPaletteBase,
    streetLabelsVisible: config.streetLabelsVisible ?? s.streetLabelsVisible,
    maskKey: config.maskKey ?? s.maskKey,
    printFormat: config.printFormat ?? s.printFormat,
    marker: config.marker ?? s.marker,
    secondMarker: config.secondMarker ?? s.secondMarker,
    shapeConfig: config.shapeConfig ?? s.shapeConfig,
    secondMap: config.secondMap
      ? { ...s.secondMap, ...config.secondMap, pendingCenter: null, pendingZoomDelta: null }
      : s.secondMap,
    textBlocks: config.textBlocks ?? s.textBlocks,
    locationName: config.locationName ?? s.locationName,
    photos: config.photos ?? s.photos,
    pendingCenter: config.viewState
      ? { lng: config.viewState.lng, lat: config.viewState.lat, zoom: config.viewState.zoom }
      : s.pendingCenter,
  })),
}))
