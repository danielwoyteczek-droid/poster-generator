import type { Locale } from '@/i18n/config'

/**
 * PROJ-46: Locale-spezifische Formatierung des Hochzeits-Datums fürs Poster.
 *
 *   de: 12. August 2023
 *   en: August 12, 2023
 *   fr: 12 août 2023
 *   it: 12 agosto 2023
 *   es: 12 de agosto de 2023
 *
 * Eingabe ist ISO-Datum (YYYY-MM-DD). Falls Customer das Feld leer lässt
 * oder ein ungültiges Datum eingibt, geben wir leeren String zurück — der
 * Footer entscheidet dann, ob die Datums-Zeile gerendert wird.
 */
export function formatWeddingDate(iso: string, locale: Locale): string {
  if (!iso || iso.trim() === '') return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''

  try {
    return new Intl.DateTimeFormat(locale, {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(date)
  } catch {
    return iso
  }
}
