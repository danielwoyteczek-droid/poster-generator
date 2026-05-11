import Image from 'next/image'
import Link from 'next/link'
import { buildCityPagePath } from '@/lib/city-routing'
import type { Locale } from '@/i18n/config'

export interface HubCityCard {
  cityId: string  // == cities.slug_base
  cityName: string
  citySlug: string  // cityPage.slug.current
  thumbnailUrl: string | null
}

interface Props {
  locale: Locale
  cities: HubCityCard[]
  heading: string
  /** i18n strings shown when the locale-hub has no live cities yet. */
  emptyHeadline: string
  emptySubline: string
}

/**
 * PROJ-44: City-Grid auf dem Hub. Re-nutzt das visuelle Pattern aus
 * RelatedCities (aspect-2/3 thumbnails, rounded border, hover-scale).
 * Mobile-first: 2 Spalten ≤ sm, 3 Spalten sm+.
 *
 * Wenn 0 Staedte gelistet sind (z. B. EN-Hub vor Phase-2-Rollout):
 * zeigt eine "Coming soon"-Notiz statt einem leeren Grid.
 */
export function HubCityGrid({
  locale,
  cities,
  heading,
  emptyHeadline,
  emptySubline,
}: Props) {
  if (!cities || cities.length === 0) {
    return (
      <section className="py-12 sm:py-16 bg-background">
        <div className="max-w-3xl mx-auto px-6 sm:px-6 text-center">
          <h2 className="text-2xl sm:text-3xl font-semibold text-foreground mb-3">
            {emptyHeadline}
          </h2>
          <p className="text-base sm:text-lg text-muted-foreground">
            {emptySubline}
          </p>
        </div>
      </section>
    )
  }

  return (
    <section className="py-12 sm:py-16 bg-background">
      <div className="max-w-5xl mx-auto px-6 sm:px-6">
        <h2 className="text-2xl sm:text-3xl font-semibold text-foreground text-center mb-8">
          {heading}
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 sm:gap-6">
          {cities.map((city) => {
            const href = buildCityPagePath(locale, city.citySlug)
            return (
              <Link
                key={city.cityId}
                href={href}
                className="group rounded-lg overflow-hidden border border-border bg-white hover:border-foreground/40 hover:shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-foreground/30 focus:ring-offset-2"
              >
                <div className="relative aspect-[2/3] bg-muted">
                  {city.thumbnailUrl ? (
                    <Image
                      src={city.thumbnailUrl}
                      alt={`Stadtkarte ${city.cityName}`}
                      fill
                      sizes="(max-width: 640px) 50vw, 33vw"
                      loading="lazy"
                      className="object-cover transition-transform group-hover:scale-[1.02]"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-xs">
                      {city.cityName}
                    </div>
                  )}
                </div>
                <div className="p-3 text-center">
                  <span className="text-sm font-medium text-foreground">
                    {city.cityName}
                  </span>
                </div>
              </Link>
            )
          })}
        </div>
      </div>
    </section>
  )
}
