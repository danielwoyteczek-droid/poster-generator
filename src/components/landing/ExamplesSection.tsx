import Image from 'next/image'
import Link from 'next/link'
import { getTranslations, getLocale } from 'next-intl/server'
import { getHomepage } from '@/sanity/queries'
import { urlFor } from '@/sanity/client'

interface ExampleItem {
  src: string
  alt: string
  label: string
  href: string
  key: string
}

export async function ExamplesSection() {
  const t = await getTranslations('examples')
  const locale = await getLocale().catch(() => 'de')
  const homepage = await getHomepage(locale)

  const sanityExamples = homepage?.examplesImages ?? []
  const examples: ExampleItem[] =
    sanityExamples.length > 0
      ? sanityExamples.map((ex, idx) => ({
          key: ex.image.asset?._ref ?? `sanity-${idx}`,
          src: urlFor(ex.image).width(800).format('webp').url(),
          alt: ex.image.alt ?? ex.label ?? 'Beispiel-Poster',
          label: ex.label ?? '',
          href: ex.href ?? '/map',
        }))
      : [
          { key: 'fallback-1', src: '/example-1.webp', alt: t('cityPoster'), label: t('cityPoster'), href: '/map' },
          { key: 'fallback-2', src: '/example-2.webp', alt: t('starPoster'), label: t('starPoster'), href: '/star-map' },
        ]

  return (
    <section id="examples" className="py-24 bg-muted">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground">
            {t('heading')}
          </h2>
          <p className="mt-4 text-muted-foreground text-lg max-w-xl mx-auto">
            {t('subtitle')}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 max-w-3xl mx-auto">
          {examples.map((ex) => (
            <Link
              key={ex.key}
              href={ex.href}
              className="flex flex-col items-center gap-3 group"
            >
              <div
                className="w-full relative bg-muted rounded-xl overflow-hidden shadow-lg group-hover:shadow-xl transition-shadow"
                style={{ aspectRatio: '2/3' }}
              >
                <Image
                  src={ex.src}
                  alt={ex.alt}
                  fill
                  sizes="(max-width: 640px) 100vw, 50vw"
                  className="object-cover"
                />
              </div>
              {ex.label && (
                <p className="text-sm font-medium text-foreground/70 group-hover:text-foreground transition-colors">
                  {ex.label}
                </p>
              )}
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
