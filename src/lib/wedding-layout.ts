import type { PosterOrientation } from '@/lib/print-formats'

/**
 * Slot-Anordnung wird deterministisch aus der Poster-Orientation abgeleitet.
 * Portrait → drei Karten untereinander (vertical-3),
 * Landscape → drei Karten nebeneinander (horizontal-3).
 *
 * Bewusst keine manuelle Override im UI: die "kleine Slot-Variante"
 * (horizontal-3 auf Hochformat bzw. vertical-3 auf Querformat) wäre auf
 * A4 ca. 70 mm pro Karte — physisch zu eng für lesbare Labels.
 */
export type WeddingSlotLayout = 'horizontal-3' | 'vertical-3'

export function slotLayoutFromOrientation(
  orientation: PosterOrientation,
): WeddingSlotLayout {
  return orientation === 'landscape' ? 'horizontal-3' : 'vertical-3'
}
