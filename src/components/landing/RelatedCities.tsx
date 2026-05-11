import Image from 'next/image'
import Link from 'next/link'
import { buildCityPagePath } from '@/lib/city-routing'
import type { Locale } from '@/i18n/config'

export interface RelatedCity {
  cityId: string  // == cities.slug_base
  name: string
  /** Slug aus cityPage.slug.current — bestimmt die Ziel-URL. */
  citySlug: string
  /** Hero-Render-URL (Featured-Style "original") fuer das Card-Thumbnail. */
  thumbnailUrl: string | null
}

interface Props {
  locale: Locale
  /** Bereits gefilterte + sortierte Liste verwandter Staedte (max 6). */
  cities: RelatedCity[]
  /** i18n: H2 ueber dem Grid (z.B. "Weitere Stadtkarten"). */
  heading: string
}

/**
 * PROJ-42: "Verwandte Staedte"-Sektion am Ende jeder Stadt-Seite. Sechs
 * Cards mit Stadt-Render-Thumbnail + Stadtnamen. Internal-Linking-Boost +
 * Engagement-Hebel.
 *
 * Auswahl-Logik (Server-seitig vor dem Render): same country_code +
 * same region (falls vorhanden), sortiert nach population DESC, mit
 * Auffuell-Fallback auf Same-Country wenn < 6 in der Region. Cards
 * verlinken nur, wenn das Ziel-Stadt-Sanity-Doc in der aktuellen Locale
 * existiert.
 */
export function RelatedCities({ locale, cities, heading }: Props) {
  if (!cities || cities.length === 0) return null
  return (
    <section className="py-12 sm:py-16 bg-background">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
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
                      alt={`Stadtkarte ${city.name}`}
                      fill
                      sizes="(max-width: 640px) 50vw, 33vw"
                      loading="lazy"
                      className="object-cover transition-transform group-hover:scale-[1.02]"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-xs">
                      {city.name}
                    </div>
                  )}
                </div>
                <div className="p-3 text-center">
                  <span className="text-sm font-medium text-foreground">
                    {city.name}
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
