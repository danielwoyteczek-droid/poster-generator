import { MAP_PALETTES, paletteFromBaseColor, type MapPalette, type MapPaletteColors } from './map-palettes'
import { getLayout } from './map-layouts'
import { transformStyle } from './map-style-transformer'

const cachedBases = new Map<string, unknown>()
const pendingBases = new Map<string, Promise<unknown>>()

async function fetchLayoutStyle(layoutId: string): Promise<unknown> {
  const existing = cachedBases.get(layoutId)
  if (existing) return existing
  const pending = pendingBases.get(layoutId)
  if (pending) return pending

  const layout = getLayout(layoutId)
  const promise = fetch(layout.file).then(async (res) => {
    if (!res.ok) throw new Error(`Layout fetch failed (${layoutId}): ${res.status}`)
    const json = await res.json()
    cachedBases.set(layoutId, json)
    return json
  })
  pendingBases.set(layoutId, promise)
  return promise
}

function injectApiKey(style: unknown, apiKey: string): unknown {
  const cloned = structuredClone(style) as Record<string, unknown>
  if (cloned.sources && typeof cloned.sources === 'object') {
    const sources = cloned.sources as Record<string, Record<string, unknown>>
    for (const source of Object.values(sources)) {
      if (typeof source.url === 'string') {
        source.url = source.url.replace('{key}', apiKey)
      }
      if (typeof source.tiles === 'object' && Array.isArray(source.tiles)) {
        source.tiles = (source.tiles as string[]).map((t) => t.replace('{key}', apiKey))
      }
    }
  }
  if (typeof cloned.glyphs === 'string') {
    cloned.glyphs = cloned.glyphs.replace('{key}', apiKey)
  }
  if (typeof cloned.sprite === 'string') {
    cloned.sprite = cloned.sprite.replace('{key}', apiKey)
  }
  return cloned
}

export function resolvePalette(
  paletteId: string,
  customBase: string | null,
  customPalette?: MapPaletteColors | null,
): MapPalette {
  if (paletteId === 'custom') {
    const basis = paletteFromBaseColor(customBase ?? '#84c5a6')
    if (customPalette) {
      return { ...basis, colors: { ...basis.colors, ...customPalette } }
    }
    return basis
  }
  const palette = MAP_PALETTES.find((p) => p.id === paletteId)
  return palette ?? MAP_PALETTES[0]
}

export interface PetiteStyleOptions {
  layoutId: string
  paletteId: string
  customPaletteBase: string | null
  customPalette?: MapPaletteColors | null
  streetLabelsVisible: boolean
  apiKey: string
}

export async function buildPetiteStyle(opts: PetiteStyleOptions): Promise<unknown> {
  const base = await fetchLayoutStyle(opts.layoutId)
  const withKey = injectApiKey(base, opts.apiKey)
  const palette = resolvePalette(opts.paletteId, opts.customPaletteBase, opts.customPalette)
  return transformStyle(withKey as Parameters<typeof transformStyle>[0], {
    palette,
    streetLabelsVisible: opts.streetLabelsVisible,
  })
}
