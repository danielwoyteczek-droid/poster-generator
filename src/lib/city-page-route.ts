import type { Metadata } from 'next'
import { generateCityPageMetadata, pickOgRender } from '@/lib/city-page-metadata'
import { CITY_URL_SEGMENT } from '@/lib/city-routing'
import { DEFAULT_FEATURED_STYLE_ID } from '@/lib/featured-styles'
import { createAdminClient } from '@/lib/supabase-admin'
import { getCityPageBySlug } from '@/sanity/queries'
import { locales, type Locale } from '@/i18n/config'

/**
 * PROJ-42: Shared route helpers for the per-locale stadtkarte/city-map/...
 * page handlers. Each route file is a tiny wrapper that supplies its own
 * SEGMENT and delegates here, so the metadata + page-render logic lives
 * once.
 */

export interface CityPageRouteParams {
  locale: string
  slug: string
}

export interface CityPageRouteSearchParams {
  preview?: string
}

export function isLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value)
}

/**
 * Builds Next.js metadata for a city page. The og:image is pulled from the
 * default Featured-Style render so OG previews are predictable across
 * cities. The route file MUST validate locale + segment before invoking
 * this — when the locale's URL segment doesn't match, an empty metadata
 * object is returned so the route handler's notFound() takes over cleanly.
 */
export async function buildCityPageMetadata(
  segment: string,
  params: CityPageRouteParams,
  searchParams: CityPageRouteSearchParams,
): Promise<Metadata> {
  const { locale, slug } = params
  if (!isLocale(locale) || CITY_URL_SEGMENT[locale] !== segment) return {}

  const preview = searchParams.preview === '1'
  const page = await getCityPageBySlug(locale, slug, { preview })
  let ogImage = null
  if (page) {
    const admin = createAdminClient()
    const { data: cityRow } = await admin
      .from('cities')
      .select('id, name')
      .eq('slug_base', page.cityId)
      .limit(1)
      .single()
    if (cityRow) {
      const { data: renders } = await admin
        .from('city_renders')
        .select('style_id, image_url, render_status')
        .eq('city_id', cityRow.id)
      ogImage = pickOgRender(renders ?? [], DEFAULT_FEATURED_STYLE_ID, cityRow.name)
    }
  }
  return generateCityPageMetadata(locale, slug, preview, ogImage)
}
