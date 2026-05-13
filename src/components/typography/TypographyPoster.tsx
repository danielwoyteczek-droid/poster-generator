'use client'

import { useLocale } from 'next-intl'
import { useTypographyEditorStore } from '@/hooks/useTypographyEditorStore'
import {
  getTypographyTemplate,
  getTypographyPalette,
  getTypographyFont,
} from '@/lib/typography-templates'
import { formatWeddingDate } from '@/lib/format-wedding-date'
import { ScriptWithRingsComposition } from './compositions/ScriptWithRingsComposition'
import { SvgHeroWithRingsComposition } from './compositions/SvgHeroWithRingsComposition'
import type { Locale } from '@/i18n/config'

/**
 * PROJ-46: Top-Level-Renderer für ein Typografie-Hochzeitsposter.
 *
 * Resolved templateKey → Composition-Component und passt Palette/Font/Texte
 * von außen. Composition-Key-Mapping ist die zentrale Indirektion zwischen
 * datengetriebenen Templates und React-Components.
 *
 * canvasHeight wird vom Caller (TypographyCanvas) übergeben — der Canvas
 * lebt im Logical-Pixel-Space (PROJ-37) und kennt seine logische Höhe.
 */
interface TypographyPosterProps {
  canvasHeight: number
}

export function TypographyPoster({ canvasHeight }: TypographyPosterProps) {
  const locale = useLocale() as Locale
  const templateKey = useTypographyEditorStore((s) => s.templateKey)
  const heroText = useTypographyEditorStore((s) => s.heroText)
  const name1 = useTypographyEditorStore((s) => s.name1)
  const name2 = useTypographyEditorStore((s) => s.name2)
  const weddingDate = useTypographyEditorStore((s) => s.weddingDate)
  const paletteId = useTypographyEditorStore((s) => s.paletteId)
  const fontKey = useTypographyEditorStore((s) => s.fontKey)

  const template = getTypographyTemplate(templateKey)
  if (!template) {
    return (
      <div className="w-full h-full bg-white flex items-center justify-center text-sm text-muted-foreground">
        Template unbekannt: {templateKey}
      </div>
    )
  }

  const palette = getTypographyPalette(paletteId)
  const font = getTypographyFont(fontKey)
  const formattedDate = formatWeddingDate(weddingDate, locale)

  switch (template.composition) {
    case 'script-with-rings':
      return (
        <ScriptWithRingsComposition
          template={template}
          palette={palette}
          font={font}
          heroText={heroText}
          name1={name1}
          name2={name2}
          formattedDate={formattedDate}
          canvasHeight={canvasHeight}
        />
      )
    case 'svg-hero-with-rings':
      return (
        <SvgHeroWithRingsComposition
          template={template}
          palette={palette}
          font={font}
          heroText={heroText}
          name1={name1}
          name2={name2}
          formattedDate={formattedDate}
          canvasHeight={canvasHeight}
        />
      )
    default:
      return (
        <div
          className="w-full h-full flex items-center justify-center"
          style={{ background: palette.background, color: palette.ink }}
        >
          Composition "{template.composition}" coming soon
        </div>
      )
  }
}
