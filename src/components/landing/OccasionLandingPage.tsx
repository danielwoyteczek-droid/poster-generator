import { notFound, redirect } from 'next/navigation'
import { LandingNav } from '@/components/landing/LandingNav'
import { LandingFooter } from '@/components/landing/LandingFooter'
import { OccasionHero } from '@/components/landing/OccasionHero'
import { OccasionBody } from '@/components/landing/OccasionBody'
import { OccasionPresetGrid } from '@/components/landing/OccasionPresetGrid'
import { OccasionCta } from '@/components/landing/OccasionCta'
import { OccasionFaq } from '@/components/landing/OccasionFaq'
import type { GalleryPreset } from '@/components/landing/GalleryPresetCard'
import { getOccasionPageBySlug } from '@/sanity/queries'
import { createAdminClient } from '@/lib/supabase-admin'
import { buildOccasionPagePath } from '@/lib/occasion-routing'
import type { Locale } from '@/i18n/config'

interface Props {
  locale: Locale
  slug: string
  preview: boolean
}

async function fetchPresetsForOccasion(
  locale: Locale,
  occasion: string,
): Promise<GalleryPreset[]> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('presets')
    .select('id, name, poster_type, preview_image_url')
    .eq('status', 'published')
    .contains('target_locales', [locale])
    .contains('occasions', [occasion])
    .order('display_order', { ascending: true })
    .limit(4)
  if (error || !data || data.length === 0) return []

  // Fetch desktop mockup-renders, falls vorhanden — die zeigen wir bevorzugt
  // statt des nackten Posters, weil sie bereits im Mockup-Frame stecken.
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

/**
 * Shared occasion-landing-page renderer used by both the `/poster/[slug]`
 * (DE/IT) and `/posters/[slug]` (EN/FR/ES) routes. Validates that the
 * caller's locale matches the URL segment via the route-side check before
 * invoking this component — see `OCCASION_URL_SEGMENT` in
 * `src/lib/occasion-routing.ts` for the locale → segment mapping.
 *
 * The 301-redirect target for previousSlugs uses `buildOccasionPagePath`
 * so the redirect honours the locale-specific URL segment automatically.
 */
export async function OccasionLandingPage({ locale, slug, preview }: Props) {
  const page = await getOccasionPageBySlug(locale, slug, { preview })

  if (!page) notFound()

  // Slug came in via `previousSlugs[]` — 301-redirect to the current slug so
  // SEO juice on the new URL stays intact. Skipped in preview so testing the
  // old slug doesn't bounce.
  if (!preview && page.slug.current !== slug) {
    redirect(buildOccasionPagePath(locale, page.slug.current))
  }

  const editorPath = page.ctaPosterType === 'star-map' ? '/star-map' : '/map'
  const ctaHref = `/${locale}${editorPath}`

  const presets = await fetchPresetsForOccasion(locale, page.occasion)

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <LandingNav />
      {preview && (
        <div className="bg-amber-100 border-b border-amber-300 text-amber-900 text-xs text-center py-2 px-4 mt-16">
          Preview-Modus — du siehst den aktuellen Sanity-Draft inkl. unveröffentlichter Änderungen.
        </div>
      )}
      <main className={preview ? 'flex-1' : 'flex-1 pt-16'}>
        <OccasionHero
          pageTitle={page.pageTitle}
          pageSubline={page.pageSubline}
          heroImage={page.heroImage}
          heroImageMobile={page.heroImageMobile}
          showPlaceholder={preview}
        />
        <OccasionPresetGrid
          occasion={page.occasion}
          locale={locale}
          presets={presets}
          posterTypeMapLabel="Stadtposter"
          posterTypeStarMapLabel="Sternenkarte"
          showPlaceholder={preview}
        />
        <OccasionBody sections={page.bodySections} />
        <OccasionCta posterType={page.ctaPosterType ?? 'map'} href={ctaHref} />
        <OccasionFaq entries={page.faq ?? []} />
      </main>
      <LandingFooter />
    </div>
  )
}
