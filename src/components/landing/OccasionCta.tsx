import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Props {
  posterType: 'map' | 'star-map'
  /** Locale-prefixed editor path: `/de/map` or `/de/star-map`. */
  href: string
  /** Optional override; default labels are sensible. */
  headline?: string
  description?: string
  ctaLabel?: string
}

/**
 * Closing call-to-action block on an occasion landing page. Sends users into
 * the editor specified by `ctaPosterType` from the Sanity-Doc.
 */
export function OccasionCta({
  posterType,
  href,
  headline,
  description,
  ctaLabel,
}: Props) {
  const defaultHeadline =
    posterType === 'star-map'
      ? 'Gestalte deine Sternenkarte'
      : 'Gestalte dein Karten-Poster'
  const defaultDescription =
    'Such den Ort, wähle Stil und Farben, füge deinen Text hinzu — in wenigen Minuten ist dein Poster fertig.'
  const defaultCta = 'Jetzt loslegen'

  return (
    <section className="bg-muted py-16 sm:py-20">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 text-center">
        <h2 className="text-2xl sm:text-3xl font-bold text-foreground">
          {headline ?? defaultHeadline}
        </h2>
        <p className="mt-4 text-muted-foreground text-base sm:text-lg">
          {description ?? defaultDescription}
        </p>
        <Button asChild size="lg" className="mt-8">
          <Link href={href}>
            {ctaLabel ?? defaultCta}
            <ArrowRight className="w-4 h-4 ml-2" />
          </Link>
        </Button>
      </div>
    </section>
  )
}
