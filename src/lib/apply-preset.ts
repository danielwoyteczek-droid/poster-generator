import { useEditorStore, type EditorStore } from '@/hooks/useEditorStore'
import { useStarMapStore } from '@/hooks/useStarMapStore'
import {
  usePhotoEditorStore,
  type GridSlotState,
  type LetterSlot,
  type SinglePhotoState,
} from '@/hooks/usePhotoEditorStore'
import type { GridLayout, GridSlotDefinition } from '@/lib/grid-layout'
import { resolveMask } from '@/hooks/useCustomMasks'
import type { MaskFontKey } from '@/lib/letter-mask'
import type { PosterOrientation } from '@/lib/print-formats'
import type { PhotoMaskKey } from '@/lib/photo-masks'

interface PresetLike {
  poster_type: 'map' | 'star-map' | 'photo'
  config_json: Record<string, unknown>
}

type UndoFn = () => void

export interface ApplyPresetOptions {
  /**
   * - `full` (default): apply every saved field, including location, text,
   *   marker, photo. Right for entry-points where the customer expects to
   *   see the preset exactly as designed (Gallery card click, deep-links).
   * - `design-only`: apply only visual style fields (style, palette,
   *   mask, frame, decoration, layout, orientation, dark-mode). The user's
   *   data — location, zoom, locationName, text content, marker, photos —
   *   stays untouched. Right for in-editor preset switching where the
   *   customer is just trying on different looks.
   */
  mode?: 'full' | 'design-only'
}

/**
 * Apply a preset's config to the corresponding store(s). Returns an undo
 * function that restores the previous state (only for fields the preset
 * actually touches). The user's location / datetime / projectId are never
 * touched by apply — so they're also not part of the undo snapshot.
 */
