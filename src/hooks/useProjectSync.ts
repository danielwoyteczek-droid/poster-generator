'use client'

import { useEffect, useRef, useState } from 'react'
import { useEditorStore, type EditorConfig } from '@/hooks/useEditorStore'
import { useStarMapStore } from '@/hooks/useStarMapStore'
import { usePhotoEditorStore } from '@/hooks/usePhotoEditorStore'
import { useAuth } from '@/hooks/useAuth'

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

export type PosterType = 'map' | 'star-map' | 'photo'

/** Per-poster-type localStorage keys for guest drafts. The map key is kept as
 *  the original `poster-generator-draft` so existing browsers don't lose any
 *  in-progress design after this migration. */
const LS_KEYS: Record<PosterType, string> = {
  'map': 'poster-generator-draft',
  'star-map': 'poster-generator-draft-starmap',
  'photo': 'poster-generator-draft-photo',
}

/**
 * Returns the per-poster-type config blob that should be persisted into
 * `projects.config_json`. Each editor owns its own store(s); this is where
 * the saved-poster format crystallises. Bumping any field here means an
 * additive migration to the loader below — drop nothing, only add.
 */
function getConfig(posterType: PosterType): Record<string, unknown> {
  const editor = useEditorStore.getState()
  if (posterType === 'star-map') {
    const sm = useStarMapStore.getState()
    return {
      lat: sm.lat,
      lng: sm.lng,
      locationName: sm.locationName,
      datetime: sm.datetime,
      posterBgColor: sm.posterBgColor,
      skyBgColor: sm.skyBgColor,
      starColor: sm.starColor,
      showConstellations: sm.showConstellations,
      showMilkyWay: sm.showMilkyWay,
      showSun: sm.showSun,
      showMoon: sm.showMoon,
      showPlanets: sm.showPlanets,
      showCompass: sm.showCompass,
      showGrid: sm.showGrid,
      gridOpacity: sm.gridOpacity,
      starDensity: sm.starDensity,
      textureKey: sm.textureKey,
      textureOpacity: sm.textureOpacity,
      frameConfig: sm.frameConfig,
      printFormat: editor.printFormat,
      textBlocks: editor.textBlocks,
    }
  }
  if (posterType === 'photo') {
    const ph = usePhotoEditorStore.getState()
    return {
      word: ph.word,
      slots: ph.slots,
      wordWidth: ph.wordWidth,
      wordX: ph.wordX,
      wordY: ph.wordY,
      orientation: ph.orientation,
      maskFontKey: ph.maskFontKey,
      defaultSlotColor: ph.defaultSlotColor,
      layoutMode: ph.layoutMode,
      // Single-photo mode (PROJ-32): one uploaded photo + mask + crop.
      // Persisting this means a customer can refresh the editor and not
      // lose their single-photo poster mid-design.
      singlePhoto: ph.singlePhoto,
      singlePhotoMaskKey: ph.singlePhotoMaskKey,
      printFormat: editor.printFormat,
      textBlocks: editor.textBlocks,
    }
  }
  return {
    viewState: editor.viewState,
    styleId: editor.styleId,
    paletteId: editor.paletteId,
    customPaletteBase: editor.customPaletteBase,
    customPalette: editor.customPalette,
    streetLabelsVisible: editor.streetLabelsVisible,
    posterDarkMode: editor.posterDarkMode,
    maskKey: editor.maskKey,
    printFormat: editor.printFormat,
    orientation: editor.orientation,
    marker: editor.marker,
    secondMarker: editor.secondMarker,
    secondMap: {
      enabled: editor.secondMap.enabled,
      styleId: editor.secondMap.styleId,
      paletteId: editor.secondMap.paletteId,
      customPaletteBase: editor.secondMap.customPaletteBase,
      customPalette: editor.secondMap.customPalette,
      viewState: editor.secondMap.viewState,
    },
    shapeConfig: editor.shapeConfig,
    layoutId: editor.layoutId,
    innerMarginMm: editor.innerMarginMm,
    textBlocks: editor.textBlocks,
    locationName: editor.locationName,
    photos: editor.photos,
    splitMode: editor.splitMode,
    splitPhoto: editor.splitPhoto,
    splitPhotoZone: editor.splitPhotoZone,
  }
}

