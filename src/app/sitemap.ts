import type { MetadataRoute } from 'next'
import { listBlogPosts } from '@/sanity/queries'
import { locales } from '@/i18n/config'

export const revalidate = 3600

const STATIC_PATHS: { path: string; freq: 'weekly' | 'monthly' | 'yearly'; priority: number }[] = [
  { path: '', freq: 'weekly', priority: 1 },
  { path: '/about', freq: 'monthly', priority: 0.8 },
  { path: '/faq', freq: 'monthly', priority: 0.8 },
  { path: '/map', freq: 'monthly', priority: 0.9 },
  { path: '/star-map', freq: 'monthly', priority: 0.9 },
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

  return [...staticRoutes, ...blogRoutes]
}
