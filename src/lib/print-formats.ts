export type PrintFormat = 'a4' | 'a3' | 'a2'

/** 'portrait' = paper standing tall (the canonical orientation of the
 *  PRINT_FORMATS table below). 'landscape' flips width and height at
 *  render time without touching the canonical record. */
export type PosterOrientation = 'portrait' | 'landscape'

export interface PrintFormatDefinition {
  id: PrintFormat
  label: string
  widthMm: number
  heightMm: number
  widthPx: number
  heightPx: number
}

export const PRINT_FORMATS: Record<PrintFormat, PrintFormatDefinition> = {
  a4: { id: 'a4', label: 'A4', widthMm: 210, heightMm: 297, widthPx: 2480, heightPx: 3508 },
  a3: { id: 'a3', label: 'A3', widthMm: 297, heightMm: 420, widthPx: 3508, heightPx: 4961 },
  a2: { id: 'a2', label: 'A2', widthMm: 420, heightMm: 594, widthPx: 4961, heightPx: 7016 },
}

export const PRINT_FORMAT_OPTIONS = Object.values(PRINT_FORMATS)

/**
 * PROJ-37: Logical-Canvas-Pixel-Größen pro Format. MapLibre rendert auf
 * dieser virtuellen Pixel-Fläche — größere Logical Canvas = mehr Geografie
 * sichtbar bei gleichem Zoom-Level. Visual Container im Editor wird per
 * CSS-Transform skaliert um die Logical Canvas in den verfügbaren Bildschirm-
 * Platz einzupassen.
 *
 * A4 = 800×1131 (Basis), A3 = √2× größer, A2 = 2× größer.
 * Verhältnis 0.7074 ≈ √2/2 = ISO-A-Aspect.
 */
export const LOGICAL_CANVAS_SIZE: Record<PrintFormat, { width: number; height: number }> = {
  a4: { width: 800, height: 1131 },
  a3: { width: 1131, height: 1600 },
  a2: { width: 1600, height: 2263 },
}

/**
 * Returns the format dimensions adjusted for the requested orientation.
 * Portrait returns the format unchanged; landscape swaps width and height
 * for both mm and px so callers can keep using `dims.widthPx` etc. without
 * branching themselves.
 */
export function effectiveDimensions(
  format: PrintFormatDefinition,
  orientation: PosterOrientation,
): PrintFormatDefinition {
  if (orientation === 'portrait') return format
  return {
    id: format.id,
    label: format.label,
    widthMm: format.heightMm,
    heightMm: format.widthMm,
    widthPx: format.heightPx,
    heightPx: format.widthPx,
  }
}

/**
 * PROJ-37: Logical Canvas size in der gewählten Orientation. Portrait nimmt
 * die Konstante unverändert, Landscape swappt width/height.
 */
export function effectiveLogicalCanvas(
  format: PrintFormat,
  orientation: PosterOrientation,
): { width: number; height: number } {
  const base = LOGICAL_CANVAS_SIZE[format]
  if (orientation === 'portrait') return base
  return { width: base.height, height: base.width }
}
