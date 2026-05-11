import { type Locale } from '@/i18n/config'

/**
 * PROJ-42: Featured Map-Style-Set fuer Programmatic City Landing Pages.
 *
 * Definiert die festen 3 Look-and-Feel-Varianten, die der Style-Picker
 * auf jeder Stadt-Landing-Page anbietet. Pro Stadt rendert die Pipeline
 * (PROJ-30 + Worker-Erweiterung) genau diese 3 Renders.
 *
 * Eine Style-Definition koppelt ein Map-Layout (Strichstaerken / Detail-
 * grad) mit einer Map-Palette (Farbschema). Beide IDs muessen den
 * Konstanten in src/lib/map-layouts.ts und src/lib/map-palettes.ts
 * entsprechen.
 *
 * V1-Set (kann hier veraendert werden ohne weitere Code-Changes; bei
 * geaenderten IDs werden bestehende city_renders.style_id-Eintraege
 * verwaist und sollten via Admin-Tool re-rendert werden):
 *
 *   original  →  klassisch + sand   (warmer Klassiker)
 *   navy      →  klassisch + navy   (klassisch-maritim)
 *   dark      →  tusche + forest    (dunkles Etching)
 */

export interface FeaturedStyle {
  /** Eindeutige Style-ID; landet als city_renders.style_id in der DB. */
  id: string
  /** Map-Layout-ID aus MAP_LAYOUTS. */
  layoutId: string
  /** Map-Palette-ID aus MAP_PALETTES. */
  paletteId: string
  /** Anzeigelabel pro Locale (Fallback DE). */
  label: Record<Locale, string>
}

export const FEATURED_STYLES: readonly FeaturedStyle[] = [
  {
    id: 'original',
    layoutId: 'klassisch',
    paletteId: 'sand',
    label: {
      de: 'Original',
      en: 'Original',
      fr: 'Original',
      it: 'Originale',
      es: 'Original',
    },
  },
  {
    id: 'navy',
    layoutId: 'klassisch',
    paletteId: 'navy',
    label: {
      de: 'Navy',
      en: 'Navy',
      fr: 'Navy',
      it: 'Navy',
      es: 'Navy',
    },
  },
  {
    id: 'dark',
    layoutId: 'tusche',
    paletteId: 'forest',
    label: {
      de: 'Dark',
      en: 'Dark',
      fr: 'Dark',
      it: 'Dark',
      es: 'Dark',
    },
  },
] as const

export const FEATURED_STYLE_IDS: readonly string[] = FEATURED_STYLES.map((s) => s.id)

export const DEFAULT_FEATURED_STYLE_ID: string = FEATURED_STYLES[0].id

export function getFeaturedStyle(id: string): FeaturedStyle | null {
  return FEATURED_STYLES.find((s) => s.id === id) ?? null
}

export function isValidFeaturedStyleId(id: string): boolean {
  return FEATURED_STYLE_IDS.includes(id)
}

export function getFeaturedStyleLabel(style: FeaturedStyle, locale: Locale): string {
  return style.label[locale] ?? style.label.de
}
