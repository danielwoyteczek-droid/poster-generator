import Link from 'next/link'
import { getLocale, getTranslations } from 'next-intl/server'
import { getSiteSettings, listOccasionPagesForLocale } from '@/sanity/queries'
import { CookieSettingsLink } from '@/components/consent/CookieSettingsLink'
import { buildOccasionPagePath } from '@/lib/occasion-routing'
import { occasionLabels, type OccasionCode, OCCASION_CODES } from '@/lib/occasions'
import { locales, type Locale } from '@/i18n/config'

function isLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value)
}

function isOccasionCode(value: string): value is OccasionCode {
  return (OCCASION_CODES as readonly string[]).includes(value)
}

export async function LandingFooter() {
  const t = await getTranslations('footer')
  const tNav = await getTranslations('nav')
  const rawLocale = await getLocale().catch(() => 'de')
  const locale: Locale = isLocale(rawLocale) ? rawLocale : 'de'

  const [settings, occasionRefs] = await Promise.all([
    getSiteSettings(),
    listOccasionPagesForLocale(locale),
  ])
  const year = new Date().getFullYear()

  // Map occasion-codes to localized labels via the canonical lookup table.
  // Filter unknown codes (defensive: a renamed/removed occasion could leave
  // orphan Sanity docs).
  const occasionLinks = (occasionRefs ?? [])
    .filter((ref) => isOccasionCode(ref.occasion) && Boolean(ref.slug))
    .map((ref) => ({
      label: occasionLabels[ref.occasion as OccasionCode][locale],
      href: buildOccasionPagePath(locale, ref.slug),
    }))

  const showOccasions = occasionLinks.length > 0
  // Tailwind JIT sees both class strings — runtime picks the right one.
  const gridClass = showOccasions
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
