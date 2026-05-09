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
  featuredIds?: string[],
): Promise<GalleryPreset[]> {
  const admin = createAdminClient()
  const useFeatured = featuredIds && featuredIds.length > 0

  // Variante A: kuratierte Liste aus Sanity → genau diese Presets in
  // gepflegter Reihenfolge laden. Variante B (Fallback): Auto-Match per
  // Locale + Anlass-Tag, sortiert nach display_order.
  // PROJ-39: also pull per-format preview URLs + statuses so the gallery card
  // can offer the customer the format-switcher and load the matching image.
  // The legacy `preview_image_url` is kept for backwards-compat fallback in
  // `getPreviewUrl()`.
  const baseQuery = admin
    .from('presets')
    .select('id, name, poster_type, preview_image_url, preview_image_url_a4, preview_image_url_a3, preview_image_url_a2, render_status_a4, render_status_a3, render_status_a2')
    .eq('status', 'published')

  const { data, error } = useFeatured
    ? await baseQuery.in('id', featuredIds!)
    : await baseQuery
        .contains('target_locales', [locale])
        .contains('occasions', [occasion])
        .order('display_order', { ascending: true })
        .limit(4)

  if (error || !data || data.length === 0) return []

  // Bei Featured-Liste: die Reihenfolge aus Sanity wiederherstellen
  // (Supabase .in() liefert nicht garantiert in der Eingabe-Reihenfolge).
  let ordered = data as GalleryPreset[]
  if (useFeatured) {
    const byId = new Map(data.map((p) => [p.id, p]))
    ordered = featuredIds!
      .map((id) => byId.get(id))
      .filter((p): p is typeof data[number] => Boolean(p)) as GalleryPreset[]
  }

  // PROJ-39: drop the mockup-composite preference for inspiration cards —
  // customers want to see how each FORMAT looks (different map content
  // visible at A4 vs A2), which the bare-poster-per-format renders show
  // properly. The mockup-composite (PROJ-30) stays unchanged for other
  // surfaces (admin, marketing emails) but isn't useful here because it
  // can't represent format differences in a single image.
  //
  // Filter out presets that have no `done` format render at all — per spec
  // "wenn ein Preset für kein Format `done` hat → Karte wird gar nicht
  // angezeigt (für Customer)". The legacy `preview_image_url` fallback in
  // getPreviewUrl handles pre-PROJ-39 presets that have only the old
  // single column populated.
  return (ordered as GalleryPreset[]).filter((p) =>
    p.render_status_a4 === 'done'
      || p.render_status_a3 === 'done'
      || p.render_status_a2 === 'done'
      || Boolean(p.preview_image_url),
  )
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

  const presets = await fetchPresetsForOccasion(locale, page.occasion, page.featuredPresetIds)

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
