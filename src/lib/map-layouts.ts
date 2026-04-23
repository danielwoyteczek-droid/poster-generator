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
    id: 'classic',
    label: 'Klassisch',
    description: 'Klare Grundstruktur mit Straßen und Orts-Labels.',
    file: '/map-styles/layout-classic.json',
  },
  // Additional layouts get added here once the operator exports them.
]

export const DEFAULT_LAYOUT_ID = 'classic'

export function getLayout(id: string): MapLayoutDefinition {
  return MAP_LAYOUTS.find((l) => l.id === id) ?? MAP_LAYOUTS[0]
}
