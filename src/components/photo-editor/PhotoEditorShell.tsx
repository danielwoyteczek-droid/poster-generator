'use client'

import { useIsMobileEditor } from '@/hooks/useIsMobileEditor'
import { PhotoEditorLayout } from './PhotoEditorLayout'
import { MobilePhotoEditorLayout } from './mobile/MobilePhotoEditorLayout'

/**
 * Foto-Poster-Shell — entscheidet zwischen Desktop-Layout
 * (`PhotoEditorLayout`) und Mobile-Layout (`MobilePhotoEditorLayout`)
 * basierend auf dem 1024-px-Breakpoint von `useIsMobileEditor`. Spiegelt
 * `EditorShell` (Karten) und `StarMapEditorShell`.
 */
export function PhotoEditorShell() {
  const isMobile = useIsMobileEditor()

  if (isMobile === undefined) {
    return <div className="h-full bg-muted" aria-hidden />
  }

  return isMobile ? <MobilePhotoEditorLayout /> : <PhotoEditorLayout />
}
