'use client'

import { useIsMobileEditor } from '@/hooks/useIsMobileEditor'
import { DtfEditorLayout } from './DtfEditorLayout'
import { MobileDtfEditorLayout } from './mobile/MobileDtfEditorLayout'

/**
 * PROJ-55: Weiche zwischen Desktop- und Mobil-Layout, basierend auf dem
 * 1024-px-Breakpoint von `useIsMobileEditor`. Gleiches Muster wie bei den
 * bestehenden Editoren.
 */
export function DtfEditorShell() {
  const isMobile = useIsMobileEditor()

  if (isMobile === undefined) {
    return <div className="h-full bg-muted/40" />
  }

  return isMobile ? <MobileDtfEditorLayout /> : <DtfEditorLayout />
}
