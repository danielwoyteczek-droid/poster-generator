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
 *   original  →  tusche + 'original'      (Tusche-Rohfarben, B&W-Etching)
 *   navy      →  klassisch + navy         (klassisch-maritim, dunkelblau)
 *   dark      →  tusche + black-white     (reines Schwarz, weisses Wasser/Strasse)
 *
 * Hinweis: `paletteId: 'original'` ist ein Spezial-Wert, der resolvePalette
 * in src/lib/petite-style-loader.ts dazu bringt, KEINE Palette aufzulegen
 * — der Renderer nutzt die rohen Layout-Farben aus der jeweiligen
 * map-styles/*.json.
 *
 * `paletteId: 'black-white'` referenziert die admin-gepflegte Palette
 * (id=black-white, label="Dark") und ist auch im hardcoded MAP_PALETTES
 * verfuegbar, damit der Worker (der nur die Hardcoded-Liste sieht) sie
 * findet.
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
    layoutId: 'tusche',
    paletteId: 'original',
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
    paletteId: 'black-white',
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
