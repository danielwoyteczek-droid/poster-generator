/**
 * PROJ-47: Admin-Font-Verwaltung
 *
 * Type system + hardcoded fallback for the font catalogue. The fallback is
 * what the editor sees while the DB-driven catalogue (Supabase Storage +
 * `fonts` / `font_styles` tables) is empty or unreachable.
 *
 * Phase 1 of the rollout keeps these hardcoded entries authoritative. Phase 2
 * uploads the same `.ttf`s into the Supabase `fonts/` bucket and the seed
 * migration mirrors this catalogue, so the swap from `FALLBACK_FONTS` to the
 * DB list is visually identical for the customer.
 */

export type FontCategory = 'serif' | 'script' | 'sans' | 'display'

export const FONT_CATEGORIES: FontCategory[] = ['serif', 'script', 'sans', 'display']

export const FONT_CATEGORY_LABELS: Record<FontCategory, string> = {
  serif: 'Serif',
  script: 'Script',
  sans: 'Sans',
  display: 'Display',
}

export type FontStyleSpec = 'normal' | 'italic'

export const FONT_WEIGHTS = [100, 200, 300, 400, 500, 600, 700, 800, 900] as const
export type FontWeight = (typeof FONT_WEIGHTS)[number]

export const FONT_WEIGHT_LABELS: Record<FontWeight, string> = {
  100: 'Thin',
  200: 'ExtraLight',
  300: 'Light',
  400: 'Regular',
  500: 'Medium',
  600: 'SemiBold',
  700: 'Bold',
  800: 'ExtraBold',
  900: 'Black',
}

export interface FontStyle {
  id: string
  weight: FontWeight
  style: FontStyleSpec
  url: string
  file_size_bytes: number | null
}

export interface Font {
  id: string
  family_name: string
  category: FontCategory
  description: string | null
  display_order: number
  status: 'draft' | 'published'
  styles: FontStyle[]
}

export const DEFAULT_FONT_FAMILY = 'Cormorant Garamond'

export const FALLBACK_FONTS: Font[] = [
  {
    id: 'playfair-display',
    family_name: 'Playfair Display',
    category: 'serif',
    description: 'Hochwertige Display-Serif mit hohem Kontrast',
    display_order: 10,
    status: 'published',
    styles: [
      { id: 'playfair-400', weight: 400, style: 'normal', url: '/fonts/PlayfairDisplay.ttf', file_size_bytes: null },
    ],
  },
  {
    id: 'cormorant-garamond',
    family_name: 'Cormorant Garamond',
    category: 'serif',
    description: 'Klassische Serif, geeignet als Body und Headline',
    display_order: 20,
    status: 'published',
    styles: [
      { id: 'cormorant-400', weight: 400, style: 'normal', url: '/fonts/CormorantGaramond.ttf', file_size_bytes: null },
    ],
  },
  {
    id: 'montserrat',
    family_name: 'Montserrat',
    category: 'sans',
    description: 'Geometrische Sans, vielseitig',
    display_order: 30,
    status: 'published',
    styles: [
      { id: 'montserrat-400', weight: 400, style: 'normal', url: '/fonts/Montserrat.ttf', file_size_bytes: null },
    ],
  },
  {
    id: 'caviar-dreams',
    family_name: 'CaviarDreams',
    category: 'sans',
    description: 'Weiche Sans mit Regular und Bold',
    display_order: 40,
    status: 'published',
    styles: [
      { id: 'caviar-400', weight: 400, style: 'normal', url: '/fonts/CaviarDreams.ttf', file_size_bytes: null },
      { id: 'caviar-700', weight: 700, style: 'normal', url: '/fonts/CaviarDreams_Bold.ttf', file_size_bytes: null },
    ],
  },
  {
    id: 'amsterdam',
    family_name: 'Amsterdam',
    category: 'script',
    description: 'Romantische Script, ideal für Namen',
    display_order: 50,
    status: 'published',
    styles: [
      { id: 'amsterdam-400', weight: 400, style: 'normal', url: '/fonts/Amsterdam.ttf', file_size_bytes: null },
    ],
  },
  {
    id: 'cathalia',
    family_name: 'Cathalia',
    category: 'script',
    description: 'Elegante Brush-Script',
    display_order: 60,
    status: 'published',
    styles: [
      { id: 'cathalia-400', weight: 400, style: 'normal', url: '/fonts/Cathalia.ttf', file_size_bytes: null },
    ],
  },
  {
    id: 'lindsey-signature',
    family_name: 'Lindsey Signature',
    category: 'script',
    description: 'Handgeschriebene Signatur-Schrift',
    display_order: 70,
    status: 'published',
    styles: [
      { id: 'lindsey-400', weight: 400, style: 'normal', url: '/fonts/lindsey-signature-regular.ttf', file_size_bytes: null },
    ],
  },
  {
    id: 'brittany-signature',
    family_name: 'Brittany Signature',
    category: 'script',
    description: 'Schwungvolle Signatur-Schrift',
    display_order: 80,
    status: 'published',
    styles: [
      { id: 'brittany-400', weight: 400, style: 'normal', url: '/fonts/BrittanySignature.ttf', file_size_bytes: null },
    ],
  },
  {
    id: 'welcome',
    family_name: 'Welcome',
    category: 'script',
    description: 'Großzügige Welcome-Script für Hero-Worte',
    display_order: 90,
    status: 'published',
    styles: [
      { id: 'welcome-400', weight: 400, style: 'normal', url: '/fonts/Welcome.ttf', file_size_bytes: null },
    ],
  },
]

export const FONT_PREVIEW_TEXT = 'Petite Moment · The quick brown fox · ÄÖÜß & 1234'

/**
 * Merge DB-driven fonts with the hardcoded fallback list. Fonts from the
 * DB win on family_name collision (so an admin-edited entry overrides the
 * baked-in one); fallback fonts not present in the DB are appended.
 *
 * Used by the customer-facing picker so a freshly published admin font
 * shows up immediately, alongside the established 9 hardcoded families —
 * until Phase 2 seeds the DB with those 9 and removes the fallback.
 */
export function mergeFontsByFamilyName(primary: Font[], fallback: Font[]): Font[] {
  const seen = new Set(primary.map((f) => f.family_name))
  const extras = fallback.filter((f) => !seen.has(f.family_name))
  return [...primary, ...extras].sort((a, b) => a.display_order - b.display_order)
}

export const SLUG_REGEX = /^[a-z][a-z0-9-]*$/

export function slugifyFamilyName(s: string): string {
  return s
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}
