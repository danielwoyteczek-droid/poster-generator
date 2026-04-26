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
import type { PrintFormat } from '@/lib/print-formats'
import { cn } from '@/lib/utils'

/**
 * Mobile-Pendant zu `StarMapLayout` — fixe Vorschau oben, fixe Tab-Bar,
 * scrollbarer Tool-Container darunter. Spiegelt das Pattern aus PROJ-18
 * (`MobileEditorLayout`) mit den vier Star-Map-Tabs:
 *
 *   stars  → Datum, Ort, Sternfarben (StarMapTab)
 *   sky    → Konstellationen, Milchstraße etc. (HimmelTab)
 *   text   → geteilte Textblock-Liste mit Sheet-Editor
 *   export → Format, Produkt, Checkout
 *
 * Der Eye-Button öffnet die Zimmeransicht aus jedem Tab. Textblock-Dragging
 * ist nur im Text-Tab aktiv (Touch-Isolation analog Karten-Editor).
 */

type MobileStarMapTab = 'stars' | 'sky' | 'text' | 'export'

export function MobileStarMapLayout() {
  const t = useTranslations('editorTabs')
  const [activeTab, setActiveTab] = useState<MobileStarMapTab>('stars')

  const { printFormat } = useEditorStore()
  const { lat, lng, locationName } = useStarMapStore()
  const { renderPreview } = useStarMapExport()
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
    <div className="flex flex-col h-full overflow-hidden">
      {/* Preview — fixe Höhe, immer sichtbar. Auf Star-Map gibt es keine
          Map-Pan/Zoom-Geste, daher einzige interaktive Zone: Textblöcke im
          Text-Tab. */}
      <div className="h-[58vh] shrink-0 flex min-h-0 border-b border-border relative">
        <StarMapCanvas padding={16} textInteractive={activeTab === 'text'} />
        <button
          type="button"
          onClick={handleOpenZimmer}
          aria-label="Zimmeransicht öffnen"
          className="absolute top-3 left-3 w-11 h-11 rounded-full bg-white shadow-lg border border-border flex items-center justify-center text-foreground active:bg-muted z-50 touch-manipulation"
        >
          <Eye className="w-5 h-5" />
        </button>
      </div>

      {/* Tab-Bar */}
      <nav
        className="h-14 shrink-0 grid grid-cols-4 bg-white border-b border-border"
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

      {/* Tool-Container */}
      <div className="flex-1 min-h-0 overflow-y-auto bg-white">
        {activeTab === 'stars' && <MobileStarMapTab />}
        {activeTab === 'sky' && <MobileHimmelTab />}
        {activeTab === 'text' && <MobileTextTab coordinatesSource={{ lat, lng, locationName }} />}
        {activeTab === 'export' && <MobileStarMapExportTab />}
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
