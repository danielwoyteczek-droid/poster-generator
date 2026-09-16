// Palette in eine Preset-Konfiguration einbacken, damit der Headless-Render die
// Farben trifft, ohne den dort nicht gewärmten DB-Paletten-Cache (sonst
// Fallback auf MAP_PALETTES[0]).
//
// Geteilt von PROJ-53 (Etsy-Listing-Klone) und PROJ-56 (Image-Generator-
// Farbvarianten). Nur relative Importe.

export type PresetConfig = Record<string, unknown>

export function bakePaletteIntoConfig(
  config: PresetConfig | null | undefined,
  paletteId: string,
  colors: Record<string, string> | null | undefined,
): PresetConfig {
  const next: PresetConfig = { ...(config ?? {}) }
  if (colors) {
    // Named DB-Palette als Custom einbacken — überschreibt eine evtl. vom
    // Basis-Preset geerbte customPalette und braucht keinen DB-Cache.
    next.paletteId = 'custom'
    next.customPalette = colors
    next.customPaletteBase = colors.water ?? colors.land ?? '#84c5a6'
  } else {
    next.paletteId = paletteId
  }
  return next
}
