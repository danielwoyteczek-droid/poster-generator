'use client'

import { useEffect, useState } from 'react'
import { MAP_PALETTES, type MapPalette, type MapPaletteColors } from '@/lib/map-palettes'

interface PaletteRow {
  id: string
  name: string
  description: string | null
  colors: MapPaletteColors
  display_order: number
}

/**
 * Module-level cache so the same fetch isn't repeated on every hook mount.
 * If the network call fails we keep the hardcoded MAP_PALETTES as a safety
 * net, but still update the cache when the DB is reachable later.
 */
let cache: MapPalette[] | null = null
let inflight: Promise<MapPalette[]> | null = null

function rowToPalette(row: PaletteRow): MapPalette {
  const base = MAP_PALETTES[0].colors
  return {
    id: row.id,
    label: row.name,
    description: row.description ?? '',
    colors: { ...base, ...row.colors },
  }
}

async function loadOnce(): Promise<MapPalette[]> {
  if (cache) return cache
  if (inflight) return inflight
  // Bypass the HTTP cache so a freshly-published palette from the admin UI
  // shows up in the editor immediately after invalidateMapPalettesCache().
  inflight = fetch('/api/palettes', { cache: 'no-store' })
    .then((r) => r.json())
    .then((d) => {
      const rows = (d.palettes ?? []) as PaletteRow[]
      cache = rows.length > 0 ? rows.map(rowToPalette) : [...MAP_PALETTES]
      inflight = null
      return cache as MapPalette[]
    })
    .catch(() => {
      inflight = null
      // DB unreachable — fall back to the hardcoded set so the editor still works
      return [...MAP_PALETTES]
    })
  return inflight
}

export function invalidateMapPalettesCache() {
  cache = null
  inflight = null
}

/**
 * Returns the warm palette cache synchronously (or null if not yet loaded).
 * Intended for non-React consumers like the style loader and export pipeline
 * — they still work without it, but benefit from the admin-edited set when
 * it's already been fetched by the editor.
 */
export function getCachedPalettes(): MapPalette[] | null {
  return cache
}

/**
 * Return the list of palettes available to the editor.
 *
 * The hook always renders a defined list — initially the hardcoded
 * MAP_PALETTES, then the DB-driven set once the fetch resolves. That keeps
 * the editor usable on the first paint.
 */
export function useMapPalettes(): { palettes: MapPalette[]; loaded: boolean } {
  const [palettes, setPalettes] = useState<MapPalette[]>(() => cache ?? [...MAP_PALETTES])
  const [loaded, setLoaded] = useState(() => cache !== null)

  useEffect(() => {
    if (cache) return
    loadOnce().then((p) => {
      setPalettes(p)
      setLoaded(true)
    })
  }, [])

  return { palettes, loaded }
}

/**
 * Resolve a palette by id, preferring DB over hardcoded. Falls back to the
 * first available palette if the id is unknown.
 */
export async function resolvePaletteById(id: string): Promise<MapPalette | null> {
  if (id === 'original' || id === 'custom') return null
  const palettes = await loadOnce()
  return palettes.find((p) => p.id === id) ?? palettes[0] ?? null
}
