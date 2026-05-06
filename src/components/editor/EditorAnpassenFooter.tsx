'use client'

import { Sliders } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/useAuth'

interface Props {
  onClick: () => void
}

/**
 * PROJ-36: Sticky footer button at the bottom of the editor sidebar.
 * Opens the Anpassen-Sheet for customers. Hidden for admins (admin sees all
 * controls flat in the main sidebar, no sheet needed).
 */
export function EditorAnpassenFooter({ onClick }: Props) {
  const t = useTranslations('editor')
  const { isAdmin } = useAuth()

  if (isAdmin) return null

  return (
    <div className="shrink-0 border-t border-border bg-white p-3">
      <Button
        type="button"
        variant="outline"
        className="w-full justify-center gap-2"
        onClick={onClick}
      >
        <Sliders className="w-4 h-4" />
        {t('anpassen')}
      </Button>
    </div>
  )
}
