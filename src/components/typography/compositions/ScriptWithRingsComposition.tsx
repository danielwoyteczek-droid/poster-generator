'use client'

import { ScriptText } from '../foundations/ScriptText'
import { Footer } from '../foundations/Footer'
import type { TypographyTemplate, TypographyPalette, TypographyFont } from '@/lib/typography-templates'

/**
 * Composition für Templates wie das "ja"-Klassisch-Design (siehe PROJ-46
 * Design-Referenz Lena & Marc): Script-Wort in der oberen Bildhälfte mit
 * horizontalem Flourish, Footer mit Ringen + Namen + Datum unten.
 *
 * Layout-Anteile (vertikal, % der Canvas-Höhe):
 *   Top-Padding         ~30%
 *   Script-Hero         ~30%  (visuelles Zentrum)
 *   Mid-Spacer          ~25%
 *   Footer              ~12%
 *   Bottom-Padding       ~3%
 */
interface ScriptWithRingsCompositionProps {
  template: TypographyTemplate
  palette: TypographyPalette
  font: TypographyFont
  heroText: string
  name1: string
  name2: string
  formattedDate: string
  /** Canvas-Höhe in logischen Pixeln — Font-Größen werden daraus abgeleitet. */
  canvasHeight: number
}

export function ScriptWithRingsComposition({
  template,
  palette,
  font,
  heroText,
  name1,
  name2,
  formattedDate,
  canvasHeight,
}: ScriptWithRingsCompositionProps) {
  // Font-Größen sind relativ zur Canvas-Höhe → A2 wirkt nicht riesig, A4
  // nicht winzig. Werte aus Etsy-Bestseller-Analyse:
  //   Hero ~28 % der Canvas-Höhe (das "ja" ist das dominierende Element)
  //   Names ~3.5 % (klein, klassisch)
  //   Datum ~2.5 %
  const heroSize = Math.round(canvasHeight * 0.28)
  const namesSize = Math.round(canvasHeight * 0.035)
  const dateSize = Math.round(canvasHeight * 0.025)

  const symbol =
    (template.decorationParams?.symbolBetweenNames as 'rings' | 'heart' | 'none' | undefined) ?? 'rings'

  return (
    <div
      className="w-full h-full flex flex-col items-center px-[10%] py-[8%]"
      style={{ background: palette.background }}
    >
      {/* Top-Spacer */}
      <div className="flex-[3] min-h-0" aria-hidden />

      {/* Hero */}
      <div className="w-full flex items-center justify-center">
        <ScriptText
          text={heroText || ' '}
          fontFamily={font.heroFamily}
          color={palette.ink}
          fontSize={heroSize}
          showFlourish
        />
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
