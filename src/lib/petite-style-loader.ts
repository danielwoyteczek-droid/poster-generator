import { MAP_PALETTES, paletteFromBaseColor, type MapPalette, type MapPaletteColors } from './map-palettes'
import { transformStyle } from './map-style-transformer'

export const PETITE_BASE_STYLE_ID = 'petite-base'

let cachedBase: unknown | null = null
let cachedBasePromise: Promise<unknown> | null = null

async function fetchBaseStyle(): Promise<unknown> {
  if (cachedBase) return cachedBase
  if (cachedBasePromise) return cachedBasePromise
  cachedBasePromise = fetch('/map-styles/base.json').then(async (res) => {
    if (!res.ok) throw new Error(`Base style fetch failed: ${res.status}`)
    const json = await res.json()
    cachedBase = json
    return json
  })
  return cachedBasePromise
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
  return cloned
}

export function resolvePalette(
  paletteId: string,
  customBase: string | null,
  customPalette?: MapPaletteColors | null,
): MapPalette {
  if (paletteId === 'custom') {
    // Prefer explicit full palette, fall back to base-colour heuristic.
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
  paletteId: string
  customPaletteBase: string | null
  customPalette?: MapPaletteColors | null
  streetLabelsVisible: boolean
  apiKey: string
}

export async function buildPetiteStyle(opts: PetiteStyleOptions): Promise<unknown> {
  const base = await fetchBaseStyle()
  const withKey = injectApiKey(base, opts.apiKey)
  const palette = resolvePalette(opts.paletteId, opts.customPaletteBase, opts.customPalette)
  return transformStyle(withKey as Parameters<typeof transformStyle>[0], {
    palette,
    streetLabelsVisible: opts.streetLabelsVisible,
  })
}

export function isPetiteStyle(styleId: string): boolean {
  return styleId === PETITE_BASE_STYLE_ID
}
