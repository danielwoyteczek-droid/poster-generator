import type { Metadata } from 'next'
import { getLocale, getTranslations } from 'next-intl/server'
import { LandingNav } from '@/components/landing/LandingNav'
import { LandingFooter } from '@/components/landing/LandingFooter'
import { GalleryHero } from '@/components/landing/GalleryHero'
import { GallerySection } from '@/components/landing/GallerySection'
import { GalleryEmpty } from '@/components/landing/GalleryEmpty'
import type { GalleryPreset } from '@/components/landing/GalleryPresetCard'
import { getGalleryPage, type GalleryCategory } from '@/sanity/queries'
import { createAdminClient } from '@/lib/supabase-admin'

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

  if (error || !data) return []
  return data as GalleryPreset[]
}

export default async function GalleryPageRoute() {
  const locale = await getLocale().catch(() => 'de')
  const t = await getTranslations('gallery')

  const page = await getGalleryPage(locale)
  const categories = page?.categories ?? []

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
              />
            ))}
          </div>
        )}
      </main>
      <LandingFooter />
    </div>
  )
}
