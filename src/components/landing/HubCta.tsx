import Link from 'next/link'
import { Button } from '@/components/ui/button'

interface Props {
  href: string
  headline: string
  subline?: string
  buttonLabel: string
}

/**
 * PROJ-44: Hub-CTA — "Stadt nicht dabei? → Editor". Catches users who
 * didn't find their city in the grid and steers them to the free editor.
 */
export function HubCta({ href, headline, subline, buttonLabel }: Props) {
  return (
    <section className="py-12 sm:py-16 bg-muted">
      <div className="max-w-2xl mx-auto px-6 sm:px-6 text-center">
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
