'use client'

import '@maptiler/sdk/dist/maptiler-sdk.css'
import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { MapTab } from '@/components/sidebar/MapTab'
import { TextTab } from '@/components/sidebar/TextTab'
import { PhotoTab } from '@/components/sidebar/PhotoTab'
import { ExportTab } from '@/components/sidebar/ExportTab'
import { PosterCanvas } from './PosterCanvas'
import { useProjectSync } from '@/hooks/useProjectSync'
import { EditorViewProvider } from './EditorViewContext'
import { EditorAnpassenFooter } from './EditorAnpassenFooter'
import { EditorAnpassenSheet } from './EditorAnpassenSheet'

export function EditorLayout() {
  const t = useTranslations('editorTabs')
  useProjectSync()
  const [anpassenOpen, setAnpassenOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'map' | 'text' | 'photo' | 'export'>('map')

  // PROJ-36: Customer-Min view in main sidebar; Anpassen-controls live in
  // the Sheet. Admin bypasses the gate (sees everything flat in the sidebar)
  // — see shouldRenderControl in EditorViewContext.
  return (
    <div className="flex h-full overflow-hidden">
      {/* Sidebar */}
      <div className="w-72 shrink-0 border-r border-border bg-white flex flex-col">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)} className="flex flex-col h-full min-h-0">
          <TabsList className="w-full rounded-none border-b border-border bg-white h-10 p-0 gap-0 shrink-0">
            <TabsTrigger
              value="map"
              className="flex-1 h-full rounded-none text-xs font-medium data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-white"
            >
              {t('map')}
            </TabsTrigger>
            <TabsTrigger
              value="text"
              className="flex-1 h-full rounded-none text-xs font-medium data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-white"
            >
              {t('text')}
            </TabsTrigger>
            <TabsTrigger
              value="photo"
              className="flex-1 h-full rounded-none text-xs font-medium data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-white"
            >
              {t('photo')}
            </TabsTrigger>
            <TabsTrigger
              value="export"
              className="flex-1 h-full rounded-none text-xs font-medium data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-white"
            >
              {t('export')}
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1 min-h-0">
            <EditorViewProvider value="customer">
              <TabsContent value="map" className="mt-0">
                <MapTab />
              </TabsContent>
              <TabsContent value="text" className="mt-0">
                <TextTab />
              </TabsContent>
              <TabsContent value="photo" className="mt-0">
                <PhotoTab />
              </TabsContent>
              <TabsContent value="export" className="mt-0">
                <ExportTab />
              </TabsContent>
            </EditorViewProvider>
          </ScrollArea>

          <EditorAnpassenFooter onClick={() => setAnpassenOpen(true)} />
        </Tabs>
      </div>

      {/* Anpassen-Sheet — mirrors the active tab's Anpassen-classified controls */}
      <EditorAnpassenSheet open={anpassenOpen} onOpenChange={setAnpassenOpen}>
        {activeTab === 'map' && <MapTab />}
        {activeTab === 'text' && <TextTab />}
        {activeTab === 'photo' && <PhotoTab />}
        {activeTab === 'export' && <ExportTab />}
      </EditorAnpassenSheet>

      {/* Map preview area */}
      <PosterCanvas />
    </div>
  )
}
