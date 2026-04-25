'use client'

import { useIsMobileEditor } from '@/hooks/useIsMobileEditor'
import { EditorLayout } from './EditorLayout'
import { MobileEditorLayout } from './mobile/MobileEditorLayout'

export function EditorShell() {
  const isMobile = useIsMobileEditor()

  if (isMobile === undefined) {
    return <div className="h-full bg-muted" aria-hidden />
  }

  return isMobile ? <MobileEditorLayout /> : <EditorLayout />
}
