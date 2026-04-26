'use client'

import { useIsMobileEditor } from '@/hooks/useIsMobileEditor'
import { StarMapLayout } from './StarMapLayout'
import { MobileStarMapLayout } from './mobile/MobileStarMapLayout'

/**
 * Star-Map-Variante des EditorShell — entscheidet zwischen Desktop-Layout
 * (`StarMapLayout`) und Mobile-Layout (`MobileStarMapLayout`) basierend auf
 * dem 1024-px-Breakpoint von `useIsMobileEditor`. Spiegelt das Pattern aus
 * PROJ-18 (Karten-Editor).
 */
export function StarMapEditorShell() {
  const isMobile = useIsMobileEditor()

  if (isMobile === undefined) {
    return <div className="h-full bg-muted" aria-hidden />
  }

  return isMobile ? <MobileStarMapLayout /> : <StarMapLayout />
}
