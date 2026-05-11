import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { locales, type Locale } from '@/i18n/config'
import { CITY_URL_SEGMENT } from '@/lib/city-routing'
import { OCCASION_URL_SEGMENT } from '@/lib/occasion-routing'
import {
  getCityPageBySlug,
  getCityPageVariants,
  getOccasionPageBySlug,
  getOccasionPageVariants,
} from '@/sanity/queries'

/**
 * PROJ-42 + PROJ-29: translate a path from one locale to another.
 *
 * The LanguageSwitcher uses this to find the equivalent URL in the
 * target locale BEFORE navigating. Without it, swapping `/de/stadtkarte/`
 * → `/en/stadtkarte/` 404s (EN uses `/en/city-map/`); same for occasion
 * pages with locale-specific URL segments.
 *
 * Logic:
 *  1. Parse path → current locale + segment + slug.
 *  2. If segment is a city-segment with a slug → Sanity-lookup cityId,
 *     find target-locale variant, build /[target]/[targetSegment]/[targetSlug].
 *  3. Same for occasion-segments.
 *  4. If segment is a city/occasion-HUB (no slug) → swap to target hub.
 *  5. Otherwise → naive segs[1] swap (path stays the same shape).
 *
 * Fallbacks:
 *  - Target-locale doc doesn't exist → return the target-locale's HUB url
 *    (cities hub, occasions don't have a hub so fallback to home).
 *  - Last resort → /[target] home.
 *
 * Query:
 *   GET /api/translate-url?path=/de/stadtkarte/stadtkarte-hamburg&target=en
 *
 * Response:
 *   { targetPath: "/en/city-map/city-map-hamburg" }
 */

const QuerySchema = z.object({
  path: z.string().min(1),
  target: z.enum(locales),
})

function isLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value)
}

const CITY_SEGMENTS: Set<string> = new Set(Object.values(CITY_URL_SEGMENT))
const OCCASION_SEGMENTS: Set<string> = new Set(Object.values(OCCASION_URL_SEGMENT))

function buildHomePath(target: Locale): string {
  return `/${target}`
}

function buildCityHubPath(target: Locale): string {
  return `/${target}/${CITY_URL_SEGMENT[target]}/`
}

function naiveSwapLocale(path: string, target: Locale): string {
  const segs = path.split('/')
  if (segs[1] && isLocale(segs[1])) {
    segs[1] = target
    return segs.join('/') || '/'
  }
  return path
}

export async function GET(req: NextRequest) {
  const parsed = QuerySchema.safeParse({
    path: req.nextUrl.searchParams.get('path'),
    target: req.nextUrl.searchParams.get('target'),
  })
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid params', issues: parsed.error.format() },
      { status: 400 },
    )
  }
  const { path, target } = parsed.data

  // Strip query string + hash for parsing — they don't carry over.
  const cleanPath = path.split('?')[0].split('#')[0]
  const segs = cleanPath.split('/').filter(Boolean) // ['de', 'stadtkarte', 'stadtkarte-hamburg']

  const currentLocale = segs[0]
  if (!isLocale(currentLocale)) {
    // No locale prefix found — naive swap. Should not really happen with
    // localePrefix:'always', but defensive.
    return NextResponse.json({ targetPath: `/${target}${cleanPath}` })
  }

  if (currentLocale === target) {
    return NextResponse.json({ targetPath: cleanPath })
  }

  const currentSegment = segs[1]
  const currentSlug = segs[2]

  // ----- City pages -----
  if (currentSegment && CITY_SEGMENTS.has(currentSegment)) {
    if (!currentSlug) {
      // Hub URL `/de/stadtkarte/` → target hub
      return NextResponse.json({ targetPath: buildCityHubPath(target) })
    }
    // Slug URL `/de/stadtkarte/stadtkarte-hamburg`
    try {
      const page = await getCityPageBySlug(currentLocale, currentSlug)
      if (page?.cityId) {
        const variants = (await getCityPageVariants(page.cityId)) ?? []
        const targetVariant = variants.find((v) => v.language === target && v.slug)
        if (targetVariant) {
          return NextResponse.json({
            targetPath: `/${target}/${CITY_URL_SEGMENT[target]}/${targetVariant.slug}`,
          })
        }
      }
    } catch {
      // Fall through to hub fallback
    }
    // Target locale doesn't have this city → city-hub of target locale
    return NextResponse.json({ targetPath: buildCityHubPath(target) })
  }

  // ----- Occasion pages -----
  if (currentSegment && OCCASION_SEGMENTS.has(currentSegment)) {
    if (!currentSlug) {
      // Occasion-hub doesn't exist as a dedicated page yet — fall back
      // to the gallery (which lists occasions) as the closest semantic
      // parent. If gallery lacks the locale, naive-swap-to-home wins.
      return NextResponse.json({ targetPath: `/${target}/gallery` })
    }
    try {
      const page = await getOccasionPageBySlug(currentLocale, currentSlug)
      if (page?.occasion) {
        const variants = (await getOccasionPageVariants(page.occasion)) ?? []
        const targetVariant = variants.find((v) => v.language === target && v.slug)
        if (targetVariant) {
          return NextResponse.json({
            targetPath: `/${target}/${OCCASION_URL_SEGMENT[target]}/${targetVariant.slug}`,
          })
        }
      }
    } catch {
      // Fall through
    }
    // Target locale doesn't have this occasion → gallery anchor
    return NextResponse.json({ targetPath: `/${target}/gallery` })
  }

  // ----- Generic path (about, faq, blog, gallery, map, etc.) -----
  return NextResponse.json({ targetPath: naiveSwapLocale(cleanPath, target) })
}
