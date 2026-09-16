'use client'

// PROJ-56: Generator-Zustand eines Presets laden und abfragen, solange
// Bilder offen sind. Läuft auch nach Verlassen und Wiederkommen weiter,
// weil der Stand serverseitig liegt.

import { useCallback, useEffect, useRef, useState } from 'react'
import { imageGeneratorApi } from '@/lib/image-generator/api'
import { hasOpenImages } from '@/lib/image-generator/helpers'
import type { GeneratorState } from '@/lib/image-generator/types'

export const POLL_INTERVAL_MS = 4000

export function useImageGeneratorState(presetId: string | null) {
  const [state, setState] = useState<GeneratorState | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const requestId = useRef(0)

  const refresh = useCallback(async () => {
    if (!presetId) return
    const id = ++requestId.current
    try {
      const next = await imageGeneratorApi.getState(presetId)
      if (id !== requestId.current) return
      setState(next)
      setError(null)
    } catch (e) {
      if (id !== requestId.current) return
      setError(e instanceof Error ? e.message : 'Laden fehlgeschlagen')
    }
  }, [presetId])

  useEffect(() => {
    setState(null)
    setError(null)
    if (!presetId) return
    setLoading(true)
    refresh().finally(() => setLoading(false))
  }, [presetId, refresh])

  const polling = Boolean(state && hasOpenImages(state.images))
  useEffect(() => {
    if (!polling) return
    const t = setInterval(refresh, POLL_INTERVAL_MS)
    return () => clearInterval(t)
  }, [polling, refresh])

  return { state, setState, loading, error, refresh, polling }
}
