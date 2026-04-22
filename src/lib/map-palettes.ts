export interface MapPalette {
  id: string
  label: string
  description: string
  colors: {
    background: string
    land: string
    water: string
    road: string
    building: string
    border: string
    label: string
    labelHalo: string
  }
}

export const MAP_PALETTES: MapPalette[] = [
  {
    id: 'mint',
    label: 'Mint',
    description: 'Frisches Grün-Weiß, hochzeits-geeignet',
    colors: {
      background: '#f4f9f6',
      land: '#e3eee8',
      water: '#84c5a6',
      road: '#ffffff',
      building: '#d5e5dc',
      border: '#8ec2a6',
      label: '#2b3a2f',
      labelHalo: '#ffffff',
    },
  },
  {
    id: 'sand',
    label: 'Sand',
    description: 'Warme Beigetöne, südlich-entspannt',
    colors: {
      background: '#fdf7ec',
      land: '#f5e8cf',
      water: '#c8a96a',
      road: '#fffdf5',
      building: '#e6d2a8',
      border: '#b89252',
      label: '#3d2f18',
      labelHalo: '#fdf7ec',
    },
  },
  {
    id: 'navy',
    label: 'Navy',
    description: 'Tiefes Blau und Creme, klassisch maritim',
    colors: {
      background: '#0b1c33',
      land: '#15294a',
      water: '#4a7ab8',
      road: '#e8ddc5',
      building: '#213a62',
      border: '#7aa5d6',
      label: '#f3ead3',
      labelHalo: '#0b1c33',
    },
  },
  {
    id: 'terracotta',
    label: 'Terracotta',
    description: 'Warmes Ziegelrot und Beige, italienisch',
    colors: {
      background: '#fbf0e3',
      land: '#f4d9b8',
      water: '#d4825e',
      road: '#fdf6ea',
      building: '#e2b48a',
      border: '#b95c37',
      label: '#4a1f0f',
      labelHalo: '#fbf0e3',
    },
  },
  {
    id: 'slate',
    label: 'Slate',
    description: 'Kühles Grau und Weiß, minimalistisch',
    colors: {
      background: '#ffffff',
      land: '#ececec',
      water: '#b4b4b4',
      road: '#ffffff',
      building: '#d8d8d8',
      border: '#808080',
      label: '#2a2a2a',
      labelHalo: '#ffffff',
    },
  },
  {
    id: 'forest',
    label: 'Forest',
    description: 'Dunkles Grün und Creme, outdoor-verbunden',
    colors: {
      background: '#2b3d2e',
      land: '#3a5140',
      water: '#83a896',
      road: '#ecdfbb',
      building: '#4a6650',
      border: '#a5c1ae',
      label: '#f2e9cd',
      labelHalo: '#2b3d2e',
    },
  },
]

/**
 * Relative luminance (0..1). Used to decide if a colour needs a
 * light or dark label contrast.
 */
function luminance(hex: string): number {
  const rgb = hexToRgb(hex)
  if (!rgb) return 0.5
  const toLin = (c: number) => {
    const v = c / 255
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
  }
  return 0.2126 * toLin(rgb.r) + 0.7152 * toLin(rgb.g) + 0.0722 * toLin(rgb.b)
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const clean = hex.replace('#', '').trim()
  if (!/^[0-9a-f]{6}$/i.test(clean)) return null
  return {
    r: parseInt(clean.slice(0, 2), 16),
    g: parseInt(clean.slice(2, 4), 16),
    b: parseInt(clean.slice(4, 6), 16),
  }
}

function rgbToHex(r: number, g: number, b: number): string {
  const h = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0')
  return `#${h(r)}${h(g)}${h(b)}`
}

function mix(a: string, b: string, ratio: number): string {
  const ra = hexToRgb(a)
  const rb = hexToRgb(b)
  if (!ra || !rb) return a
  return rgbToHex(
    ra.r * (1 - ratio) + rb.r * ratio,
    ra.g * (1 - ratio) + rb.g * ratio,
    ra.b * (1 - ratio) + rb.b * ratio,
  )
}

/**
 * Build a palette heuristically from a single base colour.
 * Used by the free colour picker ("Eigene Farbe").
 */
export function paletteFromBaseColor(baseHex: string): MapPalette {
  const base = hexToRgb(baseHex) ? baseHex : '#84c5a6'
  const isDark = luminance(base) < 0.5
  const light = '#ffffff'
  const dark = '#1a1a1a'
  return {
    id: 'custom',
    label: 'Eigene Farbe',
    description: 'Aus deiner Auswahl abgeleitet',
    colors: {
      background: isDark ? mix(base, dark, 0.6) : mix(base, light, 0.85),
      land: isDark ? mix(base, dark, 0.4) : mix(base, light, 0.7),
      water: base,
      road: isDark ? mix(base, light, 0.85) : '#ffffff',
      building: isDark ? mix(base, dark, 0.2) : mix(base, light, 0.55),
      border: isDark ? mix(base, light, 0.35) : mix(base, dark, 0.25),
      label: isDark ? light : dark,
      labelHalo: isDark ? mix(base, dark, 0.6) : '#ffffff',
    },
  }
}

export function getPalette(id: string): MapPalette | null {
  return MAP_PALETTES.find((p) => p.id === id) ?? null
}
