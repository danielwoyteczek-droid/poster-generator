'use client'

import { useTranslations } from 'next-intl'
import { Type, ImageIcon, Layers, Download } from 'lucide-react'
import { LetterMaskTab } from '../sidebar/LetterMaskTab'
import { PhotoSlotsTab } from '../sidebar/PhotoSlotsTab'
import { SinglePhotoTab } from '../sidebar/SinglePhotoTab'
import { PhotoGridTab } from '../sidebar/PhotoGridTab'
import { PhotoExportTab } from '../sidebar/PhotoExportTab'
import { MobileTextTab } from '@/components/sidebar/mobile/MobileTextTab'
import { PhotoPosterCanvas } from '../PhotoPosterCanvas'
import { useProjectSync } from '@/hooks/useProjectSync'
import { usePhotoEditorStore } from '@/hooks/usePhotoEditorStore'
import { useMobileSheet } from '@/hooks/useMobileSheet'
import type { MobileEditorTool } from '@/components/editor/PosterCanvas'
import { cn } from '@/lib/utils'
import { MobileBottomSheet } from '@/components/editor/mobile/MobileBottomSheet'

type MobilePhotoTab = 'word' | 'slots' | 'text' | 'export'

const TAB_TO_TOOL: Record<MobilePhotoTab, MobileEditorTool> = {
  word: 'photo',
  slots: 'photo',
  text: 'text',
  export: 'photo',
}

const SHEET_ID = 'mobile-photo-sheet'

/**
 * PROJ-43 mobile photo editor: same tap-sheet pattern as map + star-map.
 * Touch-Isolation: word-/slots-Tab → letter-mask slots are interactive,
 * text-Tab → text-block dragging is interactive. The sheet's open state
 * keys the tool routing too — when the sheet is closed the canvas is in
 * "preview only" mode.
 */
export function MobilePhotoEditorLayout() {
  const t = useTranslations('photoEditor')
  const tEditor = useTranslations('editor')
  const layoutMode = usePhotoEditorStore((s) => s.layoutMode)
  const isLetterMask = layoutMode === 'letter-mask'
  const isPhotoGrid = layoutMode === 'photo-grid'
  // Default to the slots tab in single-photo mode (no word to type) so the
  // customer lands directly on the upload UI when they open the sheet.
  const initialTab: MobilePhotoTab = isLetterMask ? 'word' : 'slots'
  const { isOpen, sheetState, activeTab, openTab, canvasTapHandlers } =
    useMobileSheet<MobilePhotoTab>({ initialTab })
  useProjectSync('photo')

  const allTabs: { id: MobilePhotoTab; label: string; Icon: typeof Type }[] = [
    { id: 'word', label: t('tabWord'), Icon: Layers },
    {
      id: 'slots',
      label: isLetterMask
        ? t('tabSlots')
        : isPhotoGrid
          ? t('tabPhotoGrid')
          : t('tabSinglePhoto'),
      Icon: ImageIcon,
    },
    { id: 'text', label: t('tabText'), Icon: Type },
    { id: 'export', label: tEditor('downloadHeading'), Icon: Download },
  ]
  const TABS = isLetterMask ? allTabs : allTabs.filter((t) => t.id !== 'word')

  return (
    <div className="relative flex flex-col h-full overflow-hidden">
      <div className="flex-1 min-h-0 flex" {...canvasTapHandlers}>
        <PhotoPosterCanvas
          padding={32}
          activeMobileTool={TAB_TO_TOOL[activeTab]}
        />
      </div>

      <nav
        className={cn(
          'h-14 shrink-0 grid bg-white border-t border-border relative z-40',
          TABS.length === 4 ? 'grid-cols-4' : 'grid-cols-3',
        )}
        role="tablist"
      >
        {TABS.map(({ id, label, Icon }) => {
          const active = activeTab === id && isOpen
          return (
            <button
              key={id}
              role="tab"
              aria-selected={active}
              aria-expanded={active}
              aria-controls={SHEET_ID}
              onClick={() => openTab(id)}
              className={cn(
                'flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors min-h-[44px] touch-manipulation',
                active
                  ? 'text-foreground border-t-2 border-primary -mt-px'
                  : 'text-muted-foreground hover:text-foreground/70',
              )}
            >
              <Icon className={cn('w-5 h-5', active && 'stroke-[2.25]')} />
              <span>{label}</span>
            </button>
          )
        })}
      </nav>

      <MobileBottomSheet state={sheetState} id={SHEET_ID}>
        {activeTab === 'word' && isLetterMask && <LetterMaskTab />}
        {activeTab === 'slots' &&
          (isLetterMask ? (
            <PhotoSlotsTab />
          ) : isPhotoGrid ? (
            <PhotoGridTab />
          ) : (
            <SinglePhotoTab />
          ))}
        {activeTab === 'text' && <MobileTextTab hideCoordinates />}
        {activeTab === 'export' && <PhotoExportTab />}
      </MobileBottomSheet>
    </div>
  )
}
