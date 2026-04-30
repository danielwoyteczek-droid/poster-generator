import { useEditorStore, type EditorStore } from '@/hooks/useEditorStore'
import { useStarMapStore } from '@/hooks/useStarMapStore'
import { usePhotoEditorStore, type LetterSlot } from '@/hooks/usePhotoEditorStore'
import type { MaskFontKey } from '@/lib/letter-mask'
import type { PosterOrientation } from '@/lib/print-formats'

interface PresetLike {
  poster_type: 'map' | 'star-map' | 'photo'
  config_json: Record<string, unknown>
}

type UndoFn = () => void

/**
 * Apply a preset's config to the corresponding store(s). Returns an undo
 * function that restores the previous state (only for fields the preset
 * actually touches). The user's location / datetime / projectId are never
 * touched by apply — so they're also not part of the undo snapshot.
 */
export function applyPreset(preset: PresetLike): UndoFn {
  const config = preset.config_json

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

    if (typeof s.lat === 'number' && typeof s.lng === 'number') {
      starMap.setLocation(s.lat, s.lng, s.locationName ?? starMap.locationName)
    }
    if (s.datetime) starMap.setDatetime(s.datetime)
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
    if (s.textBlocks) useEditorStore.setState({ textBlocks: s.textBlocks as never })

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
      textBlocks: editorBefore.textBlocks,
    }

    usePhotoEditorStore.setState((state) => ({
      ...state,
      word: typeof p.word === 'string' ? p.word : state.word,
      slots: Array.isArray(p.slots) ? p.slots : state.slots,
      wordWidth: typeof p.wordWidth === 'number' ? p.wordWidth : state.wordWidth,
      wordX: typeof p.wordX === 'number' ? p.wordX : state.wordX,
      wordY: typeof p.wordY === 'number' ? p.wordY : state.wordY,
      orientation: p.orientation ?? state.orientation,
      maskFontKey: p.maskFontKey ?? state.maskFontKey,
      defaultSlotColor: p.defaultSlotColor ?? state.defaultSlotColor,
      layoutMode: p.layoutMode ?? state.layoutMode,
    }))
    if (p.textBlocks) useEditorStore.setState({ textBlocks: p.textBlocks as never })

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

  type MapConfigExtras = { zoom?: number; secondMapZoom?: number }
  useEditorStore.setState((state) => {
    const c = config as Partial<EditorStore> & MapConfigExtras
    const newSecondMap = c.secondMap ? { ...state.secondMap, ...c.secondMap } : state.secondMap
    const zoom = typeof c.zoom === 'number' ? c.zoom : null
    const secondZoom = typeof c.secondMapZoom === 'number' ? c.secondMapZoom : null
    return {
      ...state,
      styleId: c.styleId ?? state.styleId,
      paletteId: c.paletteId ?? state.paletteId,
      customPaletteBase: c.customPaletteBase ?? state.customPaletteBase,
      customPalette: c.customPalette ?? state.customPalette,
      streetLabelsVisible: c.streetLabelsVisible ?? state.streetLabelsVisible,
      posterDarkMode: c.posterDarkMode ?? state.posterDarkMode,
      maskKey: c.maskKey ?? state.maskKey,
      marker: c.marker ?? state.marker,
      secondMarker: c.secondMarker ?? state.secondMarker,
      secondMap: secondZoom != null
        ? { ...newSecondMap, pendingCenter: { lng: state.secondMap.viewState.lng, lat: state.secondMap.viewState.lat, zoom: secondZoom } }
        : newSecondMap,
      shapeConfig: c.shapeConfig ?? state.shapeConfig,
      layoutId: c.layoutId ?? state.layoutId,
      innerMarginMm: c.innerMarginMm ?? state.innerMarginMm,
      decorationSvgUrl: c.decorationSvgUrl ?? null,
      orientation: c.orientation ?? state.orientation,
      textBlocks: c.textBlocks ?? state.textBlocks,
      splitMode: c.splitMode ?? state.splitMode,
      splitPhotoZone: c.splitPhotoZone ?? state.splitPhotoZone,
      splitPhoto: c.splitPhoto ?? state.splitPhoto,
      pendingCenter: zoom != null
        ? { lng: state.viewState.lng, lat: state.viewState.lat, zoom }
        : state.pendingCenter,
    }
  })

  return () => {
    useEditorStore.setState((state) => ({
      ...state,
      ...snapshot,
    }))
  }
}
