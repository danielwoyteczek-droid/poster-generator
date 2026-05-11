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

  // PROJ-29 Iteration: Mockup-Composites bevorzugt anzeigen statt der nackten
  // Poster. Anlass-Seiten sind SEO-Landing-Pages — Mockups (Poster an der Wand
  // im Wohnraum-Kontext) verkaufen im Suchergebnis-Thumbnail besser als das
  // nackte Poster. Memory-Doktrin: Inspiration/Galerie zeigt nackte Renders,
  // Anlass-Seiten zeigen Mockup-Composites.
  //
  // Implementation: nach den Presets die Desktop-Mockup-Renders aus
  // preset_renders ziehen und in preview_image_url einsetzen. Die per-Format-
  // Felder werden gleichzeitig auf null gesetzt, damit getPreviewUrl() im
  // GalleryPresetCard naturgemäss auf preview_image_url zurueckfaellt. Der
  // Format-Switcher wird in OccasionPresetGrid via hideFormatSwitcher
  // ausgeblendet (Mockups haben keine Format-Variation).
  //
  // (PROJ-39 hatte diesen Mockup-Lookup versehentlich entfernt; 2026-05-11
  // restauriert nach User-Report.)
  const presetIds = ordered.map((p) => p.id)
  const { data: renderRows } = await admin
    .from('preset_renders')
    .select('preset_id, image_url, rendered_at')
    .in('preset_id', presetIds)
    .eq('variant', 'desktop')
    .order('rendered_at', { ascending: false })

  const mockupByPreset: Record<string, string> = {}
  for (const r of renderRows ?? []) {
    if (!mockupByPreset[r.preset_id]) mockupByPreset[r.preset_id] = r.image_url
  }

  // Filter out presets that have NEITHER a mockup NOR any other usable
  // preview (per spec: "wenn ein Preset keine renderbare Vorschau hat →
  // Karte wird gar nicht angezeigt"). Then override preview_image_url with
  // the mockup if available, and null the per-format columns so the card
  // falls back to the mockup-image.
  return ordered
    .filter((p) =>
      Boolean(mockupByPreset[p.id])
        || p.render_status_a4 === 'done'
        || p.render_status_a3 === 'done'
        || p.render_status_a2 === 'done'
        || Boolean(p.preview_image_url),
    )
    .map((p) => {
      const mockup = mockupByPreset[p.id]
      if (!mockup) return p
      return {
        ...p,
        preview_image_url: mockup,
        // Null per-format URLs+statuses so getPreviewUrl() falls back to
        // preview_image_url (= mockup). Without this, the format-fallback
        // chain in preset-previews.ts would return the bare poster URL
        // first because A3 has done-status.
        preview_image_url_a4: null,
        preview_image_url_a3: null,
        preview_image_url_a2: null,
        render_status_a4: null,
        render_status_a3: null,
        render_status_a2: null,
      } as GalleryPreset
    })
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
