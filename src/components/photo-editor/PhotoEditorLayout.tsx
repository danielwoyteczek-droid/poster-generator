'use client'

import { useTranslations } from 'next-intl'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { TextTab } from '@/components/sidebar/TextTab'
import { LetterMaskTab } from './sidebar/LetterMaskTab'
import { PhotoSlotsTab } from './sidebar/PhotoSlotsTab'
import { PhotoPosterCanvas } from './PhotoPosterCanvas'

const TAB_TRIGGER_CN =
  'flex-1 h-full rounded-none text-xs font-medium data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-white'

export function PhotoEditorLayout() {
  const t = useTranslations('photoEditor')

  return (
    <div className="flex h-full overflow-hidden">
      <div className="w-72 shrink-0 border-r border-border bg-white flex flex-col">
        <Tabs defaultValue="word" className="flex flex-col h-full">
          <TabsList className="w-full rounded-none border-b border-border bg-white h-10 p-0 gap-0">
            <TabsTrigger value="word" className={TAB_TRIGGER_CN}>
              {t('tabWord')}
            </TabsTrigger>
            <TabsTrigger
              value="slots"
              data-photo-editor-slots-tab=""
              className={TAB_TRIGGER_CN}
            >
              {t('tabSlots')}
            </TabsTrigger>
            <TabsTrigger value="text" className={TAB_TRIGGER_CN}>
              {t('tabText')}
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1">
            <TabsContent value="word" className="mt-0">
              <LetterMaskTab />
            </TabsContent>
            <TabsContent value="slots" className="mt-0">
              <PhotoSlotsTab />
            </TabsContent>
            <TabsContent value="text" className="mt-0">
              <TextTab hideCoordinates />
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </div>

      <PhotoPosterCanvas />
    </div>
  )
}
