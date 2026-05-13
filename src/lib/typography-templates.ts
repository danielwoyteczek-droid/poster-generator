/**
 * PROJ-46: Typografie-Hochzeitsposter ("Liebespapier") — Template-Definitionen.
 *
 * Im MVP hardcoded; sobald die Foundation-Library validiert ist und mehr als
 * ~5 Templates entstehen, werden diese in Sanity überführt (Schema
 * `typographyTemplate`, siehe Spec-Sektion B). Bis dahin lebt jedes Template
 * hier als `TypographyTemplate`-Eintrag und wird via templateKey aufgelöst.
 *
 * Composition-Keys (z. B. 'script-with-rings') sind die zentrale Indirektion:
 * sie mappen auf eine konkrete React-Composition aus
 * `src/components/typography/foundations/`. So bleiben Template-Daten von
 * Render-Implementierung getrennt.
 */

import type { Locale } from '@/i18n/config'

export type TypographyCompositionKey =
  | 'script-with-rings'        // Italic-Text-Hero (Phase 1 Fallback)
  | 'svg-hero-with-rings'      // Vorgefertigtes SVG-Asset als Hero + Ring-Symbol + Footer
  | 'layered-bigtype-script'   // Großes BG-Wort/-Zahl + Script-Overlay + Footer mit Herz
  | 'line-art-heart'           // Single-Line-Heart-SVG + Footer
  | 'bigtype-grid-overlay'     // Großes Wort 2x2-Grid + Script-Names überlagert + Datum

export interface TypographyTemplate {
  /** Stabiler technischer Key — wird in URL + Render-Cache verwendet. */
  templateKey: string
  /** Lokalisiertes Anzeigelabel für die Galerie. */
  label: Record<Locale, string>
  /** Welche Foundation-Composition wird gerendert. */
  composition: TypographyCompositionKey
  /** True → Hero-Text-Editor-Feld im Editor anzeigen. */
  hasHeroText: boolean
  /** Vorausgefüllter Hero-Text pro Locale (nur relevant wenn hasHeroText). */
  defaultHeroText?: Record<Locale, string>
  /** Composition-spezifische Render-Parameter (z. B. Background-Letter-Inhalt,
   *  SVG-Pfad-Daten, Symbol-Variante). Wird vom Composer-Component konsumiert. */
  decorationParams?: Record<string, unknown>
  /** Default-Palette-ID (siehe TYPOGRAPHY_PALETTES). */
  defaultPaletteId: string
  /** Default-Font-Key (siehe TYPOGRAPHY_FONTS). */
  defaultFontKey: string
  /** Sortier-Order in der Galerie (kleiner = weiter vorne). */
  order: number
  /** Aktiv → in Galerie sichtbar. */
  active: boolean
}

const SCRIPT_JA: TypographyTemplate = {
  templateKey: 'script-ja-classic',
  label: {
    de: 'Ja — Klassisch',
    en: 'Yes — Classic',
    fr: 'Oui — Classique',
    it: 'Sì — Classico',
    es: 'Sí — Clásico',
  },
  composition: 'svg-hero-with-rings',
  hasHeroText: false, // SVG-Asset ist fix; Customer wählt Template-Variante statt Text
  defaultHeroText: {
    de: 'ja',
    en: 'yes',
    fr: 'oui',
    it: 'sì',
    es: 'sí',
  },
  decorationParams: {
    svgSrc: '/typography-assets/hero/script-ja.svg',
    symbolBetweenNames: 'rings',
  },
  defaultPaletteId: 'classic-cream',
  defaultFontKey: 'cormorant-italic',
  order: 1,
  active: true,
}

export const TYPOGRAPHY_TEMPLATES: readonly TypographyTemplate[] = [
  SCRIPT_JA,
] as const

/** Lookup, falls templateKey vom Customer (URL) oder LocalStorage kommt. */
export function getTypographyTemplate(key: string): TypographyTemplate | null {
  return TYPOGRAPHY_TEMPLATES.find((t) => t.templateKey === key) ?? null
}

export const DEFAULT_TYPOGRAPHY_TEMPLATE_KEY = SCRIPT_JA.templateKey


// ─── Paletten ──────────────────────────────────────────────────────────────

export interface TypographyPalette {
  id: string
  label: Record<Locale, string>
  /** Hintergrund-Tint des Posters. */
  background: string
  /** Tinten-Farbe für Decoration + Footer. */
  ink: string
  /** Optional: gedämpfter Akzentton für BG-Layer (z. B. „LOVE" in Beige). */
  accent: string
}

