import Link from 'next/link'
import { LayoutTemplate, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Props {
  title: string
  description: string
  ctaLabel: string
  ctaHref: string
}

/**
 * Shown when no gallery sections have any presets in the current locale.
 * Could happen on early launch (no presets tagged yet) or for locales
 * Marketing hasn't curated yet. Always offers a path forward via the CTA.
 */
export function GalleryEmpty({ title, description, ctaLabel, ctaHref }: Props) {
  return (
    <section className="py-24">
      <div className="max-w-xl mx-auto px-4 sm:px-6 text-center">
        <div className="w-16 h-16 mx-auto rounded-full bg-muted flex items-center justify-center text-muted-foreground/60 mb-6">
          <LayoutTemplate className="w-8 h-8" />
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold text-foreground">{title}</h2>
        <p className="mt-4 text-muted-foreground text-base sm:text-lg">{description}</p>
        <Button asChild size="lg" className="mt-8">
          <Link href={ctaHref}>
            {ctaLabel}
            <ArrowRight className="w-4 h-4 ml-2" />
          </Link>
        </Button>
      </div>
    </section>
  )
}
