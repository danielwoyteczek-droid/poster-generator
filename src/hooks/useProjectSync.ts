'use client'

import { useEffect, useRef, useState } from 'react'
import { useEditorStore, type EditorConfig } from './useEditorStore'
import { useAuth } from './useAuth'

const LS_KEY = 'poster-generator-draft'

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

function getConfig(): EditorConfig {
  const s = useEditorStore.getState()
  return {
    viewState: s.viewState,
    styleId: s.styleId,
    paletteId: s.paletteId,
    customPaletteBase: s.customPaletteBase,
    streetLabelsVisible: s.streetLabelsVisible,
    maskKey: s.maskKey,
    printFormat: s.printFormat,
    marker: s.marker,
    secondMarker: s.secondMarker,
    secondMap: { enabled: s.secondMap.enabled, styleId: s.secondMap.styleId, viewState: s.secondMap.viewState },
    shapeConfig: s.shapeConfig,
    textBlocks: s.textBlocks,
    locationName: s.locationName,
    photos: s.photos,
    splitPhoto: s.splitPhoto,
    splitPhotoSide: s.splitPhotoSide,
  }
}

export function useProjectSync() {
  const { user } = useAuth()
  const { projectId, locationName, setProjectId, loadFromConfig } = useEditorStore()
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const dirtyRef = useRef(false)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Mark dirty on any store change
  useEffect(() => {
    const unsub = useEditorStore.subscribe(() => { dirtyRef.current = true })
    return () => unsub()
  }, [])

  // Guest: restore from localStorage on mount
  useEffect(() => {
    if (user) return
    try {
      const raw = localStorage.getItem(LS_KEY)
      if (raw) {
        const config = JSON.parse(raw) as Partial<EditorConfig>
        loadFromConfig(config)
      }
    } catch { /* ignore */ }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Guest: auto-save to localStorage (debounce 1s)
  useEffect(() => {
    if (user) return
    const unsub = useEditorStore.subscribe(() => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      saveTimerRef.current = setTimeout(() => {
        try {
          localStorage.setItem(LS_KEY, JSON.stringify(getConfig()))
        } catch { /* storage full — ignore */ }
      }, 1000)
    })
    return () => { unsub(); if (saveTimerRef.current) clearTimeout(saveTimerRef.current) }
  }, [user])

  // Logged-in: auto-save every 30s when dirty
  useEffect(() => {
    if (!user) return
    const interval = setInterval(async () => {
      if (!dirtyRef.current) return
      await saveToCloud()
    }, 30_000)
    return () => clearInterval(interval)
  }, [user, projectId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Logged-in: migrate localStorage draft on first login
  useEffect(() => {
    if (!user) return
    const draft = localStorage.getItem(LS_KEY)
    if (!draft) return
    try {
      const config = JSON.parse(draft) as Partial<EditorConfig>
      fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: config.locationName || 'Mein Poster',
          location_name: config.locationName || '',
          config_json: config,
        }),
      })
        .then((r) => r.json())
        .then((data) => { if (data.id) setProjectId(data.id) })
        .catch(() => { /* ignore */ })
      localStorage.removeItem(LS_KEY)
    } catch { /* ignore */ }
  }, [user]) // eslint-disable-line react-hooks/exhaustive-deps

  async function saveToCloud(title?: string): Promise<boolean> {
    setSaveStatus('saving')
    dirtyRef.current = false
    const config = getConfig()
    const resolvedTitle = title || locationName || 'Mein Poster'
    try {
      if (projectId) {
        const res = await fetch(`/api/projects/${projectId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: resolvedTitle, location_name: locationName, config_json: config }),
        })
        if (!res.ok) throw new Error()
      } else {
        const res = await fetch('/api/projects', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: resolvedTitle, location_name: locationName, config_json: config }),
        })
        if (!res.ok) throw new Error()
        const data = await res.json()
        setProjectId(data.id)
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

  return { saveStatus, saveToCloud, hasProject: !!projectId }
}
