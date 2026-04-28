import Image from 'next/image'
import Link from 'next/link'
import { GalleryPresetCard, type GalleryPreset } from './GalleryPresetCard'
import { urlFor } from '@/sanity/client'
import type { SanityImage } from '@/sanity/queries'

interface Props {
  tag: string
  label: string
  subline?: string
  categoryImage?: SanityImage
  presets: GalleryPreset[]
  posterTypeMapLabel: string
  posterTypeStarMapLabel: string
  /** When set, render a "More about this occasion →" link below the heading.
   *  The parent (gallery page) pre-fetches the locale's occasion-page slugs
   *  in one query so individual sections don't trigger N+1 lookups. */
  occasionPageHref?: string
  /** Localized label for the cross-link, e.g. "Mehr zum Anlass →". Required
   *  when `occasionPageHref` is set. */
  occasionPageLinkLabel?: string
}

/**
 * One occasion-section in the gallery. Renders heading + optional subline +
 * optional mood image + a card grid. The `id={tag}` enables anchor links
 * like /gallery#muttertag for direct deep-linking from emails or ads.
 */
export function GallerySection({
  tag,
  label,
  subline,
  categoryImage,
  presets,
  posterTypeMapLabel,
  posterTypeStarMapLabel,
  occasionPageHref,
  occasionPageLinkLabel,
}: Props) {
  const moodUrl = categoryImage
    ? urlFor(categoryImage).width(800).format('webp').url()
    : null
  const moodAlt = categoryImage?.alt ?? label

  return (
    <section
      id={tag}
      className="py-16 sm:py-20 border-b border-border last:border-b-0 scroll-mt-20"
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="mb-10 max-w-3xl">
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground">{label}</h2>
          {subline && (
            <p className="mt-3 text-muted-foreground text-base sm:text-lg">{subline}</p>
          )}
          {occasionPageHref && occasionPageLinkLabel && (
            <Link
              href={occasionPageHref}
              className="inline-block mt-4 text-sm font-medium text-primary hover:underline"
            >
              {occasionPageLinkLabel}
            </Link>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6 sm:gap-8">
          {moodUrl && (
            <div className="col-span-2 sm:col-span-3 lg:col-span-1 lg:row-span-2 rounded-xl overflow-hidden bg-muted relative aspect-[3/4] sm:aspect-[4/3] lg:aspect-[2/3]">
              <Image
                src={moodUrl}
                alt={moodAlt}
                fill
                sizes="(max-width: 1024px) 100vw, 25vw"
                className="object-cover"
                loading="lazy"
              />
            </div>
          )}
          {presets.map((preset) => (
            <GalleryPresetCard
              key={preset.id}
              preset={preset}
              posterTypeMapLabel={posterTypeMapLabel}
              posterTypeStarMapLabel={posterTypeStarMapLabel}
            />
          ))}
        </div>
      </div>
    </section>
  )
}