export const TYPOGRAPHY_PALETTES: readonly TypographyPalette[] = [
  {
    id: 'classic-cream',
    label: { de: 'Classic Cream', en: 'Classic Cream', fr: 'Crème Classique', it: 'Crema Classica', es: 'Crema Clásica' },
    background: '#F4EFE8',
    ink: '#1A1A1A',
    accent: '#D9C9B5',
  },
  {
    id: 'soft-sand',
    label: { de: 'Soft Sand', en: 'Soft Sand', fr: 'Sable Doux', it: 'Sabbia Soffice', es: 'Arena Suave' },
    background: '#E8DFD0',
    ink: '#1F1F1F',
    accent: '#C8B89F',
  },
  {
    id: 'dusty-rose',
    label: { de: 'Dusty Rose', en: 'Dusty Rose', fr: 'Rose Poudré', it: 'Rosa Antico', es: 'Rosa Empolvado' },
    background: '#EFD9D1',
    ink: '#2A1F1F',
    accent: '#D4B0A2',
  },
  {
    id: 'sage-mist',
    label: { de: 'Sage Mist', en: 'Sage Mist', fr: 'Brume Sauge', it: 'Salvia', es: 'Bruma Salvia' },
    background: '#D9E0D2',
    ink: '#1F2A23',
    accent: '#A8B69E',
  },
  {
    id: 'petrol-brand',
    label: { de: 'Petrol', en: 'Petrol', fr: 'Pétrole', it: 'Petrolio', es: 'Petróleo' },
    background: '#FFFFFF',
    ink: '#1F3A44',
    accent: '#A89B8C',
  },
  {
    id: 'midnight',
    label: { de: 'Midnight', en: 'Midnight', fr: 'Minuit', it: 'Mezzanotte', es: 'Medianoche' },
    background: '#0F1B22',
    ink: '#F4EFE8',
    accent: '#5C7180',
  },
] as const

export function getTypographyPalette(id: string): TypographyPalette {
  return TYPOGRAPHY_PALETTES.find((p) => p.id === id) ?? TYPOGRAPHY_PALETTES[0]
}


// ─── Fonts ─────────────────────────────────────────────────────────────────

export interface TypographyFont {
  key: string
  label: string
  /** CSS font-family Stack — sollte mindestens eine via next/font geladene
   *  Brand-Font enthalten + System-Fallback. Hero + Footer können getrennte
   *  Font-Pairs nutzen (z. B. Script-Hero + Serif-Footer). */
  heroFamily: string
  footerFamily: string
  /** Welche Locales unterstützt diese Font (Glyph-Coverage). Locales NICHT in
   *  der Liste filtern den Picker aus, damit z. B. Allura Script (ohne deutsche
   *  Umlaute) nicht für `de` angeboten wird. */
  supportedLocales: Locale[]
}

export const TYPOGRAPHY_FONTS: readonly TypographyFont[] = [
  {
    key: 'cormorant-italic',
    label: 'Cormorant Italic',
    heroFamily: '"Cormorant Garamond", "Cormorant", Georgia, serif',
    footerFamily: '"Cormorant Garamond", "Cormorant", Georgia, serif',
    supportedLocales: ['de', 'en', 'fr', 'it', 'es'],
  },
  {
    key: 'playfair',
    label: 'Playfair Display',
    heroFamily: '"Playfair Display", "Cormorant Garamond", Georgia, serif',
    footerFamily: '"Playfair Display", "Cormorant Garamond", Georgia, serif',
    supportedLocales: ['de', 'en', 'fr', 'it', 'es'],
  },
  {
    key: 'inter-clean',
    label: 'Inter Clean',
    heroFamily: '"Cormorant Garamond", Georgia, serif',
    footerFamily: '"Inter", system-ui, sans-serif',
    supportedLocales: ['de', 'en', 'fr', 'it', 'es'],
  },
] as const

export function getTypographyFont(key: string): TypographyFont {
  return TYPOGRAPHY_FONTS.find((f) => f.key === key) ?? TYPOGRAPHY_FONTS[0]
}

export function getTypographyFontsForLocale(locale: Locale): TypographyFont[] {
  return TYPOGRAPHY_FONTS.filter((f) => f.supportedLocales.includes(locale))
}
