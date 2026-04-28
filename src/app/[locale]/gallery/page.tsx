import type { Metadata } from 'next'
import { getLocale, getTranslations } from 'next-intl/server'
import { LandingNav } from '@/components/landing/LandingNav'
import { LandingFooter } from '@/components/landing/LandingFooter'
import { GalleryHero } from '@/components/landing/GalleryHero'
import { GallerySection } from '@/components/landing/GallerySection'
import { GalleryEmpty } from '@/components/landing/GalleryEmpty'
import type { GalleryPreset } from '@/components/landing/GalleryPresetCard'
import { getGalleryPage, listOccasionPagesForLocale, type GalleryCategory } from '@/sanity/queries'
import { createAdminClient } from '@/lib/supabase-admin'
import { buildOccasionPagePath } from '@/lib/occasion-routing'
import { locales, type Locale } from '@/i18n/config'

function isLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value)
}

export const revalidate = 3600

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale().catch(() => 'de')
  const [page, t] = await Promise.all([getGalleryPage(locale), getTranslations('gallery')])
  const title = page?.pageHeadline ?? t('headlineFallback')
  const description = page?.pageSubline ?? t('metaDescription')
  return {
    title: `${t('pageTitle')} — ${title}`,
    description,
    openGraph: { title, description, type: 'website' },
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

  // Bevorzuge Mockup-Composite-Renders über das nackte Poster
  const presetIds = data.map((p) => p.id)
  const { data: renders } = await admin
    .from('preset_renders')
    .select('preset_id, image_url, rendered_at')
    .in('preset_id', presetIds)
    .eq('variant', 'desktop')
    .order('rendered_at', { ascending: false })

  const firstRenderByPreset: Record<string, string> = {}
  for (const r of renders ?? []) {
    if (!firstRenderByPreset[r.preset_id]) firstRenderByPreset[r.preset_id] = r.image_url
  }

  return data.map((p) => ({
    ...p,
    preview_image_url: firstRenderByPreset[p.id] ?? p.preview_image_url,
  })) as GalleryPreset[]
}

export default async function GalleryPageRoute() {
  const rawLocale = await getLocale().catch(() => 'de')
  const locale = rawLocale
  const t = await getTranslations('gallery')

  const [page, occasionRefs] = await Promise.all([
    getGalleryPage(locale),
    listOccasionPagesForLocale(locale),
  ])
  const categories = page?.categories ?? []

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
  const visibleSections = sectionData.filter((s) => s.presets.length > 0)

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
