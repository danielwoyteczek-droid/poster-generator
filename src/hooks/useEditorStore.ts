import { create } from 'zustand'
import type { MapMaskKey } from '@/lib/map-masks'
import type { PrintFormat, PosterOrientation } from '@/lib/print-formats'
import { DEFAULT_SHAPE_CONFIG, type ShapeConfigState } from '@/lib/mask-composer'
import type { PhotoMaskKey } from '@/lib/photo-masks'
import type { MapPaletteColors } from '@/lib/map-palettes'
import type { GeoBoundary } from '@/lib/geo-boundaries'
import { FONT_SIZE_LEGACY_REF_WIDTH } from '@/lib/font-scale'

export { FONT_SIZE_LEGACY_REF_WIDTH }

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
  /**
   * When true the map renderer animates (flyTo) into the new camera; when
   * false/undefined it teleports (jumpTo). Default false so legacy paths
   * (preset apply, format change) keep their instant behaviour — only
   * user-driven actions like the location search opt into the animation.
   */
  animated?: boolean
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
  /**
   * Legacy "px @ 800-wide canvas". Kept for the sidebar UI which exposes
   * the familiar 8–120 number and for backwards compat with saved presets
   * and projects. Renderers MUST use `fontSizeFraction` instead so the
   * size scales proportionally across A4/A3/A2.
   */
  fontSize: number
  /**
   * Format-invariant font size as a fraction of poster width (renderer truth).
   * `fontSizeFraction = 0.06` means the rendered font-size is 6 % of the
   * canvas width — independent of A4/A3/A2 and of preview vs print pixels.
   * Optional on legacy data; renderers fall back to `fontSize / 800`.
   */
  fontSizeFraction?: number
  color: string
  align: 'left' | 'center' | 'right'
  bold: boolean
  uppercase: boolean
  locked: boolean
  isCoordinates: boolean
  /** For coords-blocks (`isCoordinates: true`) only: which map's lat/lng
   *  to format. Defaults to 'primary' when undefined (legacy blocks). The
   *  'secondary' option requires split-map mode active — otherwise the
   *  block falls back to primary so the customer doesn't see stale values. */
  coordsSource?: 'primary' | 'secondary'
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
  /** Place names (cities, towns, neighborhoods) on the map — separate
   *  toggle from streetLabelsVisible. Defaults to true so a fresh editor
   *  shows the location's name without manual flipping. */
  placeLabelsVisible: boolean
  /** When true, the poster background follows the active palette's
   *  `background` colour (so the area outside the shape blends with the
   *  map's land colour). When false, the poster bg stays white. */
  posterDarkMode: boolean
  maskKey: MapMaskKey
  /**
   * PROJ-51: the administrative region selected for the `geo-boundary` mask.
   * Holds the region's simplified polygon so the poster stays reproducible
   * (and the export self-contained) without re-hitting the geo API. Only
   * rendered when `maskKey === 'geo-boundary'`. Null = no region picked yet.
   */
  geoBoundary: GeoBoundary | null
  /**
   * PROJ-51: pending camera request to frame a geo-boundary's bounding box.
   * Set when a region is selected; MapPreviewInner consumes it via fitBounds
   * and then clears it.
   */
  pendingFitBounds: [number, number, number, number] | null
  printFormat: PrintFormat
  orientation: PosterOrientation
  marker: MarkerState
  secondMap: SecondMapState
  secondMarker: MarkerState
  shapeConfig: ShapeConfigState
  layoutId: PosterLayoutId
  innerMarginMm: number
  /**
   * Optional decoration overlay drawn on top of the map (solid colour, not
   * filled with map tiles). Auto-applied when the user selects a mask that
   * carries a `decoration_svg_url` (PROJ-35); presets may also override it
   * via config_json (PROJ-8). Render is gated by `decorationVisible`.
   */
  decorationSvgUrl: string | null
  /**
   * PROJ-35: per-session toggle for hiding the decoration overlay even
   * when one is set. Default true. Customer-facing UI shows a switch only
   * while a decoration is active. Not persisted across sessions/presets.
   */
  decorationVisible: boolean
  /**
   * PROJ-25: editor-only design aid. When true, a centre-cross + rule-of-
   * thirds grid is overlaid on the live canvas so the user can see where
   * the centre is. Never persisted or exported — purely a working view.
   */
  gridVisible: boolean
  locationName: string
  textBlocks: TextBlock[]
  selectedBlockId: string | null
  projectId: string | null
  /**
   * Editor type the saved project was created for. `useProjectSync.saveToCloud`
   * only PATCHes the existing `projectId` if its `posterType` matches the
   * current editor — otherwise the user has switched editors and we POST a
   * new project instead of overwriting an unrelated one.
   */
  projectPosterType: 'map' | 'star-map' | 'photo' | 'wedding' | null
  /**
   * Set when an admin loads an existing preset via "Bearbeiten" in the Admin
   * list. Lets SaveAsPresetButton offer "update existing" alongside "save as
   * new". Cleared on successful save or when the admin starts a fresh design.
   */
  editingPreset: {
    id: string
    name: string
    description: string | null
    posterType: 'map' | 'star-map' | 'photo'
  } | null
  photos: PhotoItem[]
  splitMode: 'none' | 'second-map' | 'photo'
  splitPhoto: SplitPhoto | null
  splitPhotoZone: number
  /** Which map receives pan/zoom interactions in split mode. Doesn't
   *  affect rendering, only pointer-events routing. Used to side-step
   *  CSS-mask z-order issues with shapes that cross the canvas midline
   *  (entwined hearts etc.) — user toggles which map is "active". */
  activeSplitMap: 'primary' | 'secondary'

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
  setPlaceLabelsVisible: (visible: boolean) => void
  setPosterDarkMode: (value: boolean) => void
  setMaskKey: (key: MapMaskKey) => void
  setGeoBoundary: (boundary: GeoBoundary | null) => void
  clearPendingFitBounds: () => void
  setDecorationSvgUrl: (url: string | null) => void
  setDecorationVisible: (visible: boolean) => void
  setGridVisible: (visible: boolean) => void
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
  setSavedProject: (id: string, posterType: 'map' | 'star-map' | 'photo' | 'wedding') => void
  clearProjectBinding: () => void
  setEditingPreset: (preset: EditorStore['editingPreset']) => void
  addPhoto: (photo: Omit<PhotoItem, 'id' | 'uploadedAt'>) => void
  updatePhoto: (id: string, updates: Partial<PhotoItem>) => void
  removePhoto: (id: string) => void
  setSplitMode: (mode: 'none' | 'second-map' | 'photo') => void
  setSplitPhoto: (photo: SplitPhoto | null) => void
  updateSplitPhoto: (updates: Partial<SplitPhoto>) => void
  setSplitPhotoZone: (zone: number) => void
  setActiveSplitMap: (which: 'primary' | 'secondary') => void
  loadFromConfig: (config: Partial<EditorConfig>) => void
}

