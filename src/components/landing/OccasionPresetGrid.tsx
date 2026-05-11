import { LayoutTemplate } from 'lucide-react'
import { GalleryPresetCard, type GalleryPreset } from './GalleryPresetCard'
import { PresetCarousel } from './PresetCarousel'
import { getOccasions } from '@/lib/occasions-server'

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

type LabelLocale = 'de' | 'en' | 'fr' | 'it' | 'es'
const FALLBACK_LOCALE: LabelLocale = 'de'

function getLabelLocale(locale: string): LabelLocale {
  const allowed: LabelLocale[] = ['de', 'en', 'fr', 'it', 'es']
  return (allowed as readonly string[]).includes(locale)
    ? (locale as LabelLocale)
    : FALLBACK_LOCALE
}

async function resolveOccasionDisplay(occasion: string, locale: LabelLocale): Promise<string> {
  const occasions = await getOccasions()
  const entry = occasions.find((o) => o.code === occasion)
  if (!entry) return occasion
  return entry.localizedTitles[locale] ?? entry.title
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
export async function OccasionPresetGrid({
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
  const occasionDisplay = await resolveOccasionDisplay(occasion, labelLocale)

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
              hideFormatSwitcher
            />
          ))}
        </PresetCarousel>
      </div>
    </section>
  )
}

async function PlaceholderCarousel({ occasion, locale }: { occasion: string; locale: string }) {
  const labelLocale = getLabelLocale(locale)
  const occasionDisplay = await resolveOccasionDisplay(occasion, labelLocale)
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
