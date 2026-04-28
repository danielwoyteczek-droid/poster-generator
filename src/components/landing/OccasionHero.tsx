import { ImageIcon } from 'lucide-react'
import { urlFor } from '@/sanity/client'
import type { SanityImage } from '@/sanity/queries'

interface Props {
  pageTitle: string
  pageSubline?: string
  heroImage?: SanityImage
  /** Optional mobile-first art-direction variant. Loaded only on viewports
   *  ≤ 767 px via <picture><source media>. Falls back to heroImage if absent. */
  heroImageMobile?: SanityImage
  /** When true, render a placeholder instead of a missing-image error. Used in
   *  preview mode while marketing has not yet uploaded the hero image. */
  showPlaceholder?: boolean
}

const MOBILE_BREAKPOINT_PX = 767

/**
 * Hero block for an occasion landing page. Three layouts:
 *  - With image: full-width banner with text overlay (production look). Uses
 *    a native <picture> element for art direction so the browser downloads
 *    only the variant matching the viewport.
 *  - Without image, preview mode: muted box + placeholder hint.
 *  - Without image, production fallback: text on muted bg.
 *
 * We use a raw <img> instead of next/image because next/image cannot do art
 * direction (different sources per viewport) cleanly. Sanity already serves
 * format-negotiated WebP at the requested width, so we don't lose format
 * optimization. fetchPriority="high" + loading="eager" preserve LCP.
 */
export function OccasionHero({
  pageTitle,
  pageSubline,
  heroImage,
  heroImageMobile,
  showPlaceholder = false,
}: Props) {
  const desktopUrl = heroImage ? urlFor(heroImage).width(2000).format('webp').url() : null
  const mobileUrl = heroImageMobile ? urlFor(heroImageMobile).width(900).format('webp').url() : null
  const imageAlt = heroImage?.alt ?? pageTitle

  if (desktopUrl) {
    return (
      <section className="relative h-[55vh] min-h-[360px] flex items-center justify-center overflow-hidden">
        <picture className="absolute inset-0">
          {mobileUrl && (
            <source media={`(max-width: ${MOBILE_BREAKPOINT_PX}px)`} srcSet={mobileUrl} />
          )}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={desktopUrl}
            alt={imageAlt}
            loading="eager"
            fetchPriority="high"
            decoding="async"
            className="absolute inset-0 w-full h-full object-cover"
          />
        </picture>
        <div className="absolute inset-0 bg-black/35" aria-hidden />
        <div className="relative max-w-3xl mx-auto px-4 sm:px-6 text-center text-white">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold drop-shadow-md">{pageTitle}</h1>
          {pageSubline && (
            <p className="mt-4 text-base sm:text-lg text-white/90 max-w-xl mx-auto drop-shadow">
              {pageSubline}
            </p>
          )}
        </div>
      </section>
    )
  }

  if (showPlaceholder) {
    return (
      <section className="bg-muted">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16 sm:py-20 text-center">
          <div className="mx-auto w-full aspect-[16/7] max-w-2xl rounded-xl border-2 border-dashed border-border bg-background flex flex-col items-center justify-center text-muted-foreground gap-2 mb-8">
            <ImageIcon className="w-10 h-10 opacity-50" />
            <p className="text-sm font-medium">Hero-Bild fehlt</p>
            <p className="text-xs text-muted-foreground/70 max-w-sm">
              Im Studio ein locale-spezifisches Stimmungsbild im Feld &bdquo;Hero-Bild
              (Desktop)&ldquo; hochladen (Querformat, ~16:7). Optional zusätzlich ein Hochformat-
              oder Quadrat-Bild im Feld &bdquo;Hero-Bild (Mobile)&ldquo; für Mobil-Geräte.
            </p>
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground">{pageTitle}</h1>
          {pageSubline && (
            <p className="mt-4 text-base sm:text-lg text-muted-foreground max-w-xl mx-auto">
              {pageSubline}
            </p>
          )}
        </div>
      </section>
    )
  }

  // Production fallback (no image, no placeholder): just text on muted bg
  return (
    <section className="bg-muted py-16 sm:py-20">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground">{pageTitle}</h1>
        {pageSubline && (
          <p className="mt-4 text-base sm:text-lg text-muted-foreground max-w-xl mx-auto">{pageSubline}</p>
        )}
      </div>
    </section>
  )
}
