import { notFound, redirect } from 'next/navigation'
import { LandingNav } from '@/components/landing/LandingNav'
import { LandingFooter } from '@/components/landing/LandingFooter'
import { CityHero } from '@/components/landing/CityHero'
import { CityStylePicker, type CityStylePickerRender } from '@/components/landing/CityStylePicker'
import { CityBody } from '@/components/landing/CityBody'
import { CityCta } from '@/components/landing/CityCta'
import { RelatedCities, type RelatedCity } from '@/components/landing/RelatedCities'
import { getCityPageBySlug, listCityPagesForLocale } from '@/sanity/queries'
import { createAdminClient } from '@/lib/supabase-admin'
import { buildCityPagePath, CITY_URL_SEGMENT } from '@/lib/city-routing'
import Link from 'next/link'
import { buildCityPageJsonLd } from '@/lib/city-page-metadata'
import {
  FEATURED_STYLES,
  FEATURED_STYLE_IDS,
  DEFAULT_FEATURED_STYLE_ID,
} from '@/lib/featured-styles'
import { getTranslations } from 'next-intl/server'
import type { Locale } from '@/i18n/config'

interface Props {
  locale: Locale
  slug: string
  preview: boolean
}

interface CityRow {
  id: string
  slug_base: string
  name: string
  country_code: string
  region: string | null
  latitude: number
  longitude: number
  population: number | null
}

interface CityRenderRow {
  city_id: string
  style_id: string
  image_url: string | null
  image_width: number | null
  image_height: number | null
  render_status: string
}

/**
 * PROJ-42: Shared city-landing-page renderer used by all 5 locale-specific
 * routes (`/de/stadtkarte/[slug]`, `/en/city-map/[slug]`, etc.). The
 * route-side page handler validates locale + segment match before invoking
 * this component — see `CITY_URL_SEGMENT` in `src/lib/city-routing.ts`.
 *
 * Doppelter Live-Gate (per Tech-Design):
 *   1. Sanity-cityPage-Doc muss existieren (sonst notFound).
 *   2. cities-Tabelle muss die referenzierte Stadt haben (sonst notFound).
 *   3. Mindestens 1 Featured-Style-Render muss `done` sein (sonst notFound) —
 *      ohne Visuals ist die Seite Thin Content fuer Google.
 */
