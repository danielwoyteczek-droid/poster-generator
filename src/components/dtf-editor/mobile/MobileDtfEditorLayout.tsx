'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { DtfSheetTab } from '../sidebar/DtfSheetTab'
import { DtfMotifsTab } from '../sidebar/DtfMotifsTab'
import { DtfSheetCanvas } from '../DtfSheetCanvas'
import { cn } from '@/lib/utils'

type Tab = 'motifs' | 'sheet'

/**
 * PROJ-55: Mobiles Layout — Arbeitsfläche oben, ausklappbares Blatt unten.
 * Folgt dem Tap-Sheet-Muster aus PROJ-43: Antippen öffnet und schließt, kein
 * Zieh-Griff.
 *
 * Bewusst einfacher gehalten als bei den anderen Editoren: Der Bogen braucht
 * viel Fläche, weil mehrere Motive gleichzeitig sichtbar und greifbar sein
 * müssen. Das Blatt nimmt deshalb höchstens die halbe Höhe ein und ist
 * standardmäßig zu.
 */
export function MobileDtfEditorLayout() {
  const t = useTranslations('dtfEditor')
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<Tab>('motifs')

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <DtfSheetCanvas />

      <div className="shrink-0 border-t border-border bg-white">
        <div className="flex items-stretch h-11">
          {(['motifs', 'sheet'] as const).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => {
                // Auf denselben Reiter tippen schließt — Apple-Maps-Muster.
                if (open && tab === key) setOpen(false)
                else {
                  setTab(key)
                  setOpen(true)
                }
              }}
              className={cn(
                'flex-1 text-xs font-medium border-b-2 transition-colors',
                open && tab === key
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground',
              )}
            >
              {key === 'motifs' ? t('tabMotifs') : t('tabSheet')}
            </button>
          ))}
        </div>

        {open && (
          <ScrollArea className="max-h-[50dvh]">
            {tab === 'motifs' ? <DtfMotifsTab /> : <DtfSheetTab />}
            <div className="p-4 pt-0">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="w-full"
                onClick={() => setOpen(false)}
              >
                {t('closeSheet')}
              </Button>
            </div>
          </ScrollArea>
        )}
      </div>
    </div>
  )
}
