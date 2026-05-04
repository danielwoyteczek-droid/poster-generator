import type { Metadata } from 'next'
import { getLocale, getTranslations } from 'next-intl/server'
import { LandingNav } from '@/components/landing/LandingNav'
import { LandingFooter } from '@/components/landing/LandingFooter'
import { GalleryHero } from '@/components/landing/GalleryHero'
import { GallerySection } from '@/components/landing/GallerySection'
import { GalleryEmpty } from '@/components/landing/GalleryEmpty'
import { GalleryFilterChips, type GalleryFilterChip } from '@/components/landing/GalleryFilterChips'
import type { GalleryPreset } from '@/components/landing/GalleryPresetCard'
import { getGalleryPage, listOccasionPagesForLocale, type GalleryCategory } from '@/sanity/queries'
import { createAdminClient } from '@/lib/supabase-admin'
import { buildOccasionPagePath } from '@/lib/occasion-routing'
import { OCCASION_CODES, type OccasionCode } from '@/lib/occasions'
import { locales, type Locale } from '@/i18n/config'

function isLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value)
}

function isOccasionCode(value: string): value is OccasionCode {
  return (OCCASION_CODES as readonly string[]).includes(value)
}

export const revalidate = 3600

export async function generateMetadata(
  { searchParams }: { searchParams: Promise<{ anlass?: string }> },
): Promise<Metadata> {
  const locale = await getLocale().catch(() => 'de')
  const [page, t, params] = await Promise.all([
    getGalleryPage(locale),
    getTranslations('gallery'),
    searchParams,
  ])
  const title = page?.pageHeadline ?? t('headlineFallback')
  const description = page?.pageSubline ?? t('metaDescription')
  // Filter-Views ranken nicht eigenständig — der Master-Hub `/gallery` bündelt
  // den Link-Saft, PROJ-29-Anlass-Seiten sind die echten SEO-Targets.
  const isFiltered = Boolean(params?.anlass)
  return {
    title: `${t('pageTitle')} — ${title}`,
    description,
    openGraph: { title, description, type: 'website' },
    alternates: { canonical: `/${locale}/gallery` },
    robots: isFiltered ? { index: false, follow: true } : undefined,
  }
}

interface SectionData {
  category: GalleryCategory
  presets: GalleryPreset[]
}

/**
 * Fetches all published presets for a single (occasion, locale) combo.
 * Sorted by display_order so admins can hand-tune the gallery order
 * via the existing display_order field.
 */
async function fetchPresetsForCategory(
  locale: string,
  occasionTag: string,
): Promise<GalleryPreset[]> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('presets')
    .select('id, name, poster_type, preview_image_url')
    .eq('status', 'published')
    .contains('target_locales', [locale])
    .contains('occasions', [occasionTag])
    .order('display_order', { ascending: true })
    .limit(24)

  if (error || !data || data.length === 0) return []

  // Inspiration/Gallery zeigt das nackte Poster (Preset-Render), nicht das
  // Mockup-Composite — Mockups sind den SEO-Anlass-Seiten (PROJ-29) vorbehalten.
  return data as GalleryPreset[]
}

export default async function GalleryPageRoute(
  { searchParams }: { searchParams: Promise<{ anlass?: string }> },
) {
  const rawLocale = await getLocale().catch(() => 'de')
  const locale = rawLocale
  const t = await getTranslations('gallery')

  const [page, occasionRefs, params] = await Promise.all([
    getGalleryPage(locale),
    listOccasionPagesForLocale(locale),
    searchParams,
  ])
  const categories = page?.categories ?? []

  // Aktiver Filter aus URL — alles andere als ein gültiger Code ignorieren.
  const activeFilter: OccasionCode | null =
    params?.anlass && isOccasionCode(params.anlass) ? params.anlass : null

  // Build a tag → occasion-page-href lookup so each GallerySection can render
  // a "More about this occasion →" link without triggering N+1 Sanity queries.
  // Empty when no occasion-page docs exist for this locale yet — links stay
  // hidden until marketing publishes a doc.
  const typedLocale: Locale | null = isLocale(locale) ? locale : null
  const occasionHrefByTag: Record<string, string> = {}
  if (typedLocale) {
    for (const ref of occasionRefs ?? []) {
      if (!ref.slug) continue
      occasionHrefByTag[ref.occasion] = buildOccasionPagePath(typedLocale, ref.slug)
    }
  }

  // Fetch presets for all categories in parallel, then drop empty sections.
  const sectionData = await Promise.all(
    categories.map(async (category): Promise<SectionData> => ({
      category,
      presets: await fetchPresetsForCategory(locale, category.tag),
    })),
  )
  const allVisibleSections = sectionData.filter((s) => s.presets.length > 0)

  // Filter-Chips zeigen nur Anlässe, die auch tatsächlich Presets haben —
  // tote Chips würden das Versprechen "klick = Inhalt" brechen.
  const filterChips: GalleryFilterChip[] = [
    {
      tag: null,
      label: t('filterAll'),
      href: `/${locale}/gallery`,
      isActive: activeFilter === null,
    },
    ...allVisibleSections.map(({ category }) => ({
      tag: category.tag,
      label: category.label,
      href: `/${locale}/gallery?anlass=${encodeURIComponent(category.tag)}`,
      isActive: activeFilter === category.tag,
    })),
  ]

  // Aktiver Filter rendert genau die eine Sektion (oder leer, wenn der Code
  // zwar gültig, aber keine Presets dafür existieren — dann zeigt die Page den
  // bestehenden Empty-State).
  const visibleSections = activeFilter
    ? allVisibleSections.filter((s) => s.category.tag === activeFilter)
    : allVisibleSections

  const headline = page?.pageHeadline ?? t('headlineFallback')
  const subline = page?.pageSubline ?? t('sublineFallback')

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <LandingNav />
      <main className="flex-1 pt-16">
        <GalleryHero
          headline={headline}
          subline={subline}
          heroImage={page?.heroImage}
        />

        <GalleryFilterChips chips={filterChips} ariaLabel={t('filterAriaLabel')} />

        {visibleSections.length === 0 ? (
          <GalleryEmpty
            title={t('emptyTitle')}
            description={t('emptyDescription')}
            ctaLabel={t('emptyCta')}
            ctaHref="/map"
          />
        ) : (
          <div>
            {visibleSections.map(({ category, presets }) => (
              <GallerySection
                key={category.tag}
                tag={category.tag}
                label={category.label}
                subline={category.subline}
                categoryImage={category.categoryImage}
                presets={presets}
                posterTypeMapLabel={t('posterTypeMap')}
                posterTypeStarMapLabel={t('posterTypeStarMap')}
                occasionPageHref={occasionHrefByTag[category.tag]}
                occasionPageLinkLabel={t('moreOnOccasion')}
              />
            ))}
          </div>
        )}
      </main>
      <LandingFooter />
    </div>
  )
}
