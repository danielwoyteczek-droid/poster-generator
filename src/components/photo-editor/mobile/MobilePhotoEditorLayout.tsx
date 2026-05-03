'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Type, ImageIcon, Layers, Download } from 'lucide-react'
import { LetterMaskTab } from '../sidebar/LetterMaskTab'
import { PhotoSlotsTab } from '../sidebar/PhotoSlotsTab'
import { SinglePhotoTab } from '../sidebar/SinglePhotoTab'
import { PhotoExportTab } from '../sidebar/PhotoExportTab'
import { MobileTextTab } from '@/components/sidebar/mobile/MobileTextTab'
import { PhotoPosterCanvas } from '../PhotoPosterCanvas'
import { useProjectSync } from '@/hooks/useProjectSync'
import { usePhotoEditorStore } from '@/hooks/usePhotoEditorStore'
import type { MobileEditorTool } from '@/components/editor/PosterCanvas'
import { cn } from '@/lib/utils'

type MobilePhotoTab = 'word' | 'slots' | 'text' | 'export'

const TAB_TO_TOOL: Record<MobilePhotoTab, MobileEditorTool> = {
  word: 'photo',
  slots: 'photo',
  text: 'text',
  export: 'photo',
}

/**
 * Mobile-Pendant zu `PhotoEditorLayout` — fixe Vorschau oben, fixe Tab-Bar,
 * scrollbarer Tool-Container darunter. Spiegelt das Pattern aus PROJ-18 /
 * PROJ-27 (Karten-Editor + Mobile Star-Map).
 *
 * Touch-Isolation: Im Word-/Slots-Tab sind die Letter-Mask-Slots
 * interaktiv (Pan-Crop), im Text-Tab sind Textblöcke interaktiv. Das
 * verhindert versehentliches Zugreifen aus angrenzenden Tabs.
 */
export function MobilePhotoEditorLayout() {
  const t = useTranslations('photoEditor')
  const tEditor = useTranslations('editor')
  const layoutMode = usePhotoEditorStore((s) => s.layoutMode)
  const isLetterMask = layoutMode === 'letter-mask'
  // Default to the slots tab in single-photo mode (no word to type) so the
  // customer lands directly on the upload UI.
  const [activeTab, setActiveTab] = useState<MobilePhotoTab>(
    isLetterMask ? 'word' : 'slots',
  )
  useProjectSync('photo')

  const allTabs: { id: MobilePhotoTab; label: string; Icon: typeof Type }[] = [
    { id: 'word', label: t('tabWord'), Icon: Layers },
    {
      id: 'slots',
      label: isLetterMask ? t('tabSlots') : t('tabSinglePhoto'),
      Icon: ImageIcon,
    },
    { id: 'text', label: t('tabText'), Icon: Type },
    { id: 'export', label: tEditor('downloadHeading'), Icon: Download },
  ]
  // Word tab is meaningless without a letter-mask wort — hide it in
  // single-photo mode so the tab bar collapses to 3 columns.
  const TABS = isLetterMask ? allTabs : allTabs.filter((t) => t.id !== 'word')

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="h-[58vh] shrink-0 flex min-h-0 border-b border-border relative">
        <PhotoPosterCanvas
          padding={16}
          activeMobileTool={TAB_TO_TOOL[activeTab]}
        />
      </div>

      <nav
        className={cn(
          'h-14 shrink-0 grid bg-white border-b border-border',
          TABS.length === 4 ? 'grid-cols-4' : 'grid-cols-3',
        )}
        role="tablist"
      >
        {TABS.map(({ id, label, Icon }) => {
          const active = activeTab === id
          return (
            <button
              key={id}
              role="tab"
              aria-selected={active}
              onClick={() => setActiveTab(id)}
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

      <div className="flex-1 min-h-0 overflow-y-auto bg-white">
        {activeTab === 'word' && isLetterMask && <LetterMaskTab />}
        {activeTab === 'slots' && (isLetterMask ? <PhotoSlotsTab /> : <SinglePhotoTab />)}
        {activeTab === 'text' && <MobileTextTab hideCoordinates />}
        {activeTab === 'export' && <PhotoExportTab />}
      </div>
    </div>
  )
}
