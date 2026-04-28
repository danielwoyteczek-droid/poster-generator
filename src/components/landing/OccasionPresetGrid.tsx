import { LayoutTemplate } from 'lucide-react'
import { GalleryPresetCard, type GalleryPreset } from './GalleryPresetCard'
import { PresetCarousel } from './PresetCarousel'
import { occasionLabels, type OccasionCode } from '@/lib/occasions'

interface Props {
  occasion: string
  /** Locale-code, used to pick the German/English/etc. occasion label. */
  locale: string
  presets: GalleryPreset[]
  posterTypeMapLabel: string
  posterTypeStarMapLabel: string
  /** When true, render placeholder cards if `presets` is empty so marketing
   *  can preview the section's visual weight. Production mode (without
   *  preview) hides the section entirely on empty per spec. */
  showPlaceholder?: boolean
}

const FALLBACK_LOCALE = 'de'

function getLabelLocale(locale: string): keyof (typeof occasionLabels)['muttertag'] {
  const allowed = ['de', 'en', 'fr', 'it', 'es'] as const
  return (allowed as readonly string[]).includes(locale)
    ? (locale as (typeof allowed)[number])
    : FALLBACK_LOCALE
}

/**
 * Mini gallery on an occasion landing page — presented as a single-card
 * carousel with dot pagination (no native scrollbar). Cards sind responsive:
 * 2:3 auf Mobile (zeigt nackte Poster-Previews ohne Crop) und 1:1 auf Desktop
 * (für Room-Mockup-Composites aus PROJ-30, die in zwei Varianten gerendert
 * werden).
 *
 * Production rule (per spec): hide the entire section when no presets match,
 * so the storytelling + CTA still feel intentional. Preview mode breaks this
 * rule and renders placeholder tiles so marketing can see the layout.
 */
export function OccasionPresetGrid({
  occasion,
  locale,
  presets,
  posterTypeMapLabel,
  posterTypeStarMapLabel,
  showPlaceholder = false,
}: Props) {
  if (!presets || presets.length === 0) {
    if (!showPlaceholder) return null
    return <PlaceholderCarousel occasion={occasion} locale={locale} />
  }

  const labelLocale = getLabelLocale(locale)
  const occasionDisplay = occasionLabels[occasion as OccasionCode]?.[labelLocale] ?? occasion

  return (
    <section className="py-12 sm:py-16 bg-muted">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-8 max-w-2xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-semibold text-foreground">
            Inspiration für deine {occasionDisplay}-Karte
          </h2>
          <p className="mt-3 text-muted-foreground text-base">
            Klick auf eines der Designs und passe Ort, Text und Stil im Editor an.
          </p>
        </div>
        <PresetCarousel itemLabel="Vorlage">
          {presets.map((preset) => (
            <GalleryPresetCard
              key={preset.id}
              preset={preset}
              posterTypeMapLabel={posterTypeMapLabel}
              posterTypeStarMapLabel={posterTypeStarMapLabel}
              aspectClassName="aspect-[2/3] md:aspect-square"
              objectFitClassName="object-cover md:object-contain"
            />
          ))}
        </PresetCarousel>
      </div>
    </section>
  )
}

function PlaceholderCarousel({ occasion, locale }: { occasion: string; locale: string }) {
  const labelLocale = getLabelLocale(locale)
  const occasionDisplay = occasionLabels[occasion as OccasionCode]?.[labelLocale] ?? occasion
  const placeholders = [0, 1, 2, 3]
  return (
    <section className="py-12 sm:py-16 bg-muted">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-8 max-w-2xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-semibold text-foreground">
            Inspiration für deine {occasionDisplay}-Karte
          </h2>
          <p className="mt-3 text-muted-foreground text-base">
            Hier erscheinen Vorlagen, sobald im Admin Presets mit dem Anlass-Tag
            <code className="mx-1 px-1.5 py-0.5 rounded bg-background border border-border text-xs font-mono">
              {occasion}
            </code>
            getaggt sind.
          </p>
        </div>
        <PresetCarousel itemLabel="Vorlage">
          {placeholders.map((i) => (
            <div key={i} className="flex flex-col gap-3">
              <div className="aspect-[2/3] md:aspect-square rounded-xl border-2 border-dashed border-border bg-background flex items-center justify-center text-muted-foreground/50">
                <LayoutTemplate className="w-12 h-12" />
              </div>
              <p className="text-sm font-medium text-muted-foreground/60 text-center">
                Vorlage {i + 1}
              </p>
            </div>
          ))}
        </PresetCarousel>
      </div>
    </section>
  )
}
