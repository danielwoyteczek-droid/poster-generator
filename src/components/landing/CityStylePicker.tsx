'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { type FeaturedStyle, getFeaturedStyleLabel } from '@/lib/featured-styles'
import type { Locale } from '@/i18n/config'

export interface CityStylePickerRender {
  styleId: string
  imageUrl: string
}

interface Props {
  locale: Locale
  citySlugBase: string
  styles: readonly FeaturedStyle[]
  /** Pro Style die Storage-URL des fertigen Renders. */
  renders: CityStylePickerRender[]
  /** i18n: Headline ueber dem Picker (z.B. "Waehle deinen Stil"). */
  pickerHeading: string
  /** i18n: CTA-Button-Label (z.B. "Eigene Stadtkarte gestalten"). */
  ctaLabel: string
  cityName: string
}

/**
 * PROJ-42 Stadt-Seiten-Style-Picker. Zeigt 3 Render-Cards in einem Grid,
 * der User waehlt einen Style → Visual-Highlight auf der Card +
 * CTA-Button-Link aktualisiert sich. CTA fuehrt in /[locale]/map mit
 * vorgeladener Stadt + ausgewaehltem Style.
 *
 * Client-Component-Insel: alles andere auf der Seite ist Server-Component.
 */
export function CityStylePicker({
  locale,
  citySlugBase,
  styles,
  renders,
  pickerHeading,
  ctaLabel,
  cityName,
}: Props) {
  const renderByStyle = new Map(renders.map((r) => [r.styleId, r.imageUrl]))
  const availableStyles = styles.filter((s) => renderByStyle.has(s.id))
  const [selectedId, setSelectedId] = useState<string>(
    availableStyles[0]?.id ?? styles[0]?.id ?? '',
  )

  const ctaHref = `/${locale}/map?city=${encodeURIComponent(citySlugBase)}&style=${encodeURIComponent(selectedId)}`

  if (availableStyles.length === 0) {
    return null
  }

  return (
    <section className="py-12 sm:py-16 bg-background">
      <div className="max-w-5xl mx-auto px-6 sm:px-6">
        <h2 className="text-xl sm:text-2xl font-semibold text-center text-foreground mb-8">
          {pickerHeading}
        </h2>

        {/*
         * Mobile: horizontal snap-scroll-Slider (1 Karte sichtbar, swipe zur
         * naechsten). Pattern aus PROJ-18 Mobile-Editor: `-mx-6 px-6` zieht
         * den Container an die Bildschirmraender (negativer outer-margin)
         * waehrend das innere padding die erste Card mit der Body-Linke
         * ausrichtet. `w-[85%]` zeigt einen Peek auf die naechste Karte als
         * Swipe-Affordance.
         *
         * sm+ (≥640px): wieder als 3-col-Grid ohne Scroll.
         */}
        <div className="flex sm:grid sm:grid-cols-3 gap-4 sm:gap-6 mb-10 overflow-x-auto sm:overflow-visible snap-x snap-mandatory sm:snap-none -mx-6 px-6 sm:-mx-0 sm:px-0 pb-2 sm:pb-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {availableStyles.map((style, index) => {
            const isSelected = style.id === selectedId
            const imageUrl = renderByStyle.get(style.id)!
            return (
              <button
                key={style.id}
                type="button"
                onClick={() => setSelectedId(style.id)}
                aria-pressed={isSelected}
                aria-label={`${getFeaturedStyleLabel(style, locale)} Stadtkarte ${cityName}`}
                className={cn(
                  'group flex flex-col rounded-xl border-2 bg-white overflow-hidden transition-all',
                  'focus:outline-none focus:ring-2 focus:ring-foreground/30 focus:ring-offset-2',
                  'flex-shrink-0 w-[80%] snap-center sm:w-auto sm:flex-shrink',
                  isSelected
                    ? 'border-foreground shadow-md'
                    : 'border-border hover:border-foreground/40 hover:shadow-sm',
                )}
              >
                <div className="relative aspect-[2/3] bg-muted">
                  <Image
                    src={imageUrl}
                    alt={`${getFeaturedStyleLabel(style, locale)} Stadtkarte ${cityName}`}
                    fill
                    sizes="(max-width: 640px) 80vw, 33vw"
                    loading={index === 0 ? 'eager' : 'lazy'}
                    priority={index === 0}
                    className="object-cover transition-transform group-hover:scale-[1.02]"
                  />
                </div>
                <div className="p-3 flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">
                    {getFeaturedStyleLabel(style, locale)}
                  </span>
                  {isSelected && (
                    <span className="text-xs font-semibold uppercase tracking-wider text-foreground/80">
                      ✓
                    </span>
                  )}
                </div>
              </button>
            )
          })}
        </div>

        <div className="text-center">
          <Button asChild size="lg">
            <Link href={ctaHref}>{ctaLabel}</Link>
          </Button>
        </div>
      </div>
    </section>
  )
}
