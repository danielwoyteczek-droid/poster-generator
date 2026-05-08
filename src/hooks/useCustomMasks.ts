'use client'

import { useEffect, useState } from 'react'
import { MAP_MASKS, type MapMaskDefinition } from '@/lib/map-masks'
import { parseShapeSvg, type ShapeDefinition } from '@/lib/mask-composer'

export interface CustomMaskRow {
  mask_key: string
  label: string
  mask_svg_url: string
  shape_viewbox: string | null
  shape_markup: string | null
  /** PROJ-35: per-mask customer visibility flag. Admin-only `useCustomMasks`
   *  consumers can read this to render an "internal/Admin-only" badge on
   *  non-public rows in the editor's mask picker. */
  is_public?: boolean
  /** PROJ-35: optional decoration SVG drawn over the map when this mask is
   *  selected. The editor auto-applies it via `setDecorationSvgUrl` on
   *  mask change. */
  decoration_svg_url?: string | null
  /** PROJ-38: visual transform editor — admin-set offsets (in viewBox units)
   *  applied at render time. Defaults 0/0/1 = no change. */
  transform_x?: number
  transform_y?: number
  transform_scale?: number
  /** PROJ-38 follow-up: per-mask decoration overlay offsets (in poster-unit
   *  space, i.e. A4 coords). Lets the admin nudge a decoration to line up
   *  with a custom-positioned mask. Defaults 0/0/1 = no change. */
  decoration_transform_x?: number
  decoration_transform_y?: number
  decoration_transform_scale?: number
}

// Cache shared across hook instances to avoid duplicate fetches
let cache: CustomMaskRow[] | null = null
let inflight: Promise<CustomMaskRow[]> | null = null

async function loadOnce(): Promise<CustomMaskRow[]> {
  if (cache) return cache
  if (inflight) return inflight
  inflight = fetch('/api/masks')
    .then((r) => r.json())
    .then((d) => {
      cache = d.masks ?? []
      inflight = null
      return cache as CustomMaskRow[]
    })
    .catch(() => {
      inflight = null
      return [] as CustomMaskRow[]
    })
  return inflight
}

export function invalidateCustomMasksCache() {
  cache = null
  inflight = null
}

function toMaskDefinition(row: CustomMaskRow): MapMaskDefinition {
  let shape: ShapeDefinition | undefined
  if (row.shape_viewbox && row.shape_markup) {
    const parts = row.shape_viewbox.split(/\s+/)
    const width = parseFloat(parts[2] ?? '0')
    const height = parseFloat(parts[3] ?? '0')
    if (width > 0 && height > 0) {
      // PROJ-38: apply admin-set transform by wrapping the markup in a
      // transform-group at parse time. The composer treats this as opaque
      // markup and renders it inside its own fill-group, so the transform
      // composes correctly with layout-scaling on top.
      const tx = row.transform_x ?? 0
      const ty = row.transform_y ?? 0
      const ts = row.transform_scale ?? 1
      const hasTransform = tx !== 0 || ty !== 0 || ts !== 1
      const markup = hasTransform
        ? `<g transform="translate(${tx} ${ty}) scale(${ts})">${row.shape_markup}</g>`
        : row.shape_markup
      shape = { viewBox: row.shape_viewbox, width, height, markup }
    }
  }
  const decorationTransform = {
    x: row.decoration_transform_x ?? 0,
    y: row.decoration_transform_y ?? 0,
    scale: row.decoration_transform_scale ?? 1,
  }
  return {
    key: row.mask_key as MapMaskDefinition['key'],
    label: row.label,
    svgPath: row.mask_svg_url,
    shape,
    isPublic: row.is_public ?? false,
    decorationSvgUrl: row.decoration_svg_url ?? null,
    decorationTransform,
  }
}

export function useCustomMasks() {
  const [masks, setMasks] = useState<MapMaskDefinition[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    loadOnce().then((rows) => {
      setMasks(rows.map(toMaskDefinition))
      setLoaded(true)
    })
  }, [])

  return { masks, loaded }
}

/**
 * Resolve a mask by key, checking both built-in and custom masks. Async because
 * custom masks are loaded from the network (with in-memory cache).
 *
 * PROJ-35: when the key isn't in the public cache (e.g. customer applied an
 * old preset referencing a now non-public mask), fall back to a single-mask
 * lookup endpoint that bypasses the is_public filter. Without this, the
 * customer would see an empty fallback mask instead of the designed shape.
 */
export async function resolveMask(key: string): Promise<MapMaskDefinition | null> {
  const builtIn = (MAP_MASKS as Record<string, MapMaskDefinition>)[key]
  if (builtIn) return builtIn
  const rows = await loadOnce()
  let row = rows.find((m) => m.mask_key === key)
  if (!row) {
    try {
      const res = await fetch(`/api/masks/${encodeURIComponent(key)}`)
      if (res.ok) {
        const data = await res.json()
        if (data?.mask) row = data.mask as CustomMaskRow
      }
    } catch { /* ignore — falls through to null */ }
  }
  if (!row) return null
  const def = toMaskDefinition(row)
  // If DB didn't have pre-parsed shape, fetch the SVG and parse on the fly
  if (!def.shape && row.mask_svg_url) {
    try {
      const svg = await fetch(row.mask_svg_url).then((r) => r.text())
      const parsed = parseShapeSvg(svg)
      if (parsed) def.shape = parsed
    } catch { /* ignore */ }
  }
  return def
}