function applyConfig(posterType: PosterType, config: Record<string, unknown>): void {
  if (posterType === 'star-map') {
    const sm = useStarMapStore.getState()
    const c = config as {
      lat?: number; lng?: number; locationName?: string; datetime?: string
      posterBgColor?: string; skyBgColor?: string; starColor?: string
      showConstellations?: boolean; showMilkyWay?: boolean
      showSun?: boolean; showMoon?: boolean; showPlanets?: boolean
      showCompass?: boolean
      showGrid?: boolean; gridOpacity?: number
      starDensity?: number
      textureKey?: string | null; textureOpacity?: number
      frameConfig?: typeof sm.frameConfig
      printFormat?: EditorConfig['printFormat']
      textBlocks?: EditorConfig['textBlocks']
    }
    if (typeof c.lat === 'number' && typeof c.lng === 'number') {
      sm.setLocation(c.lat, c.lng, c.locationName ?? sm.locationName)
    }
    if (c.datetime) sm.setDatetime(c.datetime)
    if (c.posterBgColor) sm.setPosterBgColor(c.posterBgColor)
    if (c.skyBgColor) sm.setSkyBgColor(c.skyBgColor)
    if (c.starColor) sm.setStarColor(c.starColor)
    if (c.showConstellations !== undefined) sm.setShowConstellations(c.showConstellations)
    if (c.showMilkyWay !== undefined) sm.setShowMilkyWay(c.showMilkyWay)
    if (c.showSun !== undefined) sm.setShowSun(c.showSun)
    if (c.showMoon !== undefined) sm.setShowMoon(c.showMoon)
    if (c.showPlanets !== undefined) sm.setShowPlanets(c.showPlanets)
    if (c.showCompass !== undefined) sm.setShowCompass(c.showCompass)
    if (c.showGrid !== undefined) sm.setShowGrid(c.showGrid)
    if (c.gridOpacity !== undefined) sm.setGridOpacity(c.gridOpacity)
    if (c.starDensity !== undefined) sm.setStarDensity(c.starDensity)
    if (c.textureKey !== undefined) sm.setTextureKey(c.textureKey)
    if (c.textureOpacity !== undefined) sm.setTextureOpacity(c.textureOpacity)
    if (c.frameConfig?.outer) sm.setOuter(c.frameConfig.outer)
    if (c.frameConfig?.innerFrame) sm.setInnerFrame(c.frameConfig.innerFrame)
    if (c.frameConfig?.outerFrame) sm.setOuterFrame(c.frameConfig.outerFrame)
    if (c.printFormat) useEditorStore.setState({ printFormat: c.printFormat })
    if (c.textBlocks) useEditorStore.setState({ textBlocks: c.textBlocks })
    return
  }
  if (posterType === 'photo') {
    const c = config as Partial<{
      word: string; slots: ReturnType<typeof usePhotoEditorStore.getState>['slots']
      wordWidth: number; wordX: number; wordY: number
      orientation: ReturnType<typeof usePhotoEditorStore.getState>['orientation']
      maskFontKey: ReturnType<typeof usePhotoEditorStore.getState>['maskFontKey']
      defaultSlotColor: string
      layoutMode: ReturnType<typeof usePhotoEditorStore.getState>['layoutMode']
      singlePhoto: ReturnType<typeof usePhotoEditorStore.getState>['singlePhoto']
      singlePhotoMaskKey: ReturnType<typeof usePhotoEditorStore.getState>['singlePhotoMaskKey']
      printFormat: EditorConfig['printFormat']
      textBlocks: EditorConfig['textBlocks']
    }>
    usePhotoEditorStore.setState((state) => ({
      ...state,
      word: typeof c.word === 'string' ? c.word : state.word,
      slots: Array.isArray(c.slots) ? c.slots : state.slots,
      wordWidth: typeof c.wordWidth === 'number' ? c.wordWidth : state.wordWidth,
      wordX: typeof c.wordX === 'number' ? c.wordX : state.wordX,
      wordY: typeof c.wordY === 'number' ? c.wordY : state.wordY,
      orientation: c.orientation ?? state.orientation,
      maskFontKey: c.maskFontKey ?? state.maskFontKey,
      defaultSlotColor: c.defaultSlotColor ?? state.defaultSlotColor,
      layoutMode: c.layoutMode ?? state.layoutMode,
      // Distinguish "key absent in saved config" (legacy, keep current
      // state) from "key explicitly null" (customer removed the photo).
      singlePhoto: 'singlePhoto' in c ? (c.singlePhoto ?? null) : state.singlePhoto,
      singlePhotoMaskKey: c.singlePhotoMaskKey ?? state.singlePhotoMaskKey,
    }))
    if (c.printFormat) useEditorStore.setState({ printFormat: c.printFormat })
    if (c.textBlocks) useEditorStore.setState({ textBlocks: c.textBlocks })
    return
  }
  useEditorStore.getState().loadFromConfig(config as Partial<EditorConfig>)
}

/** Picks a per-type fallback title when the customer hasn't named the
 *  project. Map → city name (`useEditorStore.locationName`), Star-Map →
 *  city name from its own store, Photo → the user-typed mask word. */
function getDefaultTitle(posterType: PosterType): string {
  if (posterType === 'star-map') {
    return useStarMapStore.getState().locationName || 'Mein Sternenposter'
  }
  if (posterType === 'photo') {
    const word = usePhotoEditorStore.getState().word
    return word ? `Foto-Poster „${word}"` : 'Mein Foto-Poster'
  }
  return useEditorStore.getState().locationName || 'Mein Poster'
}

