'use client'

import '@maptiler/sdk/dist/maptiler-sdk.css'
import { useRef, useState } from 'react'
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
import { cn } from '@/lib/utils'
import { EditorViewProvider } from '@/components/editor/EditorViewContext'
import { EditorAnpassenFooter } from '@/components/editor/EditorAnpassenFooter'
import { EditorAnpassenSheet } from '@/components/editor/EditorAnpassenSheet'

type MobileTab = 'map' | 'layout' | 'text' | 'marker' | 'photo' | 'export'

// PROJ-36: Drag-handle snap points for the canvas height (in vh).
// 58 = default (matches pre-PROJ-36 layout), 30 = balanced, 12 = sidebar-max.
const SNAP_POINTS_VH = [12, 30, 58] as const
const DEFAULT_CANVAS_VH = 58
const COLLAPSED_CANVAS_VH = 12
const TAP_THRESHOLD_PX = 4

export function MobileEditorLayout() {
  const t = useTranslations('editorTabs')
  useProjectSync()
  const [activeTab, setActiveTab] = useState<MobileTab>('map')
  const [anpassenOpen, setAnpassenOpen] = useState(false)

  // PROJ-36: User can drag the handle to resize the canvas / sidebar split.
  // - Drag → free movement, snap to nearest of SNAP_POINTS_VH on release.
  // - Tap (no movement) → toggle between Default (58vh canvas) and Collapsed
  //   (12vh canvas, sidebar gets the rest). The middle 30vh state is only
  //   reachable via drag.
  const [canvasVh, setCanvasVh] = useState<number>(DEFAULT_CANVAS_VH)
  const [isDragging, setIsDragging] = useState(false)
  const dragRef = useRef({ startY: 0, startVh: DEFAULT_CANVAS_VH, moved: false })

  const handlePointerDown = (e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    dragRef.current = { startY: e.clientY, startVh: canvasVh, moved: false }
    setIsDragging(true)
  }
  const handlePointerMove = (e: React.PointerEvent) => {
    if (!e.currentTarget.hasPointerCapture(e.pointerId)) return
    const deltaY = e.clientY - dragRef.current.startY
    if (Math.abs(deltaY) > TAP_THRESHOLD_PX) dragRef.current.moved = true
    const deltaVh = (deltaY / window.innerHeight) * 100
    const next = Math.max(8, Math.min(72, dragRef.current.startVh + deltaVh))
    setCanvasVh(next)
  }
  const handlePointerUp = (e: React.PointerEvent) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId)
    }
    setIsDragging(false)
    if (!dragRef.current.moved) {
      // Tap (no movement) → toggle between Default and Collapsed.
      // "Other side" rule: if currently in upper half, snap to Collapsed;
      // otherwise snap back to Default.
      setCanvasVh(canvasVh > 35 ? COLLAPSED_CANVAS_VH : DEFAULT_CANVAS_VH)
      return
    }
    // Drag release → snap to nearest of the three defined points.
    const nearest = SNAP_POINTS_VH.reduce(
      (best, p) => (Math.abs(p - canvasVh) < Math.abs(best - canvasVh) ? p : best),
      SNAP_POINTS_VH[0],
    )
    setCanvasVh(nearest)
  }

  // Render the same tab content node for the active tab — used by both the
  // main customer view and the Anpassen-Sheet (the latter wraps it in
  // EditorViewProvider value="anpassen" to flip the visibility filter).
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
    <div className="flex flex-col h-full overflow-hidden">
      {/* Preview — height is now user-controlled via the drag-handle below.
          `activeMobileTool` routes touch interactivity to exactly one overlay
          at a time (map / text / photo / marker), matched to the active tab —
          so fingers don't fight each other on a small screen. */}
      <div
        className="shrink-0 flex min-h-0 border-b border-border relative"
        style={{
          height: `${canvasVh}vh`,
          transition: isDragging ? 'none' : 'height 200ms ease-out',
        }}
      >
        <PosterCanvas padding={16} activeMobileTool={activeTab} />
      </div>

      {/* Drag-handle — pull up to grow the sidebar, tap to toggle between
          default (58vh canvas) and collapsed (12vh canvas). */}
      <div
        role="separator"
        aria-orientation="horizontal"
        aria-label="Vorschau-Bereich anpassen"
        className="h-5 shrink-0 flex items-center justify-center cursor-ns-resize touch-none bg-white border-b border-border"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <div className="w-10 h-1 bg-muted-foreground/30 rounded-full" />
      </div>

      {/* Tab bar — fixed under handle */}
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
        <EditorViewProvider value="customer">
          {renderActiveTab()}
        </EditorViewProvider>
      </div>

      {/* Anpassen-Footer — sticky button between content and bottom edge */}
      <EditorAnpassenFooter onClick={() => setAnpassenOpen(true)} />

      {/* Anpassen-Sheet — opens from bottom on mobile */}
      <EditorAnpassenSheet open={anpassenOpen} onOpenChange={setAnpassenOpen}>
        {renderActiveTab()}
      </EditorAnpassenSheet>
    </div>
  )
}
