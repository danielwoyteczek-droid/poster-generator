import Link from 'next/link'
import { Button } from '@/components/ui/button'

interface Props {
  /** Pre-filled CTA link, e.g. /de/map?city=hamburg&style=original */
  href: string
  /** i18n: H2 text, e.g. "Bereit fuer dein Hamburg-Poster?" */
  headline: string
  /** i18n: Sub-headline below H2 */
  subline?: string
  /** i18n: Button text, e.g. "Eigene Stadtkarte gestalten" */
  buttonLabel: string
}

/**
 * PROJ-42: Stadt-Seite-CTA-Block. Identisch im Look zur Anlass-Seite-CTA
 * (PROJ-29), aber Stadt-spezifischer Text. Fuehrt in den Map-Editor mit
 * vorgeladener Stadt + ausgewaehltem Style.
 */
export function CityCta({ href, headline, subline, buttonLabel }: Props) {
  return (
    <section className="py-12 sm:py-16 bg-muted">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 text-center">
        <h2 className="text-2xl sm:text-3xl font-semibold text-foreground mb-3">
          {headline}
        </h2>
        {subline && (
          <p className="text-base sm:text-lg text-muted-foreground mb-6">
            {subline}
          </p>
        )}
        <Button asChild size="lg">
          <Link href={href}>{buttonLabel}</Link>
        </Button>
      </div>
    </section>
  )
}