export function applyPreset(preset: PresetLike, options: ApplyPresetOptions = {}): UndoFn {
  const config = preset.config_json
  const mode = options.mode ?? 'full'

  if (preset.poster_type === 'star-map') {
    const s = config as {
      lat?: number; lng?: number; locationName?: string; datetime?: string
      posterBgColor?: string; skyBgColor?: string; starColor?: string
      showConstellations?: boolean; showMilkyWay?: boolean
      showSun?: boolean; showMoon?: boolean; showPlanets?: boolean
      showCompass?: boolean
      showGrid?: boolean
      gridOpacity?: number
      starDensity?: number
      textureKey?: string | null
      textureOpacity?: number
      frameConfig?: {
        outer?: Partial<{ mode: 'none' | 'opacity' | 'full'; opacity: number; margin: number }>
        innerFrame?: Partial<{ enabled: boolean; color: string; thickness: number }>
        outerFrame?: Partial<{ enabled: boolean; color: string; thickness: number; style: 'single' | 'double'; gap: number }>
      }
      textBlocks?: unknown
    }
    const starMap = useStarMapStore.getState()
    const editor = useEditorStore.getState()

    // Snapshot everything we might touch
    const snapshot = {
      lat: starMap.lat,
      lng: starMap.lng,
      locationName: starMap.locationName,
      datetime: starMap.datetime,
      posterBgColor: starMap.posterBgColor,
      skyBgColor: starMap.skyBgColor,
      starColor: starMap.starColor,
      showConstellations: starMap.showConstellations,
      showMilkyWay: starMap.showMilkyWay,
      showSun: starMap.showSun,
      showMoon: starMap.showMoon,
      showPlanets: starMap.showPlanets,
      showCompass: starMap.showCompass,
      showGrid: starMap.showGrid,
      gridOpacity: starMap.gridOpacity,
      starDensity: starMap.starDensity,
      textureKey: starMap.textureKey,
      textureOpacity: starMap.textureOpacity,
      frameConfig: starMap.frameConfig,
      textBlocks: editor.textBlocks,
    }

    // Star-Map design-only mode (PROJ-8): preserve the user's location +
    // datetime + text. The constellation depends on time + place, so those
    // are user-data, not design.
    if (mode !== 'design-only') {
      if (typeof s.lat === 'number' && typeof s.lng === 'number') {
        starMap.setLocation(s.lat, s.lng, s.locationName ?? starMap.locationName)
      }
      if (s.datetime) starMap.setDatetime(s.datetime)
    }
    if (s.posterBgColor) starMap.setPosterBgColor(s.posterBgColor)
    if (s.skyBgColor) starMap.setSkyBgColor(s.skyBgColor)
    if (s.starColor) starMap.setStarColor(s.starColor)
    if (s.showConstellations !== undefined) starMap.setShowConstellations(s.showConstellations)
    if (s.showMilkyWay !== undefined) starMap.setShowMilkyWay(s.showMilkyWay)
    if (s.showSun !== undefined) starMap.setShowSun(s.showSun)
    if (s.showMoon !== undefined) starMap.setShowMoon(s.showMoon)
    if (s.showPlanets !== undefined) starMap.setShowPlanets(s.showPlanets)
    if (s.showCompass !== undefined) starMap.setShowCompass(s.showCompass)
    if (s.showGrid !== undefined) starMap.setShowGrid(s.showGrid)
    if (s.gridOpacity !== undefined) starMap.setGridOpacity(s.gridOpacity)
    if (s.starDensity !== undefined) starMap.setStarDensity(s.starDensity)
    if (s.textureKey !== undefined) starMap.setTextureKey(s.textureKey)
    if (s.textureOpacity !== undefined) starMap.setTextureOpacity(s.textureOpacity)
    if (s.frameConfig?.outer) starMap.setOuter(s.frameConfig.outer)
    if (s.frameConfig?.innerFrame) starMap.setInnerFrame(s.frameConfig.innerFrame)
    if (s.frameConfig?.outerFrame) starMap.setOuterFrame(s.frameConfig.outerFrame)
    if (s.textBlocks && mode !== 'design-only') useEditorStore.setState({ textBlocks: s.textBlocks as never })

    return () => {
      useStarMapStore.setState({
        lat: snapshot.lat,
        lng: snapshot.lng,
        locationName: snapshot.locationName,
        datetime: snapshot.datetime,
        posterBgColor: snapshot.posterBgColor,
        skyBgColor: snapshot.skyBgColor,
        starColor: snapshot.starColor,
        showConstellations: snapshot.showConstellations,
        showMilkyWay: snapshot.showMilkyWay,
        showSun: snapshot.showSun,
        showMoon: snapshot.showMoon,
        showPlanets: snapshot.showPlanets,
        showCompass: snapshot.showCompass,
        showGrid: snapshot.showGrid,
        gridOpacity: snapshot.gridOpacity,
        starDensity: snapshot.starDensity,
        textureKey: snapshot.textureKey,
        textureOpacity: snapshot.textureOpacity,
        frameConfig: snapshot.frameConfig,
      })
      useEditorStore.setState({ textBlocks: snapshot.textBlocks })
    }
  }

  if (preset.poster_type === 'photo') {
    const p = config as {
      word?: string
      slots?: LetterSlot[]
      wordWidth?: number
      wordX?: number
      wordY?: number
      orientation?: PosterOrientation
      maskFontKey?: MaskFontKey
      defaultSlotColor?: string
      layoutMode?: 'letter-mask' | 'single-photo' | 'photo-grid'
      singlePhoto?: SinglePhotoState | null
      singlePhotoMaskKey?: PhotoMaskKey
      gridLayout?: GridLayout | GridSlotDefinition[]
      gridSlots?: GridSlotState[]
      textBlocks?: unknown
    }
    const photo = usePhotoEditorStore.getState()
    const editorBefore = useEditorStore.getState()

    const snapshot = {
      word: photo.word,
      slots: photo.slots,
      wordWidth: photo.wordWidth,
      wordX: photo.wordX,
      wordY: photo.wordY,
      orientation: photo.orientation,
      maskFontKey: photo.maskFontKey,
      defaultSlotColor: photo.defaultSlotColor,
      layoutMode: photo.layoutMode,
      singlePhoto: photo.singlePhoto,
      singlePhotoMaskKey: photo.singlePhotoMaskKey,
      gridLayout: photo.gridLayout,
      gridSlots: photo.gridSlots,
      selectedGridSlotIndex: photo.selectedGridSlotIndex,
      textBlocks: editorBefore.textBlocks,
    }

    // Photo-grid: accept either the canonical `{ slots: [...] }` envelope
    // or a bare array (legacy / editor convenience). Reconcile gridSlots
    // so length always matches the new layout.
    const incomingLayout: GridSlotDefinition[] | null = Array.isArray(p.gridLayout)
      ? p.gridLayout
      : p.gridLayout && Array.isArray(p.gridLayout.slots)
        ? p.gridLayout.slots
        : null

    // Reconcile incoming gridSlots state against the new layout so length
    // always matches the new slot count. Slots that share an id keep their
    // photo / color; new ids get an empty entry.
    const reconciledGridSlots = incomingLayout
      ? incomingLayout.map((def) => {
          const incoming = Array.isArray(p.gridSlots)
            ? p.gridSlots.find((s) => s.id === def.id)
            : undefined
          return incoming ?? { id: def.id, photo: null, color: null }
        })
      : null

    // Photo design-only mode (PROJ-8): preserve the customer's uploaded
    // photos, word, text — only swap pure design fields (positioning,
    // font, colour, single-photo mask shape). `layoutMode` and
    // `gridLayout` are also preserved to avoid wiping data when a customer
    // switches between letter-mask / single / grid presets mid-edit.
    const designOnlyPhoto = mode === 'design-only'
    usePhotoEditorStore.setState((state) => ({
      ...state,
      word: !designOnlyPhoto && typeof p.word === 'string' ? p.word : state.word,
      slots: !designOnlyPhoto && Array.isArray(p.slots) ? p.slots : state.slots,
      wordWidth: typeof p.wordWidth === 'number' ? p.wordWidth : state.wordWidth,
      wordX: typeof p.wordX === 'number' ? p.wordX : state.wordX,
      wordY: typeof p.wordY === 'number' ? p.wordY : state.wordY,
      orientation: p.orientation ?? state.orientation,
      maskFontKey: p.maskFontKey ?? state.maskFontKey,
      defaultSlotColor: p.defaultSlotColor ?? state.defaultSlotColor,
      layoutMode: !designOnlyPhoto ? (p.layoutMode ?? state.layoutMode) : state.layoutMode,
      // singlePhoto can legitimately be null in a preset (Customer never
      // uploaded one yet) — distinguish "not in config" from "null".
      singlePhoto: !designOnlyPhoto && 'singlePhoto' in p ? (p.singlePhoto ?? null) : state.singlePhoto,
      singlePhotoMaskKey: p.singlePhotoMaskKey ?? state.singlePhotoMaskKey,
      // Photo-grid: only swap layout + slots if the preset actually carries
      // them. A map / star-map / letter-mask preset shouldn't overwrite the
      // current grid state.
      gridLayout: !designOnlyPhoto ? (incomingLayout ?? state.gridLayout) : state.gridLayout,
      gridSlots: !designOnlyPhoto ? (reconciledGridSlots ?? state.gridSlots) : state.gridSlots,
      // Drop any selection that no longer points at a valid slot.
      selectedGridSlotIndex:
        !designOnlyPhoto && incomingLayout && state.selectedGridSlotIndex !== null
          ? state.selectedGridSlotIndex < incomingLayout.length
            ? state.selectedGridSlotIndex
            : null
          : state.selectedGridSlotIndex,
    }))
    if (p.textBlocks && !designOnlyPhoto) useEditorStore.setState({ textBlocks: p.textBlocks as never })

    return () => {
      usePhotoEditorStore.setState((state) => ({
        ...state,
        word: snapshot.word,
        slots: snapshot.slots,
        wordWidth: snapshot.wordWidth,
        wordX: snapshot.wordX,
        wordY: snapshot.wordY,
        orientation: snapshot.orientation,
        maskFontKey: snapshot.maskFontKey,
        defaultSlotColor: snapshot.defaultSlotColor,
        layoutMode: snapshot.layoutMode,
        singlePhoto: snapshot.singlePhoto,
        singlePhotoMaskKey: snapshot.singlePhotoMaskKey,
        gridLayout: snapshot.gridLayout,
        gridSlots: snapshot.gridSlots,
        selectedGridSlotIndex: snapshot.selectedGridSlotIndex,
      }))
      useEditorStore.setState({ textBlocks: snapshot.textBlocks })
    }
  }

  // Map preset
  const editor = useEditorStore.getState()
  const snapshot = {
    styleId: editor.styleId,
    paletteId: editor.paletteId,
    customPaletteBase: editor.customPaletteBase,
    customPalette: editor.customPalette,
    streetLabelsVisible: editor.streetLabelsVisible,
    posterDarkMode: editor.posterDarkMode,
    maskKey: editor.maskKey,
    marker: editor.marker,
    secondMarker: editor.secondMarker,
    secondMap: editor.secondMap,
    shapeConfig: editor.shapeConfig,
    textBlocks: editor.textBlocks,
    splitMode: editor.splitMode,
    splitPhotoZone: editor.splitPhotoZone,
    splitPhoto: editor.splitPhoto,
    layoutId: editor.layoutId,
    innerMarginMm: editor.innerMarginMm,
    decorationSvgUrl: editor.decorationSvgUrl,
    orientation: editor.orientation,
    pendingCenter: editor.pendingCenter,
  }

  // Legacy migration (PROJ-21): presets created before the Layout dimension
  // existed encoded 'Text unten' as maskKey === 'text-below'. Treat those as
  // Kartenform = 'none' + Layout = 'text-30' so the composition looks the same.
  const rawConfig = config as Partial<EditorStore> & { maskKey?: string; layoutId?: string }
  if (rawConfig.maskKey === 'text-below' && !rawConfig.layoutId) {
    rawConfig.maskKey = 'none'
    rawConfig.layoutId = 'text-30'
  }

  type MapConfigExtras = { zoom?: number; secondMapZoom?: number; lat?: number; lng?: number; locationName?: string }
  useEditorStore.setState((state) => {
    const c = config as Partial<EditorStore> & MapConfigExtras
    const designOnly = mode === 'design-only'

    // ALL modes apply: pure visual/style fields. None of these reference the
    // user's data (location, text, marker, photo).
    const designFields = {
      styleId: c.styleId ?? state.styleId,
      paletteId: c.paletteId ?? state.paletteId,
      customPaletteBase: c.customPaletteBase ?? state.customPaletteBase,
      customPalette: c.customPalette ?? state.customPalette,
      streetLabelsVisible: c.streetLabelsVisible ?? state.streetLabelsVisible,
      posterDarkMode: c.posterDarkMode ?? state.posterDarkMode,
      maskKey: c.maskKey ?? state.maskKey,
      shapeConfig: c.shapeConfig ?? state.shapeConfig,
      layoutId: c.layoutId ?? state.layoutId,
      innerMarginMm: c.innerMarginMm ?? state.innerMarginMm,
      // PROJ-35: explicit value wins (string OR null). Auto-inheritance from
      // mask.decoration_svg_url runs as an async post-step below for legacy
      // presets where the key is missing entirely from config_json.
      decorationSvgUrl: 'decorationSvgUrl' in c ? (c.decorationSvgUrl ?? null) : null,
      orientation: c.orientation ?? state.orientation,
    }

    if (designOnly) {
      // In-editor preset switching: keep the user's data (location, zoom,
      // text content, marker, photos, split state, second map). Only the
      // visual look changes.
      return { ...state, ...designFields }
    }

    // FULL mode (default). Apply user-data fields too — this is the
    // gallery-card / external-link entry point, where the customer wants
    // to see the preset exactly as designed.
    const newSecondMap = c.secondMap ? { ...state.secondMap, ...c.secondMap } : state.secondMap
    const zoom = typeof c.zoom === 'number' ? c.zoom : null
    const secondZoom = typeof c.secondMapZoom === 'number' ? c.secondMapZoom : null
    // PROJ-8: presets save lat/lng/locationName since 2026-05-07. Older
    // presets don't have them — the user's current location stays in that
    // case (existing behaviour preserved).
    const presetLng = typeof c.lng === 'number' ? c.lng : null
    const presetLat = typeof c.lat === 'number' ? c.lat : null
    const targetLng = presetLng ?? state.viewState.lng
    const targetLat = presetLat ?? state.viewState.lat
    const targetZoom = zoom ?? state.viewState.zoom
    const cameraChanged = zoom != null || presetLng != null || presetLat != null
    return {
      ...state,
      ...designFields,
      marker: c.marker ?? state.marker,
      secondMarker: c.secondMarker ?? state.secondMarker,
      secondMap: secondZoom != null
        ? { ...newSecondMap, pendingCenter: { lng: state.secondMap.viewState.lng, lat: state.secondMap.viewState.lat, zoom: secondZoom } }
        : newSecondMap,
      textBlocks: c.textBlocks ?? state.textBlocks,
      splitMode: c.splitMode ?? state.splitMode,
      splitPhotoZone: c.splitPhotoZone ?? state.splitPhotoZone,
      splitPhoto: c.splitPhoto ?? state.splitPhoto,
      locationName: typeof c.locationName === 'string' ? c.locationName : state.locationName,
      pendingCenter: cameraChanged
        ? { lng: targetLng, lat: targetLat, zoom: targetZoom }
        : state.pendingCenter,
    }
  })

  // PROJ-35: Auto-Inheritance — if the preset config didn't contain a
  // `decorationSvgUrl` key at all (legacy preset created before the field
  // existed), look up the active mask asynchronously and apply its decoration.
  // Explicit string OR null in config_json shortcuts this (preset wins).
  const rawConfigForDeco = config as { decorationSvgUrl?: string | null; maskKey?: string }
  const hadDecorationField = 'decorationSvgUrl' in rawConfigForDeco
  if (!hadDecorationField && rawConfigForDeco.maskKey) {
    resolveMask(rawConfigForDeco.maskKey)
      .then((mask) => {
        if (mask?.decorationSvgUrl) {
          // Only apply if the user hasn't manually changed it in between (race-safety).
          const current = useEditorStore.getState()
          if (current.maskKey === rawConfigForDeco.maskKey && !current.decorationSvgUrl) {
            useEditorStore.setState({ decorationSvgUrl: mask.decorationSvgUrl })
          }
        }
      })
      .catch(() => { /* ignore — null fallback is acceptable */ })
  }

  return () => {
    useEditorStore.setState((state) => ({
      ...state,
      ...snapshot,
    }))
  }
}
