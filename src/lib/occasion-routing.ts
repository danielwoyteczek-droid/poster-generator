import { type Locale } from '@/i18n/config'

/**
 * URL-Segment für die Anlass-Landing-Pages pro Locale (PROJ-29).
 *
 * Singular vs. Plural ist eine SEO-/Sprachgewohnheits-Konstante, keine
 * Marketing-Entscheidung — daher hier im Code, nicht in Sanity. Beispiele:
 *
 *  /de/poster/geschenkideen-zum-muttertag
 *  /it/poster/idee-regalo-festa-della-mamma
 *  /en/posters/mothers-day-gift-ideas
 *  /fr/posters/idees-cadeaux-fete-des-meres
 *  /es/posters/ideas-regalo-dia-de-la-madre
 *
 * Wenn eine neue Locale dazu kommt, hier ergänzen UND einen passenden
 * Routen-Ordner unter src/app/[locale]/<segment>/[slug]/page.tsx anlegen,
 * der die gemeinsame Page-Komponente reexportiert.
 */
export const OCCASION_URL_SEGMENT: Record<Locale, 'poster' | 'posters'> = {
  de: 'poster',
  en: 'posters',
  fr: 'posters',
  it: 'poster',
  es: 'posters',
}

/**
 * Baut den absoluten Pfad zu einer Anlass-Landing-Page. Wird von Page-
 * Komponenten (Hreflang, Canonical, 301-Redirect) und Cross-Link-Konsumenten
 * (Footer, GallerySection, Sitemap) gemeinsam genutzt — eine einzige Quelle
 * der URL-Wahrheit.
 */
export function buildOccasionPagePath(locale: Locale, slug: string): string {
  const segment = OCCASION_URL_SEGMENT[locale]
  return `/${locale}/${segment}/${slug}`
}
