'use client'

import '@maptiler/sdk/dist/maptiler-sdk.css'
import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Map, Droplet, Type, MapPin, Camera, ShoppingBag, Eye } from 'lucide-react'
import { PosterCanvas } from '@/components/editor/PosterCanvas'
import { PosterFrameModal } from '@/components/editor/PosterFrameModal'
import { MobileMapTab } from '@/components/sidebar/mobile/MobileMapTab'
import { MobileLayoutTab } from '@/components/sidebar/mobile/MobileLayoutTab'
import { MobileTextTab } from '@/components/sidebar/mobile/MobileTextTab'
import { MobileMarkerTab } from '@/components/sidebar/mobile/MobileMarkerTab'
import { MobilePhotoTab } from '@/components/sidebar/mobile/MobilePhotoTab'
import { MobileExportTab } from '@/components/sidebar/mobile/MobileExportTab'
import { useEditorStore } from '@/hooks/useEditorStore'
import { useMapExport } from '@/hooks/useMapExport'
import { useProjectSync } from '@/hooks/useProjectSync'
import { cn } from '@/lib/utils'
import type { PrintFormat } from '@/lib/print-formats'

type MobileTab = 'map' | 'layout' | 'text' | 'marker' | 'photo' | 'export'

export function MobileEditorLayout() {
  const t = useTranslations('editorTabs')
  useProjectSync()
  const [activeTab, setActiveTab] = useState<MobileTab>('map')

  // Zimmeransicht (room view) — accessible from any tab via the Eye button
  // overlaid on the live preview. Mirrors the Export-Tab "PreviewButton"
  // behaviour but reachable without leaving the current tab. Re-renders on
  // every open so the result reflects the latest edits.
  const { printFormat } = useEditorStore()
  const { renderPreview } = useMapExport()
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

  const TABS: { id: MobileTab; label: string; Icon: typeof Map }[] = [
    { id: 'map', label: t('map'), Icon: Map },
    { id: 'layout', label: t('layout'), Icon: Droplet },
    { id: 'text', label: t('text'), Icon: Type },
    { id: 'marker', label: t('marker'), Icon: MapPin },
    { id: 'photo', label: t('photos'), Icon: Camera },
    { id: 'export', label: t('export'), Icon: ShoppingBag },
  ]

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Preview — fixed height, always visible. Reduced padding so the
          poster fills as much of the preview area as possible on narrow
          mobile viewports. `activeMobileTool` routes touch interactivity
          to exactly one overlay at a time (map / text / photo / marker),
          matched to the active tab — so fingers don't fight each other
          on a small screen. */}
      <div className="h-[58vh] shrink-0 flex min-h-0 border-b border-border relative">
        <PosterCanvas padding={16} activeMobileTool={activeTab} />
        <button
          type="button"
          onClick={handleOpenZimmer}
          aria-label="Zimmeransicht öffnen"
          className="absolute top-3 left-3 w-11 h-11 rounded-full bg-white shadow-lg border border-border flex items-center justify-center text-foreground active:bg-muted z-50 touch-manipulation"
        >
          <Eye className="w-5 h-5" />
        </button>
      </div>

      {/* Tab bar — fixed under preview */}
      <nav
        className="h-14 shrink-0 grid grid-cols-6 bg-white border-b border-border"
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

      {/* Tool content — own scroll container */}
      <div className="flex-1 min-h-0 overflow-y-auto bg-white">
        {activeTab === 'map' && <MobileMapTab />}
        {activeTab === 'layout' && <MobileLayoutTab />}
        {activeTab === 'text' && <MobileTextTab />}
        {activeTab === 'marker' && <MobileMarkerTab />}
        {activeTab === 'photo' && <MobilePhotoTab />}
        {activeTab === 'export' && <MobileExportTab />}
      </div>

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
