/**
 * Single source of truth for which locales are active. When adding a
 * language later (FR, NL, …) extend `locales` and add a corresponding
 * JSON file under `src/locales/<code>.json`.
 */
export const locales = ['de', 'en', 'fr', 'it', 'es'] as const
export type Locale = (typeof locales)[number]

export const defaultLocale: Locale = 'de'

/**
 * Locales that aren't `defaultLocale` but should still claim a user
 * whose `Accept-Language` header lists them as a preferred language.
 */
export const accentLocales: Locale[] = ['en', 'fr', 'it', 'es']

export const localeNames: Record<Locale, string> = {
  de: 'Deutsch',
  en: 'English',
  fr: 'Français',
  it: 'Italiano',
  es: 'Español',
}
