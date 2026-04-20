export type PrintFormat = 'a4' | 'a3' | 'a2'

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
