import type { MetadataRoute } from 'next'
import { listBlogPosts, listAllCityPages, type CityPageRef } from '@/sanity/queries'
import { locales, type Locale } from '@/i18n/config'
import { buildCityPagePath, CITY_URL_SEGMENT } from '@/lib/city-routing'

/**
 * PROJ-44: Builds an alternates.languages map for the Stadt-Karten-Hub.
 * The hub exists at the same URL-segment per locale as the single city
 * LPs (e.g. /de/stadtkarte/ vs /de/stadtkarte/<slug>), so we reuse the
 * CITY_URL_SEGMENT mapping.
 */
function hubAlternatesFor(baseUrl: string) {
  const languages: Record<string, string> = {}
  for (const loc of locales) {
    languages[loc] = `${baseUrl}/${loc}/${CITY_URL_SEGMENT[loc]}/`
  }
  languages['x-default'] = `${baseUrl}/de/${CITY_URL_SEGMENT.de}/`
  return { languages }
}

export const revalidate = 3600

const STATIC_PATHS: { path: string; freq: 'weekly' | 'monthly' | 'yearly'; priority: number }[] = [
  { path: '', freq: 'weekly', priority: 1 },
  { path: '/about', freq: 'monthly', priority: 0.8 },
  { path: '/faq', freq: 'monthly', priority: 0.8 },
  { path: '/map', freq: 'monthly', priority: 0.9 },
  { path: '/star-map', freq: 'monthly', priority: 0.9 },
  { path: '/photo', freq: 'monthly', priority: 0.9 },
  { path: '/gallery', freq: 'weekly', priority: 0.8 },
  { path: '/blog', freq: 'weekly', priority: 0.7 },
  { path: '/impressum', freq: 'yearly', priority: 0.3 },
  { path: '/datenschutz', freq: 'yearly', priority: 0.3 },
  { path: '/agb', freq: 'yearly', priority: 0.3 },
  { path: '/widerrufsbelehrung', freq: 'yearly', priority: 0.3 },
  { path: '/cookie-richtlinie', freq: 'yearly', priority: 0.3 },
]

/**
 * Builds an alternates.languages map for hreflang signals — every static
 * URL exists once per locale, plus an x-default that points at DE.
 */
function alternatesFor(path: string, baseUrl: string) {
  const languages: Record<string, string> = {}
  for (const loc of locales) languages[loc] = `${baseUrl}/${loc}${path}`
  languages['x-default'] = `${baseUrl}/de${path}`
  return { languages }
}

/**
 * Builds an alternates.languages map specifically for city pages, where
 * each locale has its own (possibly different) URL segment AND its own
 * (possibly different) slug. Only locales whose Sanity-cityPage exists
 * are linked. PROJ-42.
 */
function cityAlternatesFor(refsByLocale: Map<Locale, CityPageRef>, baseUrl: string) {
  const languages: Record<string, string> = {}
  for (const [loc, ref] of refsByLocale) {
    languages[loc] = `${baseUrl}${buildCityPagePath(loc, ref.slug)}`
  }
  if (languages['de']) {
    languages['x-default'] = languages['de']
  } else {
    const first = Object.values(languages)[0]
    if (first) languages['x-default'] = first
  }
  return { languages }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://petite-moment.com'
  const now = new Date()

  const staticRoutes: MetadataRoute.Sitemap = []
  for (const loc of locales) {
    for (const entry of STATIC_PATHS) {
      staticRoutes.push({
        url: `${baseUrl}/${loc}${entry.path}`,
        lastModified: now,
        changeFrequency: entry.freq,
        priority: entry.priority,
        alternates: alternatesFor(entry.path, baseUrl),
      })
    }
  }

  // Blog posts: emit one URL per locale. We only know about posts that
  // have a Sanity document for that locale, so query each locale once.
  const blogRoutes: MetadataRoute.Sitemap = []
  for (const loc of locales) {
    const posts = (await listBlogPosts(loc)) ?? []
    for (const post of posts) {
      blogRoutes.push({
        url: `${baseUrl}/${loc}/blog/${post.slug.current}`,
        lastModified: post.publishedAt ? new Date(post.publishedAt) : now,
        changeFrequency: 'monthly',
        priority: 0.6,
        alternates: alternatesFor(`/blog/${post.slug.current}`, baseUrl),
      })
    }
  }

  // PROJ-42: City landing pages. One URL per (locale × city) where a
  // Sanity-cityPage exists. Hreflang-Subelements verlinken nur Locales
  // mit existierendem Doc — der Phase-Rollout-Status (DE first) bleibt
  // damit fuer Google sauber.
  const cityRoutes: MetadataRoute.Sitemap = []
  const allCityPages = (await listAllCityPages()) ?? []
  // Group all variants by cityId so we can build hreflang per city.
  const variantsByCity = new Map<string, Map<Locale, CityPageRef>>()
  for (const ref of allCityPages) {
    if (!ref.slug) continue
    const loc = ref.language as Locale
    if (!(locales as readonly string[]).includes(loc)) continue
    if (CITY_URL_SEGMENT[loc] == null) continue
    if (!variantsByCity.has(ref.cityId)) variantsByCity.set(ref.cityId, new Map())
    variantsByCity.get(ref.cityId)!.set(loc, ref)
  }
  for (const [, refsByLocale] of variantsByCity) {
    for (const [loc, ref] of refsByLocale) {
      cityRoutes.push({
        url: `${baseUrl}${buildCityPagePath(loc, ref.slug)}`,
        lastModified: now,
        changeFrequency: 'monthly',
        priority: 0.7,
        alternates: cityAlternatesFor(refsByLocale, baseUrl),
      })
    }
  }

  // PROJ-44: City-Maps-Hub-Pages — eine Hub-URL pro Locale (/de/stadtkarte/
  // etc.), die alle Stadt-LPs aggregiert. Hreflang verlinkt alle 5 Locale-
  // Hubs untereinander; die Hub-URL bekommt höhere Priority als einzelne
  // Stadt-LPs (parent-level in der Site-Hierarchie).
  const hubRoutes: MetadataRoute.Sitemap = []
  for (const loc of locales) {
    hubRoutes.push({
      url: `${baseUrl}/${loc}/${CITY_URL_SEGMENT[loc]}/`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.8,
      alternates: hubAlternatesFor(baseUrl),
    })
  }

  return [...staticRoutes, ...blogRoutes, ...hubRoutes, ...cityRoutes]
}
