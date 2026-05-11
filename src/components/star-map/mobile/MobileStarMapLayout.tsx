'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Star, Sparkles, Type, ShoppingBag, Eye } from 'lucide-react'
import { StarMapCanvas } from '@/components/star-map/StarMapCanvas'
import { PosterFrameModal } from '@/components/editor/PosterFrameModal'
import { MobileStarMapTab } from './MobileStarMapTab'
import { MobileHimmelTab } from './MobileHimmelTab'
import { MobileStarMapExportTab } from './MobileStarMapExportTab'
import { MobileTextTab } from '@/components/sidebar/mobile/MobileTextTab'
import { useEditorStore } from '@/hooks/useEditorStore'
import { useStarMapStore } from '@/hooks/useStarMapStore'
import { useStarMapExport } from '@/hooks/useStarMapExport'
import { useProjectSync } from '@/hooks/useProjectSync'
import { useMobileSheet } from '@/hooks/useMobileSheet'
import type { PrintFormat } from '@/lib/print-formats'
import { cn } from '@/lib/utils'
import { MobileBottomSheet } from '@/components/editor/mobile/MobileBottomSheet'

type MobileStarMapTab = 'stars' | 'sky' | 'text' | 'export'

const SHEET_ID = 'mobile-starmap-sheet'

export function MobileStarMapLayout() {
  const t = useTranslations('editorTabs')
  const { isOpen, sheetState, activeTab, openTab, canvasTapHandlers } =
    useMobileSheet<MobileStarMapTab>({ initialTab: 'stars' })

  const { printFormat } = useEditorStore()
  const { lat, lng, locationName } = useStarMapStore()
  const { renderPreview } = useStarMapExport()
  useProjectSync('star-map')
  const [zimmerOpen, setZimmerOpen] = useState(false)
  const [zimmerImage, setZimmerImage] = useState<string | null>(null)
  const [zimmerLoading, setZimmerLoading] = useState(false)
  const [zimmerError, setZimmerError] = useState<string | null>(null)

  const handleOpenZimmer = async () => {
    setZimmerOpen(true)
    setZimmerLoading(true)
    setZimmerImage(null)
    setZimmerError(null)
    try {
      const url = await renderPreview(printFormat as PrintFormat)
      setZimmerImage(url)
    } catch (err) {
      setZimmerError(err instanceof Error ? err.message : 'Vorschau fehlgeschlagen')
    } finally {
      setZimmerLoading(false)
    }
  }

  const TABS: { id: MobileStarMapTab; label: string; Icon: typeof Star }[] = [
    { id: 'stars', label: t('stars'), Icon: Star },
    { id: 'sky', label: t('sky'), Icon: Sparkles },
    { id: 'text', label: t('text'), Icon: Type },
    { id: 'export', label: t('export'), Icon: ShoppingBag },
  ]

  return (
    <div className="relative flex flex-col h-full overflow-hidden">
      <div className="flex-1 min-h-0 flex relative" {...canvasTapHandlers}>
        <StarMapCanvas padding={16} textInteractive={activeTab === 'text' && isOpen} />
        <button
          type="button"
          onClick={handleOpenZimmer}
          aria-label="Zimmeransicht öffnen"
          data-canvas-interactive
          className="absolute top-3 left-3 w-11 h-11 rounded-full bg-white shadow-lg border border-border flex items-center justify-center text-foreground active:bg-muted z-50 touch-manipulation"
        >
          <Eye className="w-5 h-5" />
        </button>
      </div>

      <nav
        className="h-14 shrink-0 grid grid-cols-4 bg-white border-t border-border relative z-40"
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
        {activeTab === 'stars' && <MobileStarMapTab />}
        {activeTab === 'sky' && <MobileHimmelTab />}
        {activeTab === 'text' && <MobileTextTab coordinatesSource={{ lat, lng, locationName }} />}
        {activeTab === 'export' && <MobileStarMapExportTab />}
      </MobileBottomSheet>

      <PosterFrameModal
        open={zimmerOpen}
        onOpenChange={setZimmerOpen}
        imageDataUrl={zimmerImage}
        isLoading={zimmerLoading}
        error={zimmerError}
      />
    </div>
  )
}
