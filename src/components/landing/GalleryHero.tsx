import Image from 'next/image'
import { urlFor } from '@/sanity/client'
import type { SanityImage } from '@/sanity/queries'

interface Props {
  headline: string
  subline?: string
  heroImage?: SanityImage
}

/**
 * Top section of the gallery page. Renders an optional hero image (full-width
 * banner with text overlay) when Sanity provides one, otherwise a clean
 * text-only header. Server component — no interactivity needed.
 */
export function GalleryHero({ headline, subline, heroImage }: Props) {
  const imageUrl = heroImage ? urlFor(heroImage).width(2000).format('webp').url() : null
  const imageAlt = heroImage?.alt ?? headline

  if (imageUrl) {
    return (
      <section className="relative h-[40vh] min-h-[280px] flex items-center justify-center overflow-hidden">
        <Image
          src={imageUrl}
          alt={imageAlt}
          fill
          className="object-cover"
          priority
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-black/30" aria-hidden />
        <div className="relative max-w-3xl mx-auto px-4 sm:px-6 text-center text-white">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold drop-shadow-md">
            {headline}
          </h1>
          {subline && (
            <p className="mt-4 text-base sm:text-lg text-white/90 max-w-xl mx-auto drop-shadow">
              {subline}
            </p>
          )}
        </div>
      </section>
    )
  }

  return (
    <section className="bg-muted py-16 sm:py-20">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground">
          {headline}
        </h1>
        {subline && (
          <p className="mt-4 text-base sm:text-lg text-muted-foreground max-w-xl mx-auto">
            {subline}
          </p>
        )}
      </div>
    </section>
  )
}
