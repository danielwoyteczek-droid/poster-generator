import type { PhotoFilter } from '@/hooks/useEditorStore'

export const PHOTO_FILTERS: Array<{ id: PhotoFilter; label: string; css: string }> = [
  { id: 'none', label: 'Original', css: 'none' },
  { id: 'grayscale', label: 'Schwarz-weiß', css: 'grayscale(1)' },
  { id: 'sepia', label: 'Sepia', css: 'sepia(0.85)' },
]

export function filterCss(filter: PhotoFilter): string {
  return PHOTO_FILTERS.find((f) => f.id === filter)?.css ?? 'none'
}
