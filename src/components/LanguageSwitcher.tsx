'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Languages } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { locales, defaultLocale, localeNames, type Locale } from '@/i18n/config'

const LOCALE_COOKIE = 'NEXT_LOCALE'

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`))
  return match ? decodeURIComponent(match[1]) : null
}

function writeCookie(name: string, value: string) {
  if (typeof document === 'undefined') return
  // 1 year, root path so it covers every route group.
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`
}

/**
 * Reads the active locale from the URL when the page already lives under
 * /[locale]/, otherwise falls back to the cookie (or the project default).
 * Once the routing migration moves pages into [locale]/, the URL becomes
 * authoritative without any code change here.
 */
function detectActiveLocale(): Locale {
  if (typeof window === 'undefined') return defaultLocale
  const fromUrl = window.location.pathname.split('/')[1]
  if ((locales as readonly string[]).includes(fromUrl)) return fromUrl as Locale
  const fromCookie = readCookie(LOCALE_COOKIE)
  if ((locales as readonly string[]).includes(fromCookie ?? '')) return fromCookie as Locale
  return defaultLocale
}

interface LanguageSwitcherProps {
  /** Render as a compact icon button (default for desktop nav) or as
   *  a full-width row (mobile menu). */
  variant?: 'compact' | 'full'
}

export function LanguageSwitcher({ variant = 'compact' }: LanguageSwitcherProps) {
  const t = useTranslations('common')
  const [active, setActive] = useState<Locale>(defaultLocale)

  useEffect(() => {
    setActive(detectActiveLocale())
  }, [])

  const handlePick = (next: Locale) => {
    if (next === active) return
    writeCookie(LOCALE_COOKIE, next)

    // If the URL already carries a locale segment, swap it in place —
    // middleware will pick up the cookie + path and serve the new locale.
    // Otherwise (current state, before route migration) just reload so
    // the cookie takes effect on the next render cycle.
    const path = window.location.pathname
    const segs = path.split('/')
    if ((locales as readonly string[]).includes(segs[1])) {
      segs[1] = next
      window.location.href = segs.join('/') + window.location.search + window.location.hash
    } else {
      // Pages still pre-migration — keep the cookie, reload so the
      // browser-language detection updates server-side messages.
      window.location.reload()
    }
  }

  const triggerCompact = (
    <button
      className="inline-flex items-center gap-1 px-2 py-1.5 rounded-md text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors uppercase tabular-nums"
      aria-label={t('languageSwitchAria')}
    >
      <Languages className="w-4 h-4" />
      <span className="text-xs font-medium">{active}</span>
    </button>
  )

  const triggerFull = (
    <button className="w-full flex items-center justify-between px-3 py-2 rounded-md text-sm text-gray-700 hover:bg-gray-100 transition-colors">
      <span className="flex items-center gap-2">
        <Languages className="w-4 h-4" />
        {t('languageLabel')}
      </span>
      <span className="text-xs uppercase text-gray-400">{active}</span>
    </button>
  )

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {variant === 'compact' ? triggerCompact : triggerFull}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        {locales.map((loc) => (
          <DropdownMenuItem
            key={loc}
            onClick={() => handlePick(loc)}
            className={active === loc ? 'font-medium' : ''}
          >
            <span className="w-6 text-[11px] uppercase text-gray-400 tabular-nums">{loc}</span>
            {localeNames[loc]}
            {active === loc && <span className="ml-auto text-gray-400">✓</span>}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
