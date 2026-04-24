/**
 * Registry of available map layouts. A layout is a MapTiler style JSON
 * authored by the operator that defines what's shown at which zoom level
 * and how thick/dense lines/labels are — but the colours are treated as
 * placeholders. At render time the chosen palette (see map-palettes.ts)
 * is applied on top.
 *
 * Add a new layout by dropping its JSON into public/map-styles/ and
 * registering it below.
 */

export interface MapLayoutDefinition {
  id: string
  label: string
  description?: string
  file: string // relative to /public
}

export const MAP_LAYOUTS: MapLayoutDefinition[] = [
  {
    id: 'klassisch',
    label: 'Klassisch',
    description: 'Klare Grundstruktur mit Straßen und Orts-Labels.',
    file: '/map-styles/layout-klassisch.json',
  },
  {
    id: 'satellite',
    label: 'Satellit',
    description: 'Satellitenbild – die Palette wirkt hier nicht auf die Luftaufnahme.',
    file: '/map-styles/layout-satellite.json',
  },
  {
    id: 'minimal',
    label: 'Minimal',
    description: 'Reduzierte Poster-Optik mit Urban-Flächen und feinen Straßen.',
    file: '/map-styles/layout-minimal.json',
  },
  {
    id: 'test',
    label: 'Test',
    description: 'Experimentelles Layout.',
    file: '/map-styles/layout-test.json',
  },
  {
    id: 'detail',
    label: 'Detailliert',
    description: 'Hoher Detailgrad ab z13 — schwarze Gebäude, hellblaues Wasser, weiße Straßen.',
    file: '/map-styles/layout-detail.json',
  },
  // Additional layouts get added here once the operator exports them.
]

export const DEFAULT_LAYOUT_ID = 'klassisch'

export function getLayout(id: string): MapLayoutDefinition {
  return MAP_LAYOUTS.find((l) => l.id === id) ?? MAP_LAYOUTS[0]
}