export interface EditorConfig {
  viewState: ViewState
  styleId: string
  paletteId: string
  customPaletteBase: string | null
  customPalette: MapPaletteColors | null
  streetLabelsVisible: boolean
  placeLabelsVisible: boolean
  posterDarkMode: boolean
  maskKey: MapMaskKey
  geoBoundary: GeoBoundary | null
  printFormat: PrintFormat
  orientation: PosterOrientation
  marker: MarkerState
  secondMarker: MarkerState
  secondMap: Pick<SecondMapState, 'enabled' | 'styleId' | 'paletteId' | 'customPaletteBase' | 'customPalette' | 'viewState'>
  shapeConfig: ShapeConfigState
  layoutId: PosterLayoutId
  innerMarginMm: number
  decorationSvgUrl: string | null
  decorationVisible: boolean
  textBlocks: TextBlock[]
  locationName: string
  photos: PhotoItem[]
  splitMode: 'none' | 'second-map' | 'photo'
  splitPhoto: SplitPhoto | null
  splitPhotoZone: number
}

/**
 * Hydrate legacy text blocks (saved before the format-invariant
 * `fontSizeFraction` rollout) by deriving the fraction from the legacy
 * `fontSize` value. Idempotent — already-migrated blocks pass through.
 */
function migrateTextBlockFraction(block: TextBlock): TextBlock {
  if (block.fontSizeFraction !== undefined) return block
  return { ...block, fontSizeFraction: block.fontSize / FONT_SIZE_LEGACY_REF_WIDTH }
}

