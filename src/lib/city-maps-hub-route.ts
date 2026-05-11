import type { Metadata } from 'next'
import { buildCityMapsHubMetadata } from '@/lib/city-maps-hub-metadata'
import { CITY_URL_SEGMENT } from '@/lib/city-routing'
import { locales, type Locale } from '@/i18n/config'

/**
 * PROJ-44: Shared route helpers for the per-locale Stadt-Karten-Hub
 * pages (`/[locale]/stadtkarte/`, `/[locale]/city-map/`, etc.). Each
 * locale-specific route file is a tiny wrapper that supplies its own
 * SEGMENT and delegates here.
 */

export interface CityMapsHubRouteParams {
  locale: string
}

export function isLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value)
}

/**
 * Builds Next.js metadata for a Stadt-Karten-Hub-Page. Returns an empty
 * object when the locale's URL segment doesn't match — the route
 * handler's notFound() takes over cleanly in that case.
 */
export async function buildHubMetadata(
  segment: string,
  params: CityMapsHubRouteParams,
): Promise<Metadata> {
  const { locale } = params
  if (!isLocale(locale) || CITY_URL_SEGMENT[locale] !== segment) return {}
  return buildCityMapsHubMetadata(locale)
}
