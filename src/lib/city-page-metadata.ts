import type { Metadata } from 'next'
import { getCityPageBySlug, getCityPageVariants } from '@/sanity/queries'
import { buildCityPagePath } from '@/lib/city-routing'
import { locales, type Locale } from '@/i18n/config'

const FALLBACK_BASE_URL = 'https://petite-moment.com'

function resolveBaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_APP_URL ?? FALLBACK_BASE_URL
  return raw.replace(/\/+$/, '')
}

function isKnownLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value)
}

interface CityRenderRow {
  style_id: string
  image_url: string | null
  render_status: string
}

interface OgImageInput {
  /** Top render row used as OG-image. */
  url: string
  width: number
  height: number
  alt: string
}

/**
 * Builds Next.js metadata for a PROJ-42 city landing page.
 *
 * Includes:
 *  - title + description from Sanity meta fields
 *  - openGraph (title, description, type=article, og:image from city render)
 *  - twitter (summary_large_image card)
 *  - alternates.canonical pointing at the current locale's URL
 *  - alternates.languages with hreflang for every locale that has a doc
 *    for this city (locales without a doc are NOT linked, keeping the
 *    Phase-Rollout SEO signal clean)
 *  - x-default points at DE if a DE doc exists, else the first available
 *    locale variant
 *
 * Returns an empty object when no Sanity doc is found — the route handler
 * itself will trigger notFound() in that case.
 */
export async function generateCityPageMetadata(
  locale: Locale,
  slug: string,
  preview: boolean,
  ogImage?: OgImageInput | null,
): Promise<Metadata> {
  const page = await getCityPageBySlug(locale, slug, { preview })
  if (!page) return {}

  const baseUrl = resolveBaseUrl()
  const canonicalPath = buildCityPagePath(locale, page.slug.current)
  const canonical = `${baseUrl}${canonicalPath}`

  const variants = (await getCityPageVariants(page.cityId)) ?? []
  const languageAlternates: Record<string, string> = {}
  for (const variant of variants) {
    if (!isKnownLocale(variant.language) || !variant.slug) continue
    languageAlternates[variant.language] = `${baseUrl}${buildCityPagePath(variant.language, variant.slug)}`
  }
  if (languageAlternates['de']) {
    languageAlternates['x-default'] = languageAlternates['de']
  } else {
    const first = Object.values(languageAlternates)[0]
    if (first) languageAlternates['x-default'] = first
  }

  return {
    title: page.metaTitle,
    description: page.metaDescription,
    alternates: {
      canonical,
      languages: Object.keys(languageAlternates).length > 0 ? languageAlternates : undefined,
    },
    openGraph: {
      title: page.metaTitle,
      description: page.metaDescription,
      type: 'article',
      url: canonical,
      locale,
      ...(ogImage
        ? {
            images: [
              {
                url: ogImage.url,
                width: ogImage.width,
                height: ogImage.height,
                alt: ogImage.alt,
              },
            ],
          }
        : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title: page.metaTitle,
      description: page.metaDescription,
      ...(ogImage ? { images: [ogImage.url] } : {}),
    },
  }
}

/**
 * Builds the Schema.org JSON-LD payload for a city page (BreadcrumbList +
 * Place). Returns an array of two LD-objects ready to be rendered as
 * `<script type="application/ld+json">` tags in the page <head>.
 */
export function buildCityPageJsonLd(input: {
  locale: Locale
  pageTitle: string
  slug: string
  cityName: string
  countryCode: string
  latitude: number
  longitude: number
  breadcrumbHomeLabel: string
  breadcrumbCityMapsLabel: string
}): unknown[] {
  const baseUrl = resolveBaseUrl()
  const cityPath = buildCityPagePath(input.locale, input.slug)

  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: input.breadcrumbHomeLabel,
        item: `${baseUrl}/${input.locale}`,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: input.breadcrumbCityMapsLabel,
        item: `${baseUrl}/${input.locale}`,
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: input.cityName,
        item: `${baseUrl}${cityPath}`,
      },
    ],
  }

  const place = {
    '@context': 'https://schema.org',
    '@type': 'Place',
    name: input.cityName,
    url: `${baseUrl}${cityPath}`,
    address: {
      '@type': 'PostalAddress',
      addressCountry: input.countryCode,
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: input.latitude,
      longitude: input.longitude,
    },
  }

  return [breadcrumb, place]
}

/**
 * Selects the OG-image URL from a list of city_renders rows. Prefers the
 * first Featured-Style (the "default" look as defined in
 * src/lib/featured-styles.ts) so OG previews are predictable across all
 * cities.
 */
export function pickOgRender(
  renders: CityRenderRow[],
  preferredStyleId: string,
  cityName: string,
): OgImageInput | null {
  const done = renders.filter((r) => r.render_status === 'done' && r.image_url)
  if (done.length === 0) return null
  const preferred = done.find((r) => r.style_id === preferredStyleId)
  const chosen = preferred ?? done[0]
  return {
    url: chosen.image_url!,
    width: 1200,
    height: 1697, // ~A3 portrait aspect; OG accepts any > 600px
    alt: `Stadtkarte ${cityName}`,
  }
}
