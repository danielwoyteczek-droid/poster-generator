import Image from 'next/image'
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