export function useProjectSync(posterType: PosterType = 'map') {
  const { user } = useAuth()
  const projectId = useEditorStore((s) => s.projectId)
  const projectPosterType = useEditorStore((s) => s.projectPosterType)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const dirtyRef = useRef(false)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Mark dirty on changes to whichever store(s) the active editor reads from.
  useEffect(() => {
    const subs: Array<() => void> = []
    subs.push(useEditorStore.subscribe(() => { dirtyRef.current = true }))
    if (posterType === 'star-map') {
      subs.push(useStarMapStore.subscribe(() => { dirtyRef.current = true }))
    } else if (posterType === 'photo') {
      subs.push(usePhotoEditorStore.subscribe(() => { dirtyRef.current = true }))
    }
    return () => { subs.forEach((u) => u()) }
  }, [posterType])

  // Guest: restore from per-type localStorage on mount.
  useEffect(() => {
    if (user) return
    try {
      const raw = localStorage.getItem(LS_KEYS[posterType])
      if (raw) {
        const config = JSON.parse(raw) as Record<string, unknown>
        applyConfig(posterType, config)
      }
    } catch { /* ignore */ }
  }, [posterType]) // eslint-disable-line react-hooks/exhaustive-deps

  // Guest: auto-save to per-type localStorage (debounce 1s).
  useEffect(() => {
    if (user) return
    const writeDraft = () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      saveTimerRef.current = setTimeout(() => {
        try {
          localStorage.setItem(LS_KEYS[posterType], JSON.stringify(getConfig(posterType)))
        } catch { /* storage full — ignore */ }
      }, 1000)
    }
    const subs: Array<() => void> = []
    subs.push(useEditorStore.subscribe(writeDraft))
    if (posterType === 'star-map') {
      subs.push(useStarMapStore.subscribe(writeDraft))
    } else if (posterType === 'photo') {
      subs.push(usePhotoEditorStore.subscribe(writeDraft))
    }
    return () => {
      subs.forEach((u) => u())
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    }
  }, [user, posterType])

  // Logged-in: auto-save every 30s when dirty.
  useEffect(() => {
    if (!user) return
    const interval = setInterval(async () => {
      if (!dirtyRef.current) return
      await saveToCloud()
    }, 30_000)
    return () => clearInterval(interval)
  }, [user, projectId, posterType]) // eslint-disable-line react-hooks/exhaustive-deps

  // Logged-in: migrate per-type localStorage draft on first login.
  useEffect(() => {
    if (!user) return
    const draft = localStorage.getItem(LS_KEYS[posterType])
    if (!draft) return
    try {
      const config = JSON.parse(draft) as Record<string, unknown>
      fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: getDefaultTitle(posterType),
          location_name: useEditorStore.getState().locationName || '',
          config_json: config,
          poster_type: posterType,
        }),
      })
        .then((r) => r.json())
        .then((data) => {
          if (data.id) useEditorStore.getState().setSavedProject(data.id, posterType)
        })
        .catch(() => { /* ignore */ })
      localStorage.removeItem(LS_KEYS[posterType])
    } catch { /* ignore */ }
  }, [user, posterType]) // eslint-disable-line react-hooks/exhaustive-deps

  async function saveToCloud(title?: string): Promise<boolean> {
    setSaveStatus('saving')
    dirtyRef.current = false
    const config = getConfig(posterType)
    const resolvedTitle = title || getDefaultTitle(posterType)
    const locationName = useEditorStore.getState().locationName

    // Cross-editor protection: only PATCH the existing project if its saved
    // poster_type matches the current editor — otherwise the user has
    // switched editors and we'd overwrite an unrelated project.
    const canUpdateExisting = projectId !== null && projectPosterType === posterType

    try {
      if (canUpdateExisting) {
        const res = await fetch(`/api/projects/${projectId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: resolvedTitle, location_name: locationName, config_json: config, poster_type: posterType }),
        })
        if (!res.ok) throw new Error()
      } else {
        const res = await fetch('/api/projects', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: resolvedTitle, location_name: locationName, config_json: config, poster_type: posterType }),
        })
        if (!res.ok) throw new Error()
        const data = await res.json()
        useEditorStore.getState().setSavedProject(data.id, posterType)
      }
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus('idle'), 2000)
      return true
    } catch {
      setSaveStatus('error')
      setTimeout(() => setSaveStatus('idle'), 3000)
      return false
    }
  }

  const hasProject = projectId !== null && projectPosterType === posterType
  return { saveStatus, saveToCloud, hasProject, applyConfig }
}

/** Standalone exporter for one-shot loaders (ProjectCard) that don't sit in
 *  the editor render-tree and only want to dispatch a config to the right
 *  store. */
export const applyProjectConfig = applyConfig
