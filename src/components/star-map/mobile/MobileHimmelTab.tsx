'use client'

import { HimmelTab } from '@/components/star-map/HimmelTab'

/**
 * Wrapper um den Desktop-HimmelTab — Sichtbarkeit von Konstellationen,
 * Milchstraße, Sonne/Mond/Planeten. Nur Toggles und Farb-Inputs, läuft
 * ohne Anpassung auf Mobile.
 */
export function MobileHimmelTab() {
  return <HimmelTab />
}