// PROJ-1: Initial state mirrors the "New York" preset — first-time visitors
// see a strong, finished-looking poster instead of a blank München template,
// which converts better. Location, zoom, style, palette, layout and text
// blocks are all aligned with the published New York preset (id
// 0726c022-a6ce-408c-affe-8f1dfbbb6207). To change the welcome look, swap
// the values below — single-source of truth, no admin field needed yet.
const DEFAULT_VIEW: ViewState = {
  lng: -74.006,
  lat: 40.7128,
  zoom: 11,
  viewportWidth: 0,
  viewportHeight: 0,
  bounds: { west: 0, south: 0, east: 0, north: 0 },
}

// München fallback for the second-map slot (split-map feature). Customers
// rarely reach this and it's not the welcome experience, so keep it close
// to home.
const SECOND_MAP_DEFAULT_VIEW: ViewState = {
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
  styleId: 'tusche',
  paletteId: 'custom',
  customPaletteBase: '#111111',
  customPalette: {
    land: '#eeeeee',
    road: '#1a1a1a',
    label: '#222222',
    water: '#2a75c6',
    border: '#bdbdbd',
    building: '#dddddd',
    labelHalo: '#ffffff',
    background: '#ffffff',
  },
  streetLabelsVisible: false,
  placeLabelsVisible: true,
  posterDarkMode: false,
  maskKey: 'none',
  geoBoundary: null,
  pendingFitBounds: null,
  printFormat: 'a4' as const,
  orientation: 'portrait' as const,
  // Primary marker on by default so a fresh editor immediately shows the
  // location pin — the customer can disable it from the Marker tab but
  // shouldn't have to flip a toggle just to see where the search lands.
  // Secondary stays off; the split-map auto-enable path turns it on when
  // dual-map mode activates (PROJ-1 migration in PosterCanvas).
  marker: { enabled: true, type: 'classic' as const, color: '#e63946' },
  secondMarker: { enabled: false, type: 'classic' as const, color: '#e63946' },
  shapeConfig: DEFAULT_SHAPE_CONFIG,
  layoutId: 'text-15' as const,
  innerMarginMm: 0,
  decorationSvgUrl: null,
  decorationVisible: true,
  gridVisible: false,
  secondMap: {
    enabled: false,
    styleId: 'klassisch',
    paletteId: 'original',
    customPaletteBase: null,
    customPalette: null,
    viewState: SECOND_MAP_DEFAULT_VIEW,
    pendingCenter: null,
    pendingZoomDelta: null,
  },
  textBlocks: [
    {
      id: 'block-title',
      text: 'NEW YORK',
      x: 0.1, y: 0.87, width: 0.8,
      fontFamily: 'Playfair Display',
      fontSize: 48, fontSizeFraction: 48 / FONT_SIZE_LEGACY_REF_WIDTH,
      color: '#000000',
      align: 'center' as const, bold: false, uppercase: false,
      locked: false, isCoordinates: false,
    },
    {
      id: 'block-coords',
      text: '',
      x: 0.1, y: 0.96, width: 0.8,
      fontFamily: 'CaviarDreams',
      fontSize: 20, fontSizeFraction: 20 / FONT_SIZE_LEGACY_REF_WIDTH,
      color: '#888888',
      align: 'center' as const, bold: false, uppercase: false,
      locked: false, isCoordinates: true, label: 'Ort & Koordinaten',
    },
  ],
  locationName: 'New York',
  selectedBlockId: null,
  projectId: null,
  projectPosterType: null,
  editingPreset: null,
  photos: [],
  splitMode: 'none' as const,
  splitPhoto: null,
  splitPhotoZone: 1,
  activeSplitMap: 'primary' as const,
}

