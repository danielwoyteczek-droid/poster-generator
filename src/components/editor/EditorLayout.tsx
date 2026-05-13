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
import { EditorViewProvider, type EditorView } from './EditorViewContext'
import { EditorViewToggle } from './EditorViewToggle'

export function EditorLayout() {
  const t = useTranslations('editorTabs')
  useProjectSync()
  // PROJ-36 (2026-05-13 pivot): view-mode toggle replaces the previous
  // Sheet/Drawer. Customer-Min and Anpassen views both live inside the
  // sidebar — no modal overlay greys out the canvas while editing.
  const [view, setView] = useState<EditorView>('customer')
  const [activeTab, setActiveTab] = useState<'map' | 'text' | 'photo' | 'export'>('map')

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
            <EditorViewProvider value={view}>
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

          {/* „Erweiterte Optionen"-Switch unten — reveals the anpassen-
              classified sections additively. Hidden for admin. */}
          <div className="p-2 shrink-0 border-t border-border">
            <EditorViewToggle view={view} onChange={setView} />
          </div>
        </Tabs>
      </div>

      {/* Map preview area */}
      <PosterCanvas />
    </div>
  )
}
