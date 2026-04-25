'use client'

import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { TextTab } from '@/components/sidebar/TextTab'
import { StarMapTab } from './StarMapTab'
import { HimmelTab } from './HimmelTab'
import { StarMapExportTab } from './StarMapExportTab'
import { StarMapCanvas } from './StarMapCanvas'

export function StarMapLayout() {
  return (
    <div className="flex h-full overflow-hidden">
      <div className="w-72 shrink-0 border-r border-border bg-white flex flex-col">
        <Tabs defaultValue="stars" className="flex flex-col h-full">
          <TabsList className="w-full rounded-none border-b border-border bg-white h-10 p-0 gap-0">
            <TabsTrigger
              value="stars"
              className="flex-1 h-full rounded-none text-xs font-medium data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-white"
            >
              Sterne
            </TabsTrigger>
            <TabsTrigger
              value="himmel"
              className="flex-1 h-full rounded-none text-xs font-medium data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-white"
            >
              Himmel
            </TabsTrigger>
            <TabsTrigger
              value="text"
              className="flex-1 h-full rounded-none text-xs font-medium data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-white"
            >
              Text
            </TabsTrigger>
            <TabsTrigger
              value="export"
              className="flex-1 h-full rounded-none text-xs font-medium data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-white"
            >
              Export
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1">
            <TabsContent value="stars" className="mt-0">
              <StarMapTab />
            </TabsContent>
            <TabsContent value="himmel" className="mt-0">
              <HimmelTab />
            </TabsContent>
            <TabsContent value="text" className="mt-0">
              <TextTab />
            </TabsContent>
            <TabsContent value="export" className="mt-0">
              <StarMapExportTab />
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </div>

      <StarMapCanvas />
    </div>
  )
}
