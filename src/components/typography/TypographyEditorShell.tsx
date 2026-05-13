'use client'

import { useEffect } from 'react'
import { useLocale } from 'next-intl'
import { useIsMobileEditor } from '@/hooks/useIsMobileEditor'
import { useTypographyEditorStore } from '@/hooks/useTypographyEditorStore'
import { TypographyLayout } from './TypographyLayout'
import { MobileTypographyLayout } from './mobile/MobileTypographyLayout'
import type { Locale } from '@/i18n/config'

/**
 * PROJ-46 Editor-Entry. Pattern wie WeddingEditorShell:
 *   - switcht Desktop/Mobile am 1024-px-Breakpoint
 *   - mountet Locale-Defaults (Hero-Text "ja"/"yes"/...) beim ersten Render
 *
 * Auto-Save via useProjectSync('typography') kommt mit PROJ-5-Integration
 * (Chunk 2). Bis dahin lebt der State nur in Zustand (geht beim Refresh weg)
 * — ist aber für die Editor-Verifikation OK.
 */
export function TypographyEditorShell() {
  const isMobile = useIsMobileEditor()
  const locale = useLocale() as Locale

  useEffect(() => {
    useTypographyEditorStore.getState().applyLocaleDefaults(locale)
  }, [locale])

  if (isMobile === undefined) {
    return <div className="h-full bg-muted" aria-hidden />
  }

  return isMobile ? <MobileTypographyLayout /> : <TypographyLayout />
}
