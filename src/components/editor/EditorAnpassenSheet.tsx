'use client'

import { ReactNode } from 'react'
import { useTranslations } from 'next-intl'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useIsMobileEditor } from '@/hooks/useIsMobileEditor'
import { EditorViewProvider } from './EditorViewContext'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** The same tab content as the main sidebar — but the children read
   *  view='anpassen' from EditorViewContext and render only the Anpassen-
   *  classified controls. */
  children: ReactNode
}

/**
 * PROJ-36: Anpassen-Sheet wrapper.
 *
 * Shows the same editor tab structure as the main sidebar, but the controls
 * inside read view='anpassen' from the EditorViewContext and filter to only
 * the Anpassen-classified ones.
 *
 * Side: bottom on Mobile (familiar bottom-sheet pattern), right on Desktop
 * (classic right-drawer for detail panels).
 */
export function EditorAnpassenSheet({ open, onOpenChange, children }: Props) {
  const t = useTranslations('editor')
  const isMobile = useIsMobileEditor()
  const side = isMobile ? 'bottom' : 'right'

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={side}
        className={
          side === 'bottom'
            ? 'h-[85vh] flex flex-col p-0 sm:max-w-none'
            : 'w-[380px] flex flex-col p-0 sm:max-w-none'
        }
      >
        <SheetHeader className="px-4 py-3 border-b border-border shrink-0">
          <SheetTitle className="text-base font-semibold">{t('anpassenSheetTitle')}</SheetTitle>
        </SheetHeader>
        <ScrollArea className="flex-1 min-h-0">
          <EditorViewProvider value="anpassen">
            {children}
          </EditorViewProvider>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}
