'use client'

import { useTranslations } from 'next-intl'
import { openConsentSettings } from './ConsentBanner'

export function CookieSettingsLink({ className }: { className?: string }) {
  const t = useTranslations('consent')
  return (
    <button
      type="button"
      onClick={openConsentSettings}
      className={className ?? 'text-sm text-muted-foreground hover:text-foreground'}
    >
      {t('settingsLink')}
    </button>
  )
}
