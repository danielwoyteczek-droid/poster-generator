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
}

/**
 * Deep-clone the base style and, if a palette is supplied, apply its
 * colours to every layer whose role we can identify. When palette is
 * null the layout keeps its native colours — used for the "Original"
 * option. `streetLabelsVisible` always applies.
 */
export function transformStyle(baseStyle: Style, opts: TransformOptions): Style {
  const style: Style = structuredClone(baseStyle)
  const streetLabels = opts.streetLabelsVisible ?? false

  for (const layer of style.layers as Layer[]) {
    const role = detectRole(layer)
    if (role && opts.palette) applyRoleColor(layer, role, opts.palette)
    if (role === 'label-road') {
      layer.layout = {
        ...(layer.layout ?? {}),
        visibility: streetLabels ? 'visible' : 'none',
      }
    }
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
