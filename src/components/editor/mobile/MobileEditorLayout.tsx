'use client'

import '@maptiler/sdk/dist/maptiler-sdk.css'
import { useState } from 'react'
import { Map, Droplet, Type, MapPin, Camera, ShoppingBag } from 'lucide-react'
import { PosterCanvas } from '@/components/editor/PosterCanvas'
import { MobileMapTab } from '@/components/sidebar/mobile/MobileMapTab'
import { MobileLayoutTab } from '@/components/sidebar/mobile/MobileLayoutTab'
import { MobileTextTab } from '@/components/sidebar/mobile/MobileTextTab'
import { MobileMarkerTab } from '@/components/sidebar/mobile/MobileMarkerTab'
import { MobilePhotoTab } from '@/components/sidebar/mobile/MobilePhotoTab'
import { MobileExportTab } from '@/components/sidebar/mobile/MobileExportTab'
import { useProjectSync } from '@/hooks/useProjectSync'
import { cn } from '@/lib/utils'

type MobileTab = 'map' | 'layout' | 'text' | 'marker' | 'photo' | 'export'

const TABS: { id: MobileTab; label: string; Icon: typeof Map }[] = [
  { id: 'map', label: 'Karte', Icon: Map },
  { id: 'layout', label: 'Layout', Icon: Droplet },
  { id: 'text', label: 'Text', Icon: Type },
  { id: 'marker', label: 'Marker', Icon: MapPin },
  { id: 'photo', label: 'Fotos', Icon: Camera },
  { id: 'export', label: 'Export', Icon: ShoppingBag },
]

export function MobileEditorLayout() {
  useProjectSync()
  const [activeTab, setActiveTab] = useState<MobileTab>('map')

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Preview — fixed height, always visible. Reduced padding so the
          poster fills as much of the preview area as possible on narrow
          mobile viewports. Text-block dragging is only enabled while the
          Text tab is active (variable font-sizes require repositioning). */}
      <div className="h-[58vh] shrink-0 flex min-h-0 border-b border-gray-200">
        <PosterCanvas padding={16} textInteractive={activeTab === 'text'} />
      </div>

      {/* Tab bar — fixed under preview */}
      <nav
        className="h-14 shrink-0 grid grid-cols-6 bg-white border-b border-gray-200"
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
                  ? 'text-gray-900 border-t-2 border-gray-900 -mt-px'
                  : 'text-gray-500 hover:text-gray-700',
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
    </div>
  )
}
