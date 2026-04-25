'use client'

import { openConsentSettings } from './ConsentBanner'

export function CookieSettingsLink({ className }: { className?: string }) {
  return (
    <button
      type="button"
      onClick={openConsentSettings}
      className={className ?? 'text-sm text-muted-foreground hover:text-foreground'}
    >
      Cookie-Einstellungen
    </button>
  )
}
