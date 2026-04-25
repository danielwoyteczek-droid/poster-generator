import { defineRouting } from 'next-intl/routing'
import { locales, defaultLocale } from './config'

/**
 * Shared routing definition consumed by next-intl's middleware and the
 * Link / useRouter wrappers. `localePrefix: 'always'` keeps the URL
 * pattern explicit (/de/... and /en/...) so SEO + sharing stays
 * unambiguous.
 */
export const routing = defineRouting({
  locales: [...locales],
  defaultLocale,
  localePrefix: 'always',
  localeDetection: true,
})
