import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { CITY_URL_SEGMENT } from '@/lib/city-routing'
import { locales, type Locale } from '@/i18n/config'

const FALLBACK_BASE_URL = 'https://petite-moment.com'

function resolveBaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_APP_URL ?? FALLBACK_BASE_URL
  return raw.replace(/\/+$/, '')
}

function hubPath(locale: Locale): string {
  return `/${locale}/${CITY_URL_SEGMENT[locale]}/`
}

/**
 * PROJ-44: Builds Next.js metadata for the Stadt-Karten-Hub-Page.
 *
 * Includes:
 *  - title + description from the cityMapsHub i18n namespace
 *  - openGraph (article-style, no specific og:image — text-hub)
 *  - Twitter card
 *  - alternates.canonical pointing at the current locale's hub URL
 *  - alternates.languages with hreflang for every locale's hub
 *    (assumes all 5 locale-hubs exist parallel — adjust if the hub
 *    is locale-rolled out in phases)
 */
export async function buildCityMapsHubMetadata(locale: Locale): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: 'cityMapsHub' })

  const baseUrl = resolveBaseUrl()
  const canonical = `${baseUrl}${hubPath(locale)}`

  const languageAlternates: Record<string, string> = {}
  for (const loc of locales) {
    languageAlternates[loc] = `${baseUrl}${hubPath(loc)}`
  }
  languageAlternates['x-default'] = languageAlternates['de']

  return {
    title: t('pageTitle'),
    description: t('metaDescription'),
    alternates: {
      canonical,
      languages: languageAlternates,
    },
    openGraph: {
      title: t('pageTitle'),
      description: t('metaDescription'),
      type: 'article',
      url: canonical,
      locale,
    },
    twitter: {
      card: 'summary_large_image',
      title: t('pageTitle'),
      description: t('metaDescription'),
    },
  }
}

interface CollectionListEntry {
  cityName: string
  citySlug: string
}

/**
 * Builds the Schema.org JSON-LD payload for the Hub-Page (CollectionPage
 * with embedded ItemList). Returns a single LD object ready to be
 * rendered as `<script type="application/ld+json">` in the page <head>.
 */
export function buildCityMapsHubJsonLd(input: {
  locale: Locale
  pageTitle: string
  description: string
  cities: CollectionListEntry[]
}): unknown {
  const baseUrl = resolveBaseUrl()
  const hubUrl = `${baseUrl}${hubPath(input.locale)}`

  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: input.pageTitle,
    description: input.description,
    url: hubUrl,
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: input.cities.length,
      itemListElement: input.cities.map((city, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: city.cityName,
        url: `${baseUrl}/${input.locale}/${CITY_URL_SEGMENT[input.locale]}/${city.citySlug}`,
      })),
    },
  }
}
