'use client'

import { useTranslations } from 'next-intl'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { TextTab } from '@/components/sidebar/TextTab'
import { LetterMaskTab } from './sidebar/LetterMaskTab'
import { PhotoSlotsTab } from './sidebar/PhotoSlotsTab'
import { SinglePhotoTab } from './sidebar/SinglePhotoTab'
import { PhotoGridTab } from './sidebar/PhotoGridTab'
import { GridLayoutDesigner } from '@/components/admin/GridLayoutDesigner'
import { useAuth } from '@/hooks/useAuth'
import { PhotoExportTab } from './sidebar/PhotoExportTab'
import { PhotoPosterCanvas } from './PhotoPosterCanvas'
import { useProjectSync } from '@/hooks/useProjectSync'
import { usePhotoEditorStore } from '@/hooks/usePhotoEditorStore'
import { useEditorStore } from '@/hooks/useEditorStore'
import { PRINT_FORMAT_OPTIONS } from '@/lib/print-formats'
import { cn } from '@/lib/utils'

const TAB_TRIGGER_CN =
  'flex-1 h-full rounded-none text-xs font-medium data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-white'

export function PhotoEditorLayout() {
  const t = useTranslations('photoEditor')
  const tEditor = useTranslations('editor')
  const layoutMode = usePhotoEditorStore((s) => s.layoutMode)
  const { isAdmin } = useAuth()
  const { printFormat, setPrintFormat } = useEditorStore()
  useProjectSync('photo')

  // The "photos" tab is mode-aware: letter-mask shows the per-letter slot
  // list, single-photo shows the single-image upload + mask picker,
  // photo-grid shows the per-slot upload + crop list. The word tab is
  // hidden outside letter-mask (no word to edit).
  const isLetterMask = layoutMode === 'letter-mask'
  const isPhotoGrid = layoutMode === 'photo-grid'
  const showDesignerTab = isPhotoGrid && isAdmin

  return (
    <div className="flex h-full overflow-hidden">
      <div className="w-72 shrink-0 border-r border-border bg-white flex flex-col">
        {/* PROJ-37: Paper format sits above the tabs so the customer picks
            the canvas shape before designing — same pattern as the map and
            star-map editors. */}
        <div className="p-4 border-b border-border space-y-1.5">
          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
            Papierformat
          </Label>
          <div className="grid grid-cols-3 gap-1.5">
            {PRINT_FORMAT_OPTIONS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setPrintFormat(f.id)}
                className={cn(
                  'h-9 rounded-md border-2 text-sm font-medium transition-colors',
                  printFormat === f.id
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border text-foreground/70 hover:border-muted-foreground',
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
        <Tabs
          defaultValue={isLetterMask ? 'word' : 'slots'}
          className="flex flex-col h-full min-h-0"
        >
          <TabsList className="w-full rounded-none border-b border-border bg-white h-10 p-0 gap-0">
            {isLetterMask && (
              <TabsTrigger value="word" className={TAB_TRIGGER_CN}>
                {t('tabWord')}
              </TabsTrigger>
            )}
            <TabsTrigger
              value="slots"
              data-photo-editor-slots-tab=""
              className={TAB_TRIGGER_CN}
            >
              {isLetterMask
                ? t('tabSlots')
                : isPhotoGrid
                  ? t('tabPhotoGrid')
                  : t('tabSinglePhoto')}
            </TabsTrigger>
            {showDesignerTab && (
              <TabsTrigger value="designer" className={TAB_TRIGGER_CN}>
                {t('tabGridDesigner')}
              </TabsTrigger>
            )}
            <TabsTrigger value="text" className={TAB_TRIGGER_CN}>
              {t('tabText')}
            </TabsTrigger>
            <TabsTrigger value="export" className={TAB_TRIGGER_CN}>
              {tEditor('downloadHeading')}
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1">
            {isLetterMask && (
              <TabsContent value="word" className="mt-0">
                <LetterMaskTab />
              </TabsContent>
            )}
            <TabsContent value="slots" className="mt-0">
              {isLetterMask ? (
                <PhotoSlotsTab />
              ) : isPhotoGrid ? (
                <PhotoGridTab />
              ) : (
                <SinglePhotoTab />
              )}
            </TabsContent>
            {showDesignerTab && (
              <TabsContent value="designer" className="mt-0">
                <GridLayoutDesigner />
              </TabsContent>
            )}
            <TabsContent value="text" className="mt-0">
              <TextTab hideCoordinates />
            </TabsContent>
            <TabsContent value="export" className="mt-0">
              <PhotoExportTab />
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </div>

      <PhotoPosterCanvas />
    </div>
  )
}