export async function CityLandingPage({ locale, slug, preview }: Props) {
  const page = await getCityPageBySlug(locale, slug, { preview })
  if (!page) notFound()

  // 301-redirect on previousSlugs match (skip in preview mode).
  if (!preview && page.slug.current !== slug) {
    redirect(buildCityPagePath(locale, page.slug.current))
  }

  const admin = createAdminClient()
  const { data: cityRows } = await admin
    .from('cities')
    .select('id, slug_base, name, country_code, region, latitude, longitude, population')
    .eq('slug_base', page.cityId)
    .limit(1)
  const city = (cityRows?.[0] ?? null) as CityRow | null
  if (!city) notFound()

  const { data: renderRows } = await admin
    .from('city_renders')
    .select('city_id, style_id, image_url, image_width, image_height, render_status')
    .eq('city_id', city.id)
    .in('style_id', FEATURED_STYLE_IDS as string[])
  const renders = (renderRows ?? []) as CityRenderRow[]

  // Live-Gate: at least one done render. In preview mode we pass through so
  // marketing can review the page before the worker has finished.
  const hasAnyDoneRender = renders.some((r) => r.render_status === 'done' && r.image_url)
  if (!preview && !hasAnyDoneRender) notFound()

  const stylePickerRenders: CityStylePickerRender[] = renders
    .filter((r) => r.render_status === 'done' && r.image_url)
    .map((r) => ({ styleId: r.style_id, imageUrl: r.image_url! }))

  // i18n strings for the page-level UI chrome (everything not in Sanity).
  const t = await getTranslations({ locale, namespace: 'cityPage' })
  const tNav = await getTranslations({ locale, namespace: 'nav' })

  // Verwandte-Staedte-Logik: same country + same region (if region set) →
  // sort by population DESC; if < 6, fall back to same-country (no region
  // filter). Skip the current city itself. Then filter to those that have
  // a Sanity-cityPage-Doc in this locale (so cards always link to live pages).
  let relatedQuery = admin
    .from('cities')
    .select('id, slug_base, name, country_code, region, population')
    .eq('country_code', city.country_code)
    .neq('id', city.id)
    .order('population', { ascending: false, nullsFirst: false })
    .limit(20)
  if (city.region) {
    relatedQuery = relatedQuery.eq('region', city.region)
  }
  const { data: regionCandidates } = await relatedQuery
  let candidatePool = regionCandidates ?? []
  if (candidatePool.length < 6 && city.region) {
    // Fallback: same-country only (drop region filter).
    const { data: countryCandidates } = await admin
      .from('cities')
      .select('id, slug_base, name, country_code, region, population')
      .eq('country_code', city.country_code)
      .neq('id', city.id)
      .order('population', { ascending: false, nullsFirst: false })
      .limit(30)
    const seen = new Set(candidatePool.map((c) => c.id))
    for (const c of countryCandidates ?? []) {
      if (candidatePool.length >= 12) break
      if (seen.has(c.id)) continue
      candidatePool.push(c)
    }
  }

  // Cross-reference with Sanity to keep only cities that have a live cityPage
  // in the current locale + grab the slug for the link.
  const cityPagesInLocale = (await listCityPagesForLocale(locale)) ?? []
  const slugByCityId = new Map(
    cityPagesInLocale.filter((r) => r.slug).map((r) => [r.cityId, r.slug] as const),
  )

  // Pull thumbnails for the related cities in one query.
  const relatedCityIds = candidatePool.map((c) => c.id)
  const { data: thumbRows } =
    relatedCityIds.length > 0
      ? await admin
          .from('city_renders')
          .select('city_id, style_id, image_url, render_status')
          .in('city_id', relatedCityIds)
          .eq('style_id', DEFAULT_FEATURED_STYLE_ID)
          .eq('render_status', 'done')
      : { data: [] as CityRenderRow[] }
  const thumbByCityId = new Map(
    (thumbRows ?? []).filter((r) => r.image_url).map((r) => [r.city_id, r.image_url!] as const),
  )

  const relatedCities: RelatedCity[] = candidatePool
    .filter((c) => slugByCityId.has(c.slug_base))
    .slice(0, 6)
    .map((c) => ({
      cityId: c.slug_base,
      name: c.name,
      citySlug: slugByCityId.get(c.slug_base)!,
      thumbnailUrl: thumbByCityId.get(c.id) ?? null,
    }))

  // CTA defaults to Featured-Styles[0] but the picker overrides via JS.
  const ctaHref = `/${locale}/map?city=${encodeURIComponent(city.slug_base)}&style=${encodeURIComponent(DEFAULT_FEATURED_STYLE_ID)}`

  // Schema.org JSON-LD for SEO Rich Results.
  const jsonLd = buildCityPageJsonLd({
    locale,
    pageTitle: page.pageTitle,
    slug: page.slug.current,
    cityName: city.name,
    countryCode: city.country_code,
    latitude: city.latitude,
    longitude: city.longitude,
    breadcrumbHomeLabel: tNav('cityPoster'),
    breadcrumbCityMapsLabel: t('breadcrumbCityMaps'),
  })

  return (
    <div className="min-h-screen flex flex-col bg-white">
      {jsonLd.map((entry, idx) => (
        <script
          key={idx}
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: JSON.stringify(entry) }}
        />
      ))}
      <LandingNav />
      {preview && (
        <div className="bg-amber-100 border-b border-amber-300 text-amber-900 text-xs text-center py-2 px-4 mt-16">
          Preview-Modus — du siehst den aktuellen Sanity-Draft inkl. unveröffentlichter Änderungen.
        </div>
      )}
      <main className={preview ? 'flex-1' : 'flex-1 pt-16'}>
        <CityHero pageTitle={page.pageTitle} pageSubline={page.pageSubline} />
        <CityStylePicker
          locale={locale}
          citySlugBase={city.slug_base}
          styles={FEATURED_STYLES}
          renders={stylePickerRenders}
          pickerHeading={t('stylePickerHeading')}
          ctaLabel={t('ctaButtonLabel')}
          cityName={city.name}
        />
        <CityBody sections={page.bodySections} />
        <CityCta
          href={ctaHref}
          headline={t('ctaHeadline', { city: city.name })}
          subline={t('ctaSubline')}
          buttonLabel={t('ctaButtonLabel')}
        />
        <RelatedCities
          locale={locale}
          cities={relatedCities}
          heading={t('relatedCitiesHeading')}
        />
        <div className="pb-12 sm:pb-16 text-center bg-background">
          <Link
            href={`/${locale}/${CITY_URL_SEGMENT[locale]}/`}
            className="inline-block text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            {t('backToHubLink')}
          </Link>
        </div>
      </main>
      <LandingFooter />
    </div>
  )
}
