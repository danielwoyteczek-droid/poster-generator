import { getLocale } from 'next-intl/server'
import { listOccasionPagesForLocale } from '@/sanity/queries'
import { buildOccasionPagePath } from '@/lib/occasion-routing'
import { occasionLabels, type OccasionCode, OCCASION_CODES } from '@/lib/occasions'
import { locales, type Locale } from '@/i18n/config'
import { LandingNavClient, type OccasionNavLink } from './LandingNavClient'

function isLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value)
}

function isOccasionCode(value: string): value is OccasionCode {
  return (OCCASION_CODES as readonly string[]).includes(value)
}

/**
 * Server-Wrapper um die interaktive Top-Nav. Lädt locale-spezifische
 * Anlass-Seiten aus Sanity (analog zu LandingFooter) und reicht sie als
 * Prop an den Client durch — damit die Dropdown-Links serverseitig im
 * HTML stehen (SEO + Initial-Paint) statt erst nach Hydration zu
 * erscheinen.
 *
 * Bei jedem Page-Load eine kleine Sanity-Query — Sanity-CDN cached das,
 * dazu kommt Next.js' segment-level cache (revalidate=3600 auf den
 * Konsumer-Pages).
 */
export async function LandingNav() {
  const rawLocale = await getLocale().catch(() => 'de')
  const locale: Locale = isLocale(rawLocale) ? rawLocale : 'de'

  const occasionRefs = (await listOccasionPagesForLocale(locale)) ?? []

  const occasionLinks: OccasionNavLink[] = occasionRefs
    .filter((ref) => isOccasionCode(ref.occasion) && Boolean(ref.slug))
    .map((ref) => ({
      label: occasionLabels[ref.occasion as OccasionCode][locale],
      href: buildOccasionPagePath(locale, ref.slug),
    }))

  return <LandingNavClient occasionLinks={occasionLinks} />
}
