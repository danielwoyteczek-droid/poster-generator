'use client'

import { useTranslations } from 'next-intl'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DtfSheetTab } from './sidebar/DtfSheetTab'
import { DtfMotifsTab } from './sidebar/DtfMotifsTab'
import { DtfSheetCanvas } from './DtfSheetCanvas'

const TAB_TRIGGER_CN =
  'flex-1 h-full rounded-none text-xs font-medium data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-white'

/**
 * PROJ-55: Desktop-Layout des DTF-Editors. Spiegelt bewusst die Struktur
 * der bestehenden Editoren (Seitenleiste links, Arbeitsfläche rechts),
 * damit sich das neue Produkt nicht wie ein Fremdkörper anfühlt.
 */
export function DtfEditorLayout() {
  const t = useTranslations('dtfEditor')

  return (
    <div className="flex h-full overflow-hidden">
      <div className="w-72 shrink-0 border-r border-border bg-white flex flex-col">
        <Tabs defaultValue="motifs" className="flex flex-col h-full min-h-0">
          <TabsList className="w-full rounded-none border-b border-border bg-white h-10 p-0 gap-0">
            <TabsTrigger value="motifs" className={TAB_TRIGGER_CN}>
              {t('tabMotifs')}
            </TabsTrigger>
            <TabsTrigger value="sheet" className={TAB_TRIGGER_CN}>
              {t('tabSheet')}
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1">
            <TabsContent value="motifs" className="mt-0">
              <DtfMotifsTab />
            </TabsContent>
            <TabsContent value="sheet" className="mt-0">
              <DtfSheetTab />
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </div>

      <DtfSheetCanvas />
    </div>
  )
}
