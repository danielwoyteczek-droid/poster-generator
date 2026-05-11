'use client'

import '@maptiler/sdk/dist/maptiler-sdk.css'
import { useTranslations } from 'next-intl'
import { Map, Droplet, Type, MapPin, Camera, ShoppingBag } from 'lucide-react'
import { PosterCanvas } from '@/components/editor/PosterCanvas'
import { MobileMapTab } from '@/components/sidebar/mobile/MobileMapTab'
import { MobileLayoutTab } from '@/components/sidebar/mobile/MobileLayoutTab'
import { MobileTextTab } from '@/components/sidebar/mobile/MobileTextTab'
import { MobileMarkerTab } from '@/components/sidebar/mobile/MobileMarkerTab'
import { MobilePhotoTab } from '@/components/sidebar/mobile/MobilePhotoTab'
import { MobileExportTab } from '@/components/sidebar/mobile/MobileExportTab'
import { useProjectSync } from '@/hooks/useProjectSync'
import { useMobileSheet } from '@/hooks/useMobileSheet'
import { cn } from '@/lib/utils'
import { EditorViewProvider } from '@/components/editor/EditorViewContext'
import { MobileBottomSheet } from './MobileBottomSheet'

type MobileTab = 'map' | 'layout' | 'text' | 'marker' | 'photo' | 'export'

const SHEET_ID = 'mobile-editor-sheet'

export function MobileEditorLayout() {
  const t = useTranslations('editorTabs')
  useProjectSync()
  const { isOpen, sheetState, activeTab, openTab, canvasTapHandlers } =
    useMobileSheet<MobileTab>({ initialTab: 'map' })

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'map': return <MobileMapTab />
      case 'layout': return <MobileLayoutTab />
      case 'text': return <MobileTextTab />
      case 'marker': return <MobileMarkerTab />
      case 'photo': return <MobilePhotoTab />
      case 'export': return <MobileExportTab />
    }
  }

  const TABS: { id: MobileTab; label: string; Icon: typeof Map }[] = [
    { id: 'map', label: t('map'), Icon: Map },
    { id: 'layout', label: t('layout'), Icon: Droplet },
    { id: 'text', label: t('text'), Icon: Type },
    { id: 'marker', label: t('marker'), Icon: MapPin },
    { id: 'photo', label: t('photos'), Icon: Camera },
    { id: 'export', label: t('export'), Icon: ShoppingBag },
  ]

  return (
    <div className="relative flex flex-col h-full overflow-hidden">
      {/* Canvas — always fills the viewport minus the tab-bar. The sheet
          slides up over the lower half when open. Tap-to-close detection
          is on the wrapper; pan/pinch/marker-drag leak through naturally
          via the 10px/300ms thresholds. */}
      <div className="flex-1 min-h-0 flex" {...canvasTapHandlers}>
        <PosterCanvas padding={16} activeMobileTool={activeTab} />
      </div>

      {/* Tab bar — always visible, anchored above the sheet (z-40 > sheet z-30). */}
      <nav
        className="h-14 shrink-0 grid grid-cols-6 bg-white border-t border-border relative z-40"
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
                'flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors',
                'min-h-[44px] touch-manipulation',
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
        <EditorViewProvider value="customer">
          {renderActiveTab()}
        </EditorViewProvider>
      </MobileBottomSheet>
    </div>
  )
}
