import { getRequestConfig } from 'next-intl/server'
import { hasLocale } from 'next-intl'
import { routing } from './routing'

/**
 * next-intl reads this on every server render to know which JSON
 * messages to inject into the page. When the requested locale isn't
 * one we support, fall back to the project default (DE).
 */
export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale

  return {
    locale,
    messages: (await import(`../locales/${locale}.json`)).default,
  }
})