export const useEditorStore = create<EditorStore>((set) => ({
  ...EDITOR_INITIAL_STATE,

  setViewState: (viewState) => set({ viewState }),
  flyToLocation: (lng, lat, zoom = 13) =>
    // Pin the marker AT the searched location so DraggablePin projects it
    // via map.project() — i.e. the pin moves WITH the map when the user
    // pans afterwards. Previously we nulled lat/lng, which left the pin
    // glued to the viewport center; panning then desynced the pin from the
    // actual searched street and the user lost their reference point.
    set((s) => ({ pendingCenter: { lng, lat, zoom, animated: true }, marker: { ...s.marker, lat, lng } })),
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
  setPlaceLabelsVisible: (placeLabelsVisible) => set({ placeLabelsVisible }),
  setPosterDarkMode: (posterDarkMode) => set({ posterDarkMode }),
  setMaskKey: (maskKey) => set({ maskKey }),
  setGeoBoundary: (geoBoundary) =>
    // Selecting a region also queues a camera move so the map auto-frames
    // the region's bounding box. Clearing the region (× button) leaves the
    // camera where it is.
    set({
      geoBoundary,
      pendingFitBounds: geoBoundary ? geoBoundary.bbox : null,
    }),
  clearPendingFitBounds: () => set({ pendingFitBounds: null }),
  setDecorationSvgUrl: (decorationSvgUrl) => set({ decorationSvgUrl }),
  setDecorationVisible: (decorationVisible) => set({ decorationVisible }),
  setGridVisible: (gridVisible) => set({ gridVisible }),
  setPrintFormat: (printFormat) =>
    // PROJ-37: Format-Wechsel re-zentriert die Map auf den Marker (Zoom
    // bleibt). Ohne dies würde der Marker beim Verkleinern (z.B. A2 → A4)
    // potentiell aus dem schmaleren Viewport rutschen. Nur wenn ein
    // Marker mit konkreter Position aktiv ist — sonst bleibt viewState
    // unverändert.
    set((s) => {
      if (s.printFormat === printFormat) return { printFormat }
      const hasPrimaryMarker =
        s.marker.enabled && s.marker.lat != null && s.marker.lng != null
      const pendingCenter = hasPrimaryMarker
        ? { lng: s.marker.lng as number, lat: s.marker.lat as number, zoom: s.viewState.zoom }
        : s.pendingCenter
      const hasSecondaryMarker =
        s.secondMarker.enabled && s.secondMarker.lat != null && s.secondMarker.lng != null
      const secondMap = hasSecondaryMarker
        ? {
            ...s.secondMap,
            pendingCenter: {
              lng: s.secondMarker.lng as number,
              lat: s.secondMarker.lat as number,
              zoom: s.secondMap.viewState.zoom,
            },
          }
        : s.secondMap
      return { printFormat, pendingCenter, secondMap }
    }),
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
    // Mirror flyToLocation: anchor the secondary marker at the searched
    // coords so it pans with the map, not with the viewport.
    set((s) => ({
      secondMap: { ...s.secondMap, pendingCenter: { lng, lat, zoom, animated: true } },
      secondMarker: { ...s.secondMarker, lat, lng },
    })),
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
        fontSize: 16, fontSizeFraction: 16 / FONT_SIZE_LEGACY_REF_WIDTH,
        color: '#000000',
        align: 'center', bold: false, uppercase: false,
        locked: false, isCoordinates: false,
      }],
      selectedBlockId: id,
    }))
  },
  updateTextBlock: (id, updates) => set((s) => ({
    // When the sidebar UI changes `fontSize`, keep `fontSizeFraction` in
    // lock-step so renderers see a consistent value. The UI only writes
    // fontSize — fraction is the renderer truth derived from it.
    textBlocks: s.textBlocks.map((b) => {
      if (b.id !== id) return b
      const merged = { ...b, ...updates }
      if (updates.fontSize !== undefined && updates.fontSizeFraction === undefined) {
        merged.fontSizeFraction = updates.fontSize / FONT_SIZE_LEGACY_REF_WIDTH
      }
      return merged
    }),
  })),
  deleteTextBlock: (id) => set((s) => ({
    textBlocks: s.textBlocks.filter(b => b.id !== id),
    selectedBlockId: s.selectedBlockId === id ? null : s.selectedBlockId,
  })),
  setLocationName: (name) => set({ locationName: name }),
  setSelectedBlockId: (id) => set({ selectedBlockId: id }),
  setProjectId: (id) => set({ projectId: id, ...(id === null ? { projectPosterType: null } : {}) }),
  setSavedProject: (id, posterType) => set({ projectId: id, projectPosterType: posterType }),
  clearProjectBinding: () => set({ projectId: null, projectPosterType: null }),
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
    set((s) => {
      const isSplitMap = splitMode === 'second-map'
      // PROJ-1: when activating split-map, ensure a secondary coords-block
      // exists alongside the existing primary one. Skip if the user already
      // has a secondary-coords block (e.g. from a saved project).
      const hasSecondaryCoords = s.textBlocks.some(
        (b) => b.isCoordinates && b.coordsSource === 'secondary',
      )
      const primaryCoordsBlock = s.textBlocks.find(
        (b) => b.isCoordinates && (b.coordsSource ?? 'primary') === 'primary',
      )
      const textBlocks =
        isSplitMap && !hasSecondaryCoords && primaryCoordsBlock
          ? [
              ...s.textBlocks,
              {
                ...primaryCoordsBlock,
                id: `block-coords-secondary-${Date.now()}`,
                coordsSource: 'secondary' as const,
                // Place directly below the primary block (same x/width/align),
                // ~1 line-height down. Customer can drag afterwards.
                y: Math.min(primaryCoordsBlock.y + 0.045, 0.97),
                label: 'Koordinaten Karte 2',
              },
            ]
          : s.textBlocks
      return {
        splitMode,
        secondMap: { ...s.secondMap, enabled: isSplitMap },
        // PROJ-1: when activating split-map, ensure both markers are
        // visible by default. User's request: "wenn zwei Karten da
        // sind, sollten auch zwei Marker da sein". Each can still be
        // toggled independently afterwards via the sidebar switches.
        marker: isSplitMap ? { ...s.marker, enabled: true } : s.marker,
        secondMarker: isSplitMap ? { ...s.secondMarker, enabled: true } : s.secondMarker,
        textBlocks,
        // Keep the uploaded split photo around so switching modes doesn't
        // force the user to re-upload. It just becomes inactive.
      }
    }),
  setSplitPhoto: (photo) => set({ splitPhoto: photo }),
  updateSplitPhoto: (updates) =>
    set((s) => ({ splitPhoto: s.splitPhoto ? { ...s.splitPhoto, ...updates } : null })),
  setSplitPhotoZone: (splitPhotoZone) => set({ splitPhotoZone }),
  setActiveSplitMap: (activeSplitMap) => set({ activeSplitMap }),
  loadFromConfig: (config) => set((s) => ({
    viewState: config.viewState ?? s.viewState,
    styleId: config.styleId ?? s.styleId,
    paletteId: config.paletteId ?? s.paletteId,
    customPaletteBase: config.customPaletteBase ?? s.customPaletteBase,
    customPalette: config.customPalette ?? s.customPalette,
    streetLabelsVisible: config.streetLabelsVisible ?? s.streetLabelsVisible,
    placeLabelsVisible: config.placeLabelsVisible ?? s.placeLabelsVisible,
    posterDarkMode: config.posterDarkMode ?? s.posterDarkMode,
    maskKey: config.maskKey ?? s.maskKey,
    geoBoundary: config.geoBoundary ?? s.geoBoundary,
    // Don't auto-fit on project load — the saved viewState is the truth, and
    // loadFromConfig restores the camera via pendingCenter below. Re-framing
    // the bbox here would discard the user's saved zoom/pan.
    pendingFitBounds: s.pendingFitBounds,
    printFormat: config.printFormat ?? s.printFormat,
    orientation: config.orientation ?? s.orientation,
    marker: config.marker ?? s.marker,
    secondMarker: config.secondMarker ?? s.secondMarker,
    shapeConfig: config.shapeConfig ?? s.shapeConfig,
    layoutId: config.layoutId ?? s.layoutId,
    innerMarginMm: config.innerMarginMm ?? s.innerMarginMm,
    decorationSvgUrl: config.decorationSvgUrl ?? s.decorationSvgUrl,
    decorationVisible: config.decorationVisible ?? true,
    secondMap: config.secondMap
      ? { ...s.secondMap, ...config.secondMap, pendingCenter: null, pendingZoomDelta: null }
      : s.secondMap,
    textBlocks: config.textBlocks ? config.textBlocks.map(migrateTextBlockFraction) : s.textBlocks,
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

if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'production') {
  ;(window as unknown as { useEditorStore: typeof useEditorStore }).useEditorStore = useEditorStore
}
