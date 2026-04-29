export type PrintFormat = 'a4' | 'a3'

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
}

export const PRINT_FORMAT_OPTIONS = Object.values(PRINT_FORMATS)

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
