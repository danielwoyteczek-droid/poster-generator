'use client'

import { useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { useIsMobileEditor } from '@/hooks/useIsMobileEditor'
import { useProjectSync } from '@/hooks/useProjectSync'
import { useWeddingEditorStore } from '@/hooks/useWeddingEditorStore'
import { WeddingLayout } from './WeddingLayout'
import { MobileWeddingLayout } from './mobile/MobileWeddingLayout'

/**
 * Wedding-Editor-Entry — spiegelt das Pattern aus EditorShell / StarMapEditorShell:
 * switcht zwischen Desktop und Mobile am 1024-px-Breakpoint und mountet
 * gleichzeitig `useProjectSync('wedding')` für Auto-Save (Guest ↔ LocalStorage,
 * eingeloggt ↔ Cloud) und Default-Slot-Labels in der aktiven Locale.
 */
export function WeddingEditorShell() {
  const isMobile = useIsMobileEditor()
  const t = useTranslations('wedding')
  useProjectSync('wedding')

  // On first mount, fill empty slot labels with the locale defaults
  // (Met / Engaged / Married). `applyDefaultLabels` only overwrites empty
  // strings, so a returning user with custom labels keeps theirs.
  useEffect(() => {
    useWeddingEditorStore.getState().applyDefaultLabels([
      t('defaultLabelMet'),
      t('defaultLabelEngaged'),
      t('defaultLabelMarried'),
    ])
  }, [t])

  if (isMobile === undefined) {
    return <div className="h-full bg-muted" aria-hidden />
  }

  return isMobile ? <MobileWeddingLayout /> : <WeddingLayout />
}
