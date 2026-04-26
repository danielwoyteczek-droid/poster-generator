import { z } from 'zod'

/**
 * Single-Source-of-Truth fuer Anlass-Codes (PROJ-11 Beispielgalerie).
 *
 * Liste muss synchron gehalten werden mit:
 *  - DB-CHECK-Constraint `presets_occasions_valid` (Migration `add_occasions_to_presets`)
 *  - Sanity-Studio-Dropdown im `galleryPage`-Schema (`categories[].tag`)
 *  - Admin-UI Multi-Select in der Preset-Verwaltung
 *
 * Erweiterung erfordert:
 *  1. Code-PR (diese Datei)
 *  2. Sanity-Schema-Update (neuer Dropdown-Eintrag)
 *  3. Migration mit DROP+ADD CONSTRAINT auf presets
 */
export const OCCASION_CODES = [
  'muttertag',
  'geburt',
  'hochzeit',
  'heimat',
  'reise',
  'geschenk',
  'jahrestag',
  'weihnachten',
] as const

export type OccasionCode = (typeof OCCASION_CODES)[number]

export const OccasionSchema = z.enum(OCCASION_CODES)

export const OccasionsSchema = z
  .array(OccasionSchema)
  .refine((arr) => new Set(arr).size === arr.length, {
    message: 'occasions darf keine doppelten Eintraege enthalten',
  })

export const OccasionsNonEmptySchema = OccasionsSchema.min(1, {
  message: 'Mindestens ein Anlass muss ausgewaehlt sein',
})

/**
 * Anzeigenamen pro Locale fuer Admin-UI. Sanity-Kategorie-Labels
 * kommen aus dem CMS und sind hier nicht relevant — diese Map ist
 * nur fuer interne Tools (Admin-Dropdown, Empty-State-Hint).
 */
export const occasionLabels: Record<OccasionCode, Record<'de' | 'en' | 'fr' | 'it' | 'es', string>> = {
  muttertag: {
    de: 'Muttertag',
    en: "Mother's Day",
    fr: 'Fête des mères',
    it: 'Festa della mamma',
    es: 'Día de la madre',
  },
  geburt: {
    de: 'Geburt',
    en: 'Birth',
    fr: 'Naissance',
    it: 'Nascita',
    es: 'Nacimiento',
  },
  hochzeit: {
    de: 'Hochzeit',
    en: 'Wedding',
    fr: 'Mariage',
    it: 'Matrimonio',
    es: 'Boda',
  },
  heimat: {
    de: 'Heimat',
    en: 'Hometown',
    fr: 'Région natale',
    it: 'Città natale',
    es: 'Ciudad natal',
  },
  reise: {
    de: 'Reise',
    en: 'Travel',
    fr: 'Voyage',
    it: 'Viaggio',
    es: 'Viaje',
  },
  geschenk: {
    de: 'Geschenk',
    en: 'Gift',
    fr: 'Cadeau',
    it: 'Regalo',
    es: 'Regalo',
  },
  jahrestag: {
    de: 'Jahrestag',
    en: 'Anniversary',
    fr: 'Anniversaire',
    it: 'Anniversario',
    es: 'Aniversario',
  },
  weihnachten: {
    de: 'Weihnachten',
    en: 'Christmas',
    fr: 'Noël',
    it: 'Natale',
    es: 'Navidad',
  },
}
