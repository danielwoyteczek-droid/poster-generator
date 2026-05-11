import Link from 'next/link'
import { getLocale, getTranslations } from 'next-intl/server'
import { getSiteSettings, listOccasionPagesForLocale, listCityPagesForLocale } from '@/sanity/queries'
import { CookieSettingsLink } from '@/components/consent/CookieSettingsLink'
import { buildOccasionPagePath } from '@/lib/occasion-routing'
import { buildCityPagePath, CITY_URL_SEGMENT } from '@/lib/city-routing'
import { getOccasions } from '@/lib/occasions-server'
import { createAdminClient } from '@/lib/supabase-admin'
import { locales, type Locale } from '@/i18n/config'

function isLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value)
}

export async function LandingFooter() {
  const t = await getTranslations('footer')
  const tNav = await getTranslations('nav')
  const tHub = await getTranslations('cityMapsHub')
  const rawLocale = await getLocale().catch(() => 'de')
  const locale: Locale = isLocale(rawLocale) ? rawLocale : 'de'
  const hubHref = `/${locale}/${CITY_URL_SEGMENT[locale]}/`

  const [settings, occasionRefs, occasionsList, cityRefs] = await Promise.all([
    getSiteSettings(),
    listOccasionPagesForLocale(locale),
    getOccasions(),
    listCityPagesForLocale(locale),
  ])
  const year = new Date().getFullYear()

  // Map occasion-codes to localized labels via the Sanity occasion list.
  // Orphan codes (Sanity Studio doc renamed/removed → references stale)
  // are dropped so the footer doesn't show broken labels.
  const occasionsByCode = new Map(occasionsList.map((o) => [o.code, o]))
  const occasionLinks = (occasionRefs ?? [])
    .filter((ref) => occasionsByCode.has(ref.occasion) && Boolean(ref.slug))
    .map((ref) => {
      const entry = occasionsByCode.get(ref.occasion)!
      return {
        label: entry.localizedTitles[locale] ?? entry.title,
        href: buildOccasionPagePath(locale, ref.slug),
      }
    })

  // PROJ-42: Top-6 popular city pages in the current locale, sorted by
  // population. Only cities with a Sanity-cityPage doc + a row in the
  // cities-Tabelle land here. Orphans (Sanity refs city no longer in DB)
  // are dropped.
  const cityLinks: { label: string; href: string }[] = []
  const validCityRefs = (cityRefs ?? []).filter((ref) => Boolean(ref.slug))
  if (validCityRefs.length > 0) {
    const admin = createAdminClient()
    const slugBases = validCityRefs.map((r) => r.cityId)
    const { data: cityRows } = await admin
      .from('cities')
      .select('slug_base, name, population')
      .in('slug_base', slugBases)
      .order('population', { ascending: false, nullsFirst: false })
      .limit(slugBases.length)
    const cityBySlug = new Map((cityRows ?? []).map((c) => [c.slug_base, c]))
    const ordered = (cityRows ?? [])
      .map((c) => {
        const ref = validCityRefs.find((r) => r.cityId === c.slug_base)
        if (!ref) return null
        return {
          label: c.name,
          href: buildCityPagePath(locale, ref.slug),
        }
      })
      .filter((entry): entry is { label: string; href: string } => entry !== null)
      .slice(0, 6)
    cityLinks.push(...ordered)
    void cityBySlug
  }

  const showOccasions = occasionLinks.length > 0
  const showCities = cityLinks.length > 0
  // Column counts: 4 (default) → 5 (one extra block) → 6 (both extras).
  // Tailwind JIT sees all three class strings literally.
  const gridClass = showOccasions && showCities
    ? 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8 mb-8'
    : (showOccasions || showCities)
      ? 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-8 mb-8'
      : 'grid grid-cols-2 md:grid-cols-4 gap-8 mb-8'

  const legalLinks = [
    { label: t('imprint'), href: '/impressum' },
    { label: t('privacy'), href: '/datenschutz' },
    { label: t('terms'), href: '/agb' },
    { label: t('withdrawal'), href: '/widerrufsbelehrung' },
    { label: t('cookies'), href: '/cookie-richtlinie' },
  ]

  const navLinks = [
    { label: t('about'), href: '/about' },
    { label: t('blog'), href: '/blog' },
    { label: t('faq'), href: '/faq' },
  ]

  return (
    <footer className="border-t border-border bg-white py-12 mt-auto">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className={gridClass}>
          <div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/brand/logo_1200x300.svg"
              alt="petite-moment"
              className="h-10 w-auto mb-3"
              width={224}
              height={56}
            />
            <p className="text-xs text-muted-foreground leading-relaxed">
              {t('tagline')}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70 mb-3">{t('products')}</p>
            <ul className="space-y-2">
              <li><Link href="/map" className="text-sm text-muted-foreground hover:text-foreground">{tNav('cityPoster')}</Link></li>
              <li><Link href="/star-map" className="text-sm text-muted-foreground hover:text-foreground">{tNav('starPoster')}</Link></li>
              <li><Link href="/gallery" className="text-sm text-muted-foreground hover:text-foreground">{tNav('gallery')}</Link></li>
            </ul>
          </div>
          {showOccasions && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70 mb-3">{t('occasions')}</p>
              <ul className="space-y-2">
                {occasionLinks.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="text-sm text-muted-foreground hover:text-foreground">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {showCities && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70 mb-3">{t('cityMaps')}</p>
              <ul className="space-y-2">
                {cityLinks.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="text-sm text-muted-foreground hover:text-foreground">
                      {link.label}
                    </Link>
                  </li>
                ))}
                <li>
                  <Link href={hubHref} className="text-sm font-medium text-muted-foreground hover:text-foreground">
                    {tHub('viewAllLink')}
                  </Link>
                </li>
              </ul>
            </div>
          )}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70 mb-3">{t('info')}</p>
            <ul className="space-y-2">
              {navLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-sm text-muted-foreground hover:text-foreground">{link.label}</Link>
                </li>
              ))}
              {settings?.contactEmail && (
                <li>
                  <a href={`mailto:${settings.contactEmail}`} className="text-sm text-muted-foreground hover:text-foreground">
                    {t('contact')}
                  </a>
                </li>
              )}
            </ul>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70 mb-3">{t('legal')}</p>
            <ul className="space-y-2">
              {legalLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-sm text-muted-foreground hover:text-foreground">{link.label}</Link>
                </li>
              ))}
              <li>
                <CookieSettingsLink />
              </li>
            </ul>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-6 border-t border-border">
          <p className="text-xs text-muted-foreground/70">
            {settings?.footerNote ?? t('fallbackCopyright', { year })}
          </p>
          {settings?.socialLinks && settings.socialLinks.length > 0 && (
            <div className="flex gap-4">
              {settings.socialLinks.map((link) => (
                <a key={link.url} href={link.url} target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground hover:text-foreground">
                  {link.label}
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </footer>
  )
}
