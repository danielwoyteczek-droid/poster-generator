'use client'

import { SvgHero } from '../foundations/SvgHero'
import { Footer } from '../foundations/Footer'
import type { TypographyTemplate, TypographyPalette, TypographyFont } from '@/lib/typography-templates'

/**
 * Composition für Templates mit einem **vorgefertigten SVG-Asset** als
 * Hero (statt Italic-Text). Behält ansonsten dasselbe Layout wie
 * ScriptWithRingsComposition: Hero zentriert in der oberen Bildhälfte,
 * Footer mit Symbol + Namen + Datum unten.
 *
 * Das SVG wird via CSS-Mask in der Palette.ink-Farbe eingefärbt — eine
 * einzige Asset-Datei reicht für alle 6 Paletten.
 *
 * Asset-Pfad kommt aus template.decorationParams.svgSrc (Sanity in Phase 2;
 * im MVP hardcoded ab /typography-assets/hero/).
 */
interface SvgHeroWithRingsCompositionProps {
  template: TypographyTemplate
  palette: TypographyPalette
  font: TypographyFont
  /** Hero-Text wird hier ignoriert (Asset ist fix). */
  heroText: string
  name1: string
  name2: string
  formattedDate: string
  canvasHeight: number
}

export function SvgHeroWithRingsComposition({
  template,
  palette,
  font,
  heroText,
  name1,
  name2,
  formattedDate,
  canvasHeight,
}: SvgHeroWithRingsCompositionProps) {
  const svgSrc = (template.decorationParams?.svgSrc as string | undefined) ?? null
  const symbol =
    (template.decorationParams?.symbolBetweenNames as 'rings' | 'heart' | 'none' | undefined) ?? 'rings'

  // Hero-Asset nimmt ~32 % der Canvas-Höhe ein (etwas größer als Text-Variante,
  // weil SVGs typischerweise tighter framing haben).
  const heroHeight = Math.round(canvasHeight * 0.32)
  // Asset-Aspect ist breit (Wort + Flourish), daher Breite ~ 65 % der Canvas:
  const heroWidth = Math.round(canvasHeight * 0.65 * (1000 / 600)) // viewBox-Ratio aus script-ja.svg

  const namesSize = Math.round(canvasHeight * 0.035)
  const dateSize = Math.round(canvasHeight * 0.025)

  return (
    <div
      className="w-full h-full flex flex-col items-center px-[10%] py-[8%]"
      style={{ background: palette.background }}
    >
      {/* Top-Spacer */}
      <div className="flex-[3] min-h-0" aria-hidden />

      {/* Hero — entweder SVG-Asset, oder Fallback-Text falls Asset fehlt */}
      <div className="w-full flex items-center justify-center">
        {svgSrc ? (
          <SvgHero
            src={svgSrc}
            width={heroWidth}
            height={heroHeight}
            color={palette.ink}
            alt={heroText}
          />
        ) : (
          <div
            className="italic"
            style={{
              fontFamily: font.heroFamily,
              fontSize: heroHeight,
              color: palette.ink,
              lineHeight: 1,
            }}
          >
            {heroText || ' '}
          </div>
        )}
      </div>

      {/* Mid-Spacer */}
      <div className="flex-[5] min-h-0" aria-hidden />

      {/* Footer */}
      <Footer
        name1={name1}
        name2={name2}
        formattedDate={formattedDate}
        fontFamily={font.footerFamily}
        color={palette.ink}
        namesFontSize={namesSize}
        dateFontSize={dateSize}
        symbol={symbol}
      />
    </div>
  )
}
