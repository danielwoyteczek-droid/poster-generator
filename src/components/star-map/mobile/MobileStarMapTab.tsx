'use client'

import { StarMapTab } from '@/components/star-map/StarMapTab'

/**
 * Wrapper um den Desktop-StarMapTab — die Inhalte (Datum, Ort, Sternfarben,
 * Sichtbarkeits-Toggles) sind formularbasiert und benötigen kein Mobile-
 * spezifisches Layout. Touch-Targets sind durch das Design-System bereits
 * groß genug.
 */
export function MobileStarMapTab() {
  return <StarMapTab />
}
