import type { MapPalette, MapPaletteColors } from './map-palettes'

type Role =
  | 'background'
  | 'land'
  | 'water'
  | 'road'
  | 'building'
  | 'border'
  | 'label-road'
  | 'label-water'
  | 'label-place'
  | null

interface Layer {
  id: string
  type: string
  'source-layer'?: string
  layout?: Record<string, unknown>
  paint?: Record<string, unknown>
  [key: string]: unknown
}

interface Style {
  layers: Layer[]
  [key: string]: unknown
}

function detectRole(layer: Layer): Role {
  const type = layer.type
  const src = layer['source-layer']

  if (type === 'background') return 'background'
  if (src === 'water' && type === 'fill') return 'water'
  if (src === 'waterway' && type === 'line') return 'water'
  if ((src === 'landcover' || src === 'landuse' || src === 'park') && type === 'fill') return 'land'
  if (src === 'transportation' && (type === 'line' || type === 'fill')) return 'road'
  if (src === 'boundary' && type === 'line') return 'border'
  if (src === 'building' && type === 'fill') return 'building'

  if (type === 'symbol') {
    if (src === 'transportation_name') return 'label-road'
    if (src === 'water_name' || src === 'waterway') return 'label-water'
    if (src === 'place' || src === 'park') return 'label-place'
  }

  return null
}

function setPaint(layer: Layer, key: string, value: unknown): void {
  layer.paint = { ...(layer.paint ?? {}), [key]: value }
}

function applyRoleColor(layer: Layer, role: Exclude<Role, null>, palette: MapPalette): void {
  const c = palette.colors
  switch (role) {
    case 'background':
      setPaint(layer, 'background-color', c.background)
      break
    case 'land':
      setPaint(layer, 'fill-color', c.land)
      setPaint(layer, 'fill-opacity', 1)
      break
    case 'water':
      if (layer.type === 'fill') setPaint(layer, 'fill-color', c.water)
      else if (layer.type === 'line') setPaint(layer, 'line-color', c.water)
      break
    case 'road':
      if (layer.type === 'fill') setPaint(layer, 'fill-color', c.road)
      else if (layer.type === 'line') setPaint(layer, 'line-color', c.road)
      break
    case 'building':
      setPaint(layer, 'fill-color', c.building)
      if (layer.paint && 'fill-outline-color' in layer.paint) {
        setPaint(layer, 'fill-outline-color', c.building)
      }
      break
    case 'border':
      setPaint(layer, 'line-color', c.border)
      break
    case 'label-road':
    case 'label-water':
    case 'label-place':
      setPaint(layer, 'text-color', c.label)
      if (layer.paint && 'text-halo-color' in layer.paint) {
        setPaint(layer, 'text-halo-color', c.labelHalo)
      }
      break
  }
}

export interface TransformOptions {
  palette: MapPalette | null
  streetLabelsVisible?: boolean
  placeLabelsVisible?: boolean
  /** Two-letter MapTiler locale (de, en, fr, es, it). Used to rewrite every
   *  label's `text-field` so labels prefer the locale-specific name field
   *  (e.g. `name:de`) over the style's hardcoded fallback. */
  locale?: string
}

/**
 * Deep-clone the base style and, if a palette is supplied, apply its
 * colours to every layer whose role we can identify. When palette is
 * null the layout keeps its native colours.
 *
 * Additional transforms (always applied regardless of palette):
 *  - `streetLabelsVisible`: toggles `label-road` (transportation_name) visibility
 *  - `placeLabelsVisible`: toggles `label-place` (place / park / water_name) visibility
 *  - `locale`: rewrites every symbol layer's `text-field` to a locale-aware
 *    coalesce — `name:<locale>` → `name:en` → `name`
 *
 * Label injection: if the source style ships without road or place label
 * layers (Minimal / Detail / Tusche / BW variants), we synthesise a default
 * symbol layer at runtime so the customer's toggle has something to flip.
 * This keeps the JSON files free of per-style label duplication.
 */
