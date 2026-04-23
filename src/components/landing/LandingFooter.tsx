import Link from 'next/link'
import { getSiteSettings } from '@/sanity/queries'
import { CookieSettingsLink } from '@/components/consent/CookieSettingsLink'

const LEGAL_LINKS = [
  { label: 'Impressum', href: '/impressum' },
  { label: 'Datenschutz', href: '/datenschutz' },
  { label: 'AGB', href: '/agb' },
  { label: 'Widerrufsbelehrung', href: '/widerrufsbelehrung' },
  { label: 'Cookie-Richtlinie', href: '/cookie-richtlinie' },
]

const NAV_LINKS = [
  { label: 'Über uns', href: '/about' },
  { label: 'Blog', href: '/blog' },
  { label: 'FAQ', href: '/faq' },
]

export async function LandingFooter() {
  const settings = await getSiteSettings()
  const year = new Date().getFullYear()

  return (
    <footer className="border-t border-gray-200 bg-white py-12 mt-auto">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
          <div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/brand/logo_1200x300.svg"
              alt="petite-moment"
              className="h-10 w-auto mb-3"
              width={224}
              height={56}
            />
            <p className="text-xs text-gray-500 leading-relaxed">
              Individuelle Karten- und Sternenposter, die deinen Moment zeigen.
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">Produkte</p>
            <ul className="space-y-2">
              <li><Link href="/map" className="text-sm text-gray-600 hover:text-gray-900">Stadtposter</Link></li>
              <li><Link href="/star-map" className="text-sm text-gray-600 hover:text-gray-900">Sternenposter</Link></li>
            </ul>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">Info</p>
            <ul className="space-y-2">
              {NAV_LINKS.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-sm text-gray-600 hover:text-gray-900">{link.label}</Link>
                </li>
              ))}
              {settings?.contactEmail && (
                <li>
                  <a href={`mailto:${settings.contactEmail}`} className="text-sm text-gray-600 hover:text-gray-900">
                    Kontakt
                  </a>
                </li>
              )}
            </ul>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">Rechtliches</p>
            <ul className="space-y-2">
              {LEGAL_LINKS.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-sm text-gray-600 hover:text-gray-900">{link.label}</Link>
                </li>
              ))}
              <li>
                <CookieSettingsLink />
              </li>
            </ul>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-6 border-t border-gray-100">
          <p className="text-xs text-gray-400">
            {settings?.footerNote ?? `© ${year} Poster Generator`}
          </p>
          {settings?.socialLinks && settings.socialLinks.length > 0 && (
            <div className="flex gap-4">
              {settings.socialLinks.map((link) => (
                <a key={link.url} href={link.url} target="_blank" rel="noopener noreferrer" className="text-xs text-gray-500 hover:text-gray-900">
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
