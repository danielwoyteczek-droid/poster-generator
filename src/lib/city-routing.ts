import { type Locale } from '@/i18n/config'

/**
 * URL-Segment fuer die Programmatic City Landing Pages pro Locale (PROJ-42).
 *
 * Analog zu `OCCASION_URL_SEGMENT` aus PROJ-29 — das Segment ist eine
 * SEO-/Sprachgewohnheits-Konstante (keyword-relevant), nicht eine
 * Marketing-Entscheidung. Daher hier im Code, nicht in Sanity.
 *
 *  /de/stadtkarte/stadtkarte-hamburg
 *  /en/city-map/city-map-london
 *  /fr/carte-de-ville/carte-de-paris
 *  /it/mappa-citta/mappa-citta-roma
 *  /es/mapa-ciudad/mapa-ciudad-madrid
 *
 * Wenn eine neue Locale dazu kommt, hier ergaenzen UND einen passenden
 * Routen-Ordner unter src/app/[locale]/<segment>/[slug]/page.tsx anlegen,
 * der die gemeinsame Page-Komponente reexportiert.
 */
export const CITY_URL_SEGMENT: Record<Locale, string> = {
  de: 'stadtkarte',
  en: 'city-map',
  fr: 'carte-de-ville',
  it: 'mappa-citta',
  es: 'mapa-ciudad',
}

/**
 * Default-Slug-Praefix pro Locale fuer Auto-Slug-Vorschlaege im Sanity-
 * Studio und im AI-Body-Draft. Marketing kann den Slug pro Stadt
 * eigenstaendig anpassen — der Praefix ist nur ein keyword-front-loaded
 * Standard-Vorschlag.
 *
 * Beispiel: Stadt "hamburg" + Locale "de" → vorgeschlagener Slug
 * "stadtkarte-hamburg".
 */
export const CITY_SLUG_PREFIX: Record<Locale, string> = {
  de: 'stadtkarte',
  en: 'city-map',
  fr: 'carte-de',
  it: 'mappa-citta',
  es: 'mapa-ciudad',
}

/**
 * Baut den absoluten Pfad zu einer Stadt-Landing-Page. Wird von Page-
 * Komponenten (Hreflang, Canonical, 301-Redirect), Sitemap, Footer und
 * Verwandte-Staedte-Section gemeinsam genutzt — eine einzige Quelle der
 * URL-Wahrheit.
 */
export function buildCityPagePath(locale: Locale, slug: string): string {
  const segment = CITY_URL_SEGMENT[locale]
  return `/${locale}/${segment}/${slug}`
}

/**
 * Schlaegt einen Default-Slug pro (Locale, slug_base) vor. Marketing kann
 * im Sanity-Studio davon abweichen.
 */
export function suggestCitySlug(locale: Locale, citySlugBase: string): string {
  const prefix = CITY_SLUG_PREFIX[locale]
  return `${prefix}-${citySlugBase}`
}
