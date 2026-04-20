'use client'

import '@maptiler/sdk/dist/maptiler-sdk.css'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { MapTab } from '@/components/sidebar/MapTab'
import { TextTab } from '@/components/sidebar/TextTab'
import { ExportTab } from '@/components/sidebar/ExportTab'
import { PosterCanvas } from './PosterCanvas'
import { useProjectSync } from '@/hooks/useProjectSync'

export function EditorLayout() {
  useProjectSync()

  return (
    <div className="flex h-full overflow-hidden">
      {/* Sidebar */}
      <div className="w-72 shrink-0 border-r border-gray-200 bg-white flex flex-col">
        <Tabs defaultValue="map" className="flex flex-col h-full">
          <TabsList className="w-full rounded-none border-b border-gray-200 bg-white h-10 p-0 gap-0">
            <TabsTrigger
              value="map"
              className="flex-1 h-full rounded-none text-xs font-medium data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-gray-900 data-[state=active]:bg-white"
            >
              Karte
            </TabsTrigger>
            <TabsTrigger
              value="text"
              className="flex-1 h-full rounded-none text-xs font-medium data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-gray-900 data-[state=active]:bg-white"
            >
              Text
            </TabsTrigger>
            <TabsTrigger
              value="export"
              className="flex-1 h-full rounded-none text-xs font-medium data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-gray-900 data-[state=active]:bg-white"
            >
              Export
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1">
            <TabsContent value="map" className="mt-0">
              <MapTab />
            </TabsContent>
            <TabsContent value="text" className="mt-0">
              <TextTab />
            </TabsContent>
            <TabsContent value="export" className="mt-0">
              <ExportTab />
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </div>

      {/* Map preview area */}
      <PosterCanvas />
    </div>
  )
}
