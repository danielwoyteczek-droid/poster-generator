import { useEditorStore, type EditorStore } from '@/hooks/useEditorStore'
import { useStarMapStore } from '@/hooks/useStarMapStore'

interface PresetLike {
  poster_type: 'map' | 'star-map'
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
      posterBgColor?: string; skyBgColor?: string; starColor?: string
      showConstellations?: boolean; showMilkyWay?: boolean
      showSun?: boolean; showMoon?: boolean; showPlanets?: boolean
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
      posterBgColor: starMap.posterBgColor,
      skyBgColor: starMap.skyBgColor,
      starColor: starMap.starColor,
      showConstellations: starMap.showConstellations,
      showMilkyWay: starMap.showMilkyWay,
      showSun: starMap.showSun,
      showMoon: starMap.showMoon,
      showPlanets: starMap.showPlanets,
      frameConfig: starMap.frameConfig,
      textBlocks: editor.textBlocks,
    }

    if (s.posterBgColor) starMap.setPosterBgColor(s.posterBgColor)
    if (s.skyBgColor) starMap.setSkyBgColor(s.skyBgColor)
    if (s.starColor) starMap.setStarColor(s.starColor)
    if (s.showConstellations !== undefined) starMap.setShowConstellations(s.showConstellations)
    if (s.showMilkyWay !== undefined) starMap.setShowMilkyWay(s.showMilkyWay)
    if (s.showSun !== undefined) starMap.setShowSun(s.showSun)
    if (s.showMoon !== undefined) starMap.setShowMoon(s.showMoon)
    if (s.showPlanets !== undefined) starMap.setShowPlanets(s.showPlanets)
    if (s.frameConfig?.outer) starMap.setOuter(s.frameConfig.outer)
    if (s.frameConfig?.innerFrame) starMap.setInnerFrame(s.frameConfig.innerFrame)
    if (s.frameConfig?.outerFrame) starMap.setOuterFrame(s.frameConfig.outerFrame)
    if (s.textBlocks) useEditorStore.setState({ textBlocks: s.textBlocks as never })

    return () => {
      useStarMapStore.setState({
        posterBgColor: snapshot.posterBgColor,
        skyBgColor: snapshot.skyBgColor,
        starColor: snapshot.starColor,
        showConstellations: snapshot.showConstellations,
        showMilkyWay: snapshot.showMilkyWay,
        showSun: snapshot.showSun,
        showMoon: snapshot.showMoon,
        showPlanets: snapshot.showPlanets,
        frameConfig: snapshot.frameConfig,
      })
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
    maskKey: editor.maskKey,
    marker: editor.marker,
    secondMarker: editor.secondMarker,
    secondMap: editor.secondMap,
    shapeConfig: editor.shapeConfig,
    textBlocks: editor.textBlocks,
    splitMode: editor.splitMode,
    splitPhotoZone: editor.splitPhotoZone,
    splitPhoto: editor.splitPhoto,
    pendingCenter: editor.pendingCenter,
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
      maskKey: c.maskKey ?? state.maskKey,
      marker: c.marker ?? state.marker,
      secondMarker: c.secondMarker ?? state.secondMarker,
      secondMap: secondZoom != null
        ? { ...newSecondMap, pendingCenter: { lng: state.secondMap.viewState.lng, lat: state.secondMap.viewState.lat, zoom: secondZoom } }
        : newSecondMap,
      shapeConfig: c.shapeConfig ?? state.shapeConfig,
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
