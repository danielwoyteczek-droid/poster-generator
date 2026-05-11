import { getTranslations } from 'next-intl/server'
import { LandingNav } from '@/components/landing/LandingNav'
import { LandingFooter } from '@/components/landing/LandingFooter'
import { HubHero } from '@/components/landing/HubHero'
import { HubIntro } from '@/components/landing/HubIntro'
import { HubCityGrid, type HubCityCard } from '@/components/landing/HubCityGrid'
import { HubCta } from '@/components/landing/HubCta'
import { listCityPagesForLocale } from '@/sanity/queries'
import { createAdminClient } from '@/lib/supabase-admin'
import { DEFAULT_FEATURED_STYLE_ID } from '@/lib/featured-styles'
import { buildCityMapsHubJsonLd } from '@/lib/city-maps-hub-metadata'
import type { Locale } from '@/i18n/config'

interface Props {
  locale: Locale
}

interface CityRow {
  id: string
  slug_base: string
  name: string
  country_code: string
  population: number | null
}

interface CityRenderRow {
  city_id: string
  image_url: string | null
  render_status: string
}

/**
 * PROJ-44: Shared Stadt-Karten-Hub renderer used by all 5 locale-specific
 * routes (`/de/stadtkarte/`, `/en/city-map/`, etc.). Composes Hero +
 * Intro + City-Grid + CTA + Footer.
 *
 * Data-flow (3 parallel queries):
 *   1. listCityPagesForLocale(locale) — which cities have a Sanity-doc
 *   2. cities table — Name, Population, Slug-Base (for matching + sort)
 *   3. city_renders WHERE style_id = DEFAULT_FEATURED_STYLE — thumbnails
 *
 * Then in-memory join, sort by population DESC, render. Live-Gate per
 * city: Sanity-Doc AND done-Render must exist.
 */
export async function CityMapsHubPage({ locale }: Props) {
  const t = await getTranslations({ locale, namespace: 'cityMapsHub' })

  // 1+2+3 parallel
  const admin = createAdminClient()
  const [cityPageRefs, citiesResult, rendersResult] = await Promise.all([
    listCityPagesForLocale(locale),
    admin
      .from('cities')
      .select('id, slug_base, name, country_code, population')
      .order('population', { ascending: false, nullsFirst: false })
      .limit(500),
    admin
      .from('city_renders')
      .select('city_id, image_url, render_status')
      .eq('style_id', DEFAULT_FEATURED_STYLE_ID)
      .eq('render_status', 'done'),
  ])

  const refs = cityPageRefs ?? []
  const cities = (citiesResult.data ?? []) as CityRow[]
  const renders = (rendersResult.data ?? []) as CityRenderRow[]

  // In-memory join: only keep cities that have BOTH a Sanity-doc in this
  // locale AND a done 'original' render. Map them to the Card-Format.
  const slugByCityId = new Map(
    refs.filter((r) => r.slug).map((r) => [r.cityId, r.slug] as const),
  )
  const thumbByCityId = new Map(
    renders.filter((r) => r.image_url).map((r) => [r.city_id, r.image_url!] as const),
  )

  const cards: HubCityCard[] = cities
    .filter((c) => slugByCityId.has(c.slug_base) && thumbByCityId.has(c.id))
    .map((c) => ({
      cityId: c.slug_base,
      cityName: c.name,
      citySlug: slugByCityId.get(c.slug_base)!,
      thumbnailUrl: thumbByCityId.get(c.id) ?? null,
    }))

  const editorHref = `/${locale}/map`

  const jsonLd = buildCityMapsHubJsonLd({
    locale,
    pageTitle: t('pageTitle'),
    description: t('metaDescription'),
    cities: cards.map((c) => ({ cityName: c.cityName, citySlug: c.citySlug })),
  })

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <LandingNav />
      <main className="flex-1 pt-16">
        <HubHero h1={t('h1')} subline={t('subline')} />
        <HubIntro paragraphs={[t('introParagraph1'), t('introParagraph2')]} />
        <HubCityGrid
          locale={locale}
          cities={cards}
          heading={t('gridHeading')}
          emptyHeadline={t('emptyHeadline')}
          emptySubline={t('emptySubline')}
        />
        <HubCta
          href={editorHref}
          headline={t('ctaHeadline')}
          subline={t('ctaSubline')}
          buttonLabel={t('ctaButtonLabel')}
        />
      </main>
      <LandingFooter />
    </div>
  )
}
