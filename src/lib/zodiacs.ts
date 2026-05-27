/**
 * Twelve zodiac constellations — the only constellations rendered on the
 * customer-facing star-map. IDs match the IAU 3-letter codes used in
 * `public/constellations.json` (d3-celestial dataset). Order follows the
 * astrological year starting at Aries.
 */
export interface ZodiacSign {
  /** IAU 3-letter code as it appears in constellations.json `properties.id`. */
  id: string
  /** German display name, shown in the picker. */
  labelDe: string
}

export const ZODIAC_SIGNS: ZodiacSign[] = [
  { id: 'Ari', labelDe: 'Widder' },
  { id: 'Tau', labelDe: 'Stier' },
  { id: 'Gem', labelDe: 'Zwillinge' },
  { id: 'Cnc', labelDe: 'Krebs' },
  { id: 'Leo', labelDe: 'Löwe' },
  { id: 'Vir', labelDe: 'Jungfrau' },
  { id: 'Lib', labelDe: 'Waage' },
  { id: 'Sco', labelDe: 'Skorpion' },
  { id: 'Sgr', labelDe: 'Schütze' },
  { id: 'Cap', labelDe: 'Steinbock' },
  { id: 'Aqr', labelDe: 'Wassermann' },
  { id: 'Psc', labelDe: 'Fische' },
]

export const ZODIAC_IDS: ReadonlySet<string> = new Set(ZODIAC_SIGNS.map((z) => z.id))
