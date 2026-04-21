'use client'

import { openConsentSettings } from './ConsentBanner'

export function CookieSettingsLink({ className }: { className?: string }) {
  return (
    <button
      type="button"
      onClick={openConsentSettings}
      className={className ?? 'text-sm text-gray-600 hover:text-gray-900'}
    >
      Cookie-Einstellungen
    </button>
  )
}
