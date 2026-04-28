import type { Metadata } from 'next'
import { getOccasionPageBySlug, getOccasionPageVariants } from '@/sanity/queries'
import { urlFor } from '@/sanity/client'
import { buildOccasionPagePath } from '@/lib/occasion-routing'
import { locales, type Locale } from '@/i18n/config'

const FALLBACK_BASE_URL = 'https://petite-moment.com'

function resolveBaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_APP_URL ?? FALLBACK_BASE_URL
  return raw.replace(/\/+$/, '')
}

function isKnownLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value)
}

/**
 * Builds Next.js metadata for a PROJ-29 occasion landing page.
 *
 * Includes:
 *  - title + description from Sanity meta fields
 *  - openGraph (title, description, type=article, og:image from heroImage)
 *  - twitter (summary_large_image card)
 *  - alternates.canonical pointing at the current locale's URL
 *  - alternates.languages with hreflang for every locale that has a doc
 *    for this occasion (locales without a doc are NOT linked, keeping the
 *    Phase-1-rollout SEO signal clean)
 *  - x-default points at DE if a DE doc exists, else the first available
 *    locale variant
 *
 * Returns an empty object when no Sanity doc is found — the route handler
 * itself will trigger notFound() in that case.
 */
export async function generateOccasionPageMetadata(
  locale: Locale,
  slug: string,
  preview: boolean,
): Promise<Metadata> {
  const page = await getOccasionPageBySlug(locale, slug, { preview })
  if (!page) return {}

  const baseUrl = resolveBaseUrl()
  const canonicalPath = buildOccasionPagePath(locale, page.slug.current)
  const canonical = `${baseUrl}${canonicalPath}`

  const ogImageUrl = page.heroImage
    ? urlFor(page.heroImage).width(1200).height(630).fit('crop').format('jpg').url()
    : undefined
  const ogImageAlt = page.heroImage?.alt ?? page.pageTitle

  const variants = (await getOccasionPageVariants(page.occasion)) ?? []
  const languageAlternates: Record<string, string> = {}
  for (const variant of variants) {
    if (!isKnownLocale(variant.language) || !variant.slug) continue
    languageAlternates[variant.language] = `${baseUrl}${buildOccasionPagePath(variant.language, variant.slug)}`
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
      ...(ogImageUrl
        ? {
            images: [
              {
                url: ogImageUrl,
                width: 1200,
                height: 630,
                alt: ogImageAlt,
              },
            ],
          }
        : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title: page.metaTitle,
      description: page.metaDescription,
      ...(ogImageUrl ? { images: [ogImageUrl] } : {}),
    },
  }
}