export function transformStyle(baseStyle: Style, opts: TransformOptions): Style {
  const style: Style = structuredClone(baseStyle)
  const streetLabels = opts.streetLabelsVisible ?? false
  const placeLabels = opts.placeLabelsVisible ?? true
  const locale = (opts.locale ?? '').toLowerCase().slice(0, 2)

  const localeKey = locale && locale !== 'en' ? `name:${locale}` : null
  const textField = localeKey
    ? ['coalesce', ['get', localeKey], ['get', 'name:en'], ['get', 'name']]
    : ['coalesce', ['get', 'name:en'], ['get', 'name']]

  let hasRoadLabels = false
  let hasPlaceLabels = false

  for (const layer of style.layers as Layer[]) {
    const role = detectRole(layer)
    if (role && opts.palette) applyRoleColor(layer, role, opts.palette)

    if (role === 'label-road') {
      hasRoadLabels = true
      layer.layout = {
        ...(layer.layout ?? {}),
        visibility: streetLabels ? 'visible' : 'none',
      }
    }
    if (role === 'label-place' || role === 'label-water') {
      if (role === 'label-place') hasPlaceLabels = true
      layer.layout = {
        ...(layer.layout ?? {}),
        visibility: placeLabels ? 'visible' : 'none',
      }
    }

    // Locale-aware text-field rewrite for every symbol layer that has one.
    // Skipped when locale is 'en' or empty (existing styles already fall back
    // to `name:en` first via their own coalesce expressions).
    if (localeKey && layer.type === 'symbol') {
      const layout = layer.layout as Record<string, unknown> | undefined
      if (layout && 'text-field' in layout) {
        layer.layout = {
          ...layout,
          'text-field': textField,
        }
      }
    }
  }

  const textColor = opts.palette?.colors.label ?? '#111111'
  const haloColor = opts.palette?.colors.labelHalo ?? '#ffffff'

  // Inject default road label layer when the style ships none and the
  // customer wants street names visible. Mirrors the Klassisch road-label
  // setup (line-placed, road class filter) so it looks consistent.
  if (!hasRoadLabels && streetLabels) {
    style.layers.push({
      id: 'petite-injected-road-labels',
      type: 'symbol',
      source: 'maptiler_planet',
      'source-layer': 'transportation_name',
      minzoom: 14,
      filter: ['in', 'class', 'primary', 'secondary', 'tertiary', 'trunk', 'minor', 'service'],
      layout: {
        'symbol-placement': 'line',
        'text-field': textField,
        'text-font': ['Noto Sans Bold'],
        'text-rotation-alignment': 'map',
        'text-size': { stops: [[13, 11], [16, 14]] },
        visibility: 'visible',
      },
      paint: {
        'text-color': textColor,
        'text-halo-color': haloColor,
        'text-halo-width': 2,
      },
    } as Layer)
  }

  // Inject default place label layer when the style ships none and the
  // customer wants place names visible. City > town > village hierarchy
  // surfaces the most recognisable names first.
  if (!hasPlaceLabels && placeLabels) {
    style.layers.push({
      id: 'petite-injected-place-labels',
      type: 'symbol',
      source: 'maptiler_planet',
      'source-layer': 'place',
      minzoom: 5,
      filter: ['in', 'class', 'city', 'town', 'village', 'suburb', 'neighbourhood'],
      layout: {
        'symbol-sort-key': ['to-number', ['get', 'rank']],
        'text-field': textField,
        'text-font': ['Noto Sans Bold'],
        'text-max-width': 10,
        'text-size': ['interpolate', ['linear'], ['zoom'], 5, 11, 9, 16, 12, 20],
        'text-transform': 'none',
        visibility: 'visible',
      },
      paint: {
        'text-color': textColor,
        'text-halo-color': haloColor,
        'text-halo-width': 2,
      },
    } as Layer)
  }

  return style
}

/**
 * Walk every layer and extract a representative colour for each palette role,
 * so we can seed the "Eigene Farbe" picker from whatever the active layout
 * looks like in its native (Original) state. Later layers overwrite earlier
 * ones — so the visually dominant variant of a role wins (e.g. major roads
 * are drawn last and end up as the road colour, instead of paths).
 */
export function extractPaletteFromStyle(style: Style): MapPaletteColors {
  const colors: MapPaletteColors = {
    background: '#ffffff',
    land: '#eeeeee',
    water: '#aac8e2',
    road: '#ffffff',
    building: '#dddddd',
    border: '#888888',
    label: '#222222',
    labelHalo: '#ffffff',
  }

  const readString = (paint: Record<string, unknown> | undefined, key: string): string | null => {
    if (!paint) return null
    const v = paint[key]
    return typeof v === 'string' && v.startsWith('#') ? v : null
  }

  for (const layer of style.layers as Layer[]) {
    const role = detectRole(layer)
    if (!role) continue
    const paint = layer.paint as Record<string, unknown> | undefined
    switch (role) {
      case 'background': {
        const c = readString(paint, 'background-color')
        if (c) colors.background = c
        break
      }
      case 'water': {
        const c = layer.type === 'fill' ? readString(paint, 'fill-color') : readString(paint, 'line-color')
        if (c) colors.water = c
        break
      }
      case 'land': {
        const c = readString(paint, 'fill-color')
        if (c) colors.land = c
        break
      }
      case 'road': {
        const c = layer.type === 'line' ? readString(paint, 'line-color') : readString(paint, 'fill-color')
        if (c) colors.road = c
        break
      }
      case 'building': {
        const c = readString(paint, 'fill-color')
        if (c) colors.building = c
        break
      }
      case 'border': {
        const c = readString(paint, 'line-color')
        if (c) colors.border = c
        break
      }
      case 'label-road':
      case 'label-water':
      case 'label-place': {
        const text = readString(paint, 'text-color')
        if (text) colors.label = text
        const halo = readString(paint, 'text-halo-color')
        if (halo) colors.labelHalo = halo
        break
      }
    }
  }

  return colors
}
