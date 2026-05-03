'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Plus, Trash2, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { useEditorStore } from '@/hooks/useEditorStore'
import { usePhotoEditorStore } from '@/hooks/usePhotoEditorStore'
import { PRINT_FORMATS } from '@/lib/print-formats'
import {
  DEFAULT_GRID_LAYOUT,
  GRID_MAX_SLOTS,
  GRID_MIN_SLOTS,
  GRID_SLOT_MASK_OPTIONS,
  clamp01,
  nextSlotId,
  snapFraction,
  type GridSlotDefinition,
  type GridSlotMaskKey,
} from '@/lib/grid-layout'
import { useTranslatedLabel } from '@/lib/i18n-catalog'
import { cn } from '@/lib/utils'

type DragMode = 'move' | 'resize-nw' | 'resize-ne' | 'resize-sw' | 'resize-se'

interface DragState {
  index: number
  mode: DragMode
  startPointerX: number
  startPointerY: number
  startSlot: GridSlotDefinition
}

/**
 * Visual editor where Admin authors the grid-layout slot rectangles per
 * preset. Drag-to-move + corner-resize handles. Slot positions live in
 * `usePhotoEditorStore.gridLayout` and are persisted into the preset's
 * `config_json.gridLayout` via `SaveAsPresetButton`.
 *
 * Why live in the photo-editor sidebar (not a dedicated admin page):
 * Presets are created/edited by clicking "Als Preset" in the editor
 * toolbar — the same flow the existing map / star-map presets use. A
 * separate admin page would create a parallel editing surface that
 * easily drifts out of sync. Sidebar tab gated behind `useAuth().isAdmin`
 * keeps customers from seeing it.
 */
export function GridLayoutDesigner() {
  const t = useTranslations('photoEditor')
  const tDesigner = useTranslations('gridDesigner')
  const slotMaskLabel = useTranslatedLabel('gridSlotMasks')

  const printFormat = useEditorStore((s) => s.printFormat)
  const orientation = usePhotoEditorStore((s) => s.orientation)
  const gridLayout = usePhotoEditorStore((s) => s.gridLayout)
  const selectedIndex = usePhotoEditorStore((s) => s.selectedGridSlotIndex)
  const setGridLayout = usePhotoEditorStore((s) => s.setGridLayout)
  const setSelectedGridSlotIndex = usePhotoEditorStore((s) => s.setSelectedGridSlotIndex)

  const [snapEnabled, setSnapEnabled] = useState(true)
  const stageRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<DragState | null>(null)

  const baseFmt = PRINT_FORMATS[printFormat]
  const baseRatio = baseFmt.widthMm / baseFmt.heightMm
  const ratio = orientation === 'landscape' ? 1 / baseRatio : baseRatio

  // Live-update slot during drag without clobbering the entire layout each
  // frame. We mutate via setGridLayout but keep the slot id stable so the
  // selection survives.
  useEffect(() => {
    const handleMove = (ev: PointerEvent) => {
      const drag = dragRef.current
      const stage = stageRef.current
      if (!drag || !stage) return
      const rect = stage.getBoundingClientRect()
      if (rect.width === 0 || rect.height === 0) return

      const dxFrac = (ev.clientX - drag.startPointerX) / rect.width
      const dyFrac = (ev.clientY - drag.startPointerY) / rect.height

      const next = applyDrag(drag.startSlot, drag.mode, dxFrac, dyFrac, snapEnabled)
      const layout = usePhotoEditorStore.getState().gridLayout
      const updated = layout.map((slot, i) => (i === drag.index ? next : slot))
      setGridLayout(updated)
    }
    const handleUp = () => {
      dragRef.current = null
      window.removeEventListener('pointermove', handleMove)
      window.removeEventListener('pointerup', handleUp)
      window.removeEventListener('pointercancel', handleUp)
    }

    const subscribeIfDragging = () => {
      if (!dragRef.current) return
      window.addEventListener('pointermove', handleMove)
      window.addEventListener('pointerup', handleUp)
      window.addEventListener('pointercancel', handleUp)
    }
    // Re-subscribe whenever the dragRef gets set; an interval is overkill —
    // we instead expose `startDrag` which subscribes synchronously.
    const startDrag = (state: DragState) => {
      dragRef.current = state
      subscribeIfDragging()
    }
    ;(stageRef.current as unknown as { __startDrag?: typeof startDrag } | null)
      ? ((stageRef.current as unknown as { __startDrag?: typeof startDrag }).__startDrag = startDrag)
      : void 0

    return () => {
      window.removeEventListener('pointermove', handleMove)
      window.removeEventListener('pointerup', handleUp)
      window.removeEventListener('pointercancel', handleUp)
    }
  }, [snapEnabled, setGridLayout])

  const handleAddSlot = () => {
    if (gridLayout.length >= GRID_MAX_SLOTS) return
    const id = nextSlotId(gridLayout)
    // Spawn a sensible default slot in the centre — 30% × 30%.
    const newSlot: GridSlotDefinition = {
      id,
      x: 0.35,
      y: 0.35,
      width: 0.3,
      height: 0.3,
      mask: 'rect',
    }
    setGridLayout([...gridLayout, newSlot])
    setSelectedGridSlotIndex(gridLayout.length)
  }

  const handleDeleteSelected = () => {
    if (selectedIndex === null) return
    if (gridLayout.length <= GRID_MIN_SLOTS) return
    const next = gridLayout.filter((_, i) => i !== selectedIndex)
    setGridLayout(next)
    setSelectedGridSlotIndex(null)
  }

  const handleReset = () => {
    setGridLayout(DEFAULT_GRID_LAYOUT.slots.map((s) => ({ ...s })))
    setSelectedGridSlotIndex(null)
  }

  const handleMaskChange = (maskKey: GridSlotMaskKey) => {
    if (selectedIndex === null) return
    const next = gridLayout.map((slot, i) =>
      i === selectedIndex ? { ...slot, mask: maskKey } : slot,
    )
    setGridLayout(next)
  }

  const startDrag = (
    e: React.PointerEvent<HTMLDivElement>,
    index: number,
    mode: DragMode,
  ) => {
    e.stopPropagation()
    e.preventDefault()
    setSelectedGridSlotIndex(index)
    const startSlot = gridLayout[index]
    if (!startSlot) return
    const stage = stageRef.current as unknown as
      | { __startDrag?: (s: DragState) => void }
      | null
    stage?.__startDrag?.({
      index,
      mode,
      startPointerX: e.clientX,
      startPointerY: e.clientY,
      startSlot: { ...startSlot },
    })
  }

  const selectedSlot = selectedIndex !== null ? gridLayout[selectedIndex] : null
  const canDelete = selectedSlot !== null && gridLayout.length > GRID_MIN_SLOTS
  const canAdd = gridLayout.length < GRID_MAX_SLOTS

  const slotCountHint = useMemo(
    () => tDesigner('slotCountHint', { count: gridLayout.length, min: GRID_MIN_SLOTS, max: GRID_MAX_SLOTS }),
    [gridLayout.length, tDesigner],
  )

  return (
    <div className="space-y-4 p-4">
      <div>
        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
          {tDesigner('title')}
        </Label>
        <p className="mt-1 text-[11px] text-muted-foreground/70 leading-relaxed">
          {tDesigner('description')}
        </p>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 text-xs"
          onClick={handleAddSlot}
          disabled={!canAdd}
          title={!canAdd ? tDesigner('maxReachedTooltip', { max: GRID_MAX_SLOTS }) : undefined}
        >
          <Plus className="w-3 h-3 mr-1.5" />
          {tDesigner('addSlot')}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 text-xs"
          onClick={handleDeleteSelected}
          disabled={!canDelete}
          title={
            !selectedSlot
              ? tDesigner('selectFirstTooltip')
              : !canDelete
                ? tDesigner('minReachedTooltip', { min: GRID_MIN_SLOTS })
                : undefined
          }
        >
          <Trash2 className="w-3 h-3 mr-1.5" />
          {tDesigner('deleteSlot')}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-8 text-xs"
          onClick={handleReset}
        >
          <RotateCcw className="w-3 h-3 mr-1.5" />
          {tDesigner('reset')}
        </Button>
      </div>

      <div className="flex items-center justify-between gap-2 rounded-md border border-border p-2">
        <Label htmlFor="grid-snap-toggle" className="text-[11px] text-foreground/80">
          {tDesigner('snapLabel')}
        </Label>
        <Switch
          id="grid-snap-toggle"
          checked={snapEnabled}
          onCheckedChange={setSnapEnabled}
        />
      </div>

      <p className="text-[11px] text-muted-foreground/70">{slotCountHint}</p>

      {/* Stage — visual poster surface with the slots laid out */}
      <div className="rounded-md border border-border bg-muted/30 p-2">
        <div
          ref={stageRef}
          className="relative w-full bg-white shadow-inner"
          style={{ aspectRatio: `${ratio}` }}
          onPointerDown={(e) => {
            // Click on empty stage = clear selection
            if (e.target === e.currentTarget) setSelectedGridSlotIndex(null)
          }}
        >
          {/* 5%-grid guides when snapping is on */}
          {snapEnabled && <SnapGridGuides />}

          {gridLayout.map((slot, i) => (
            <div
              key={slot.id}
              className={cn(
                'absolute border-2 transition-colors',
                i === selectedIndex
                  ? 'border-primary bg-primary/10'
                  : 'border-foreground/40 bg-foreground/5 hover:border-foreground/60',
              )}
              style={{
                left: `${slot.x * 100}%`,
                top: `${slot.y * 100}%`,
                width: `${slot.width * 100}%`,
                height: `${slot.height * 100}%`,
                cursor: 'move',
              }}
              onPointerDown={(e) => startDrag(e, i, 'move')}
            >
              <div className="absolute top-0 left-0 px-1 py-0.5 text-[10px] font-mono bg-foreground/70 text-background rounded-br">
                {i + 1}
              </div>
              {i === selectedIndex && (
                <>
                  <ResizeHandle position="nw" onPointerDown={(e) => startDrag(e, i, 'resize-nw')} />
                  <ResizeHandle position="ne" onPointerDown={(e) => startDrag(e, i, 'resize-ne')} />
                  <ResizeHandle position="sw" onPointerDown={(e) => startDrag(e, i, 'resize-sw')} />
                  <ResizeHandle position="se" onPointerDown={(e) => startDrag(e, i, 'resize-se')} />
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      {selectedSlot && (
        <div className="space-y-3 rounded-md border border-border p-3">
          <div className="text-xs font-semibold">
            {t('gridSlotLabel', { n: (selectedIndex ?? 0) + 1 })}
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px] text-muted-foreground tabular-nums">
            <div>X: {Math.round(selectedSlot.x * 100)}%</div>
            <div>Y: {Math.round(selectedSlot.y * 100)}%</div>
            <div>W: {Math.round(selectedSlot.width * 100)}%</div>
            <div>H: {Math.round(selectedSlot.height * 100)}%</div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
              {t('gridSlotShape')}
            </Label>
            <div className="grid grid-cols-3 gap-1">
              {GRID_SLOT_MASK_OPTIONS.map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => handleMaskChange(opt.key)}
                  aria-pressed={selectedSlot.mask === opt.key}
                  className={cn(
                    'rounded-sm border px-1.5 py-1.5 text-[10px] transition-colors',
                    selectedSlot.mask === opt.key
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border text-muted-foreground hover:border-muted-foreground',
                  )}
                >
                  {slotMaskLabel(opt.key, opt.label)}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/** Renders dashed 5 % gridlines as a non-interactive overlay. */
function SnapGridGuides() {
  const lines: React.ReactElement[] = []
  for (let i = 1; i < 20; i++) {
    const pos = i * 5
    lines.push(
      <div
        key={`v-${i}`}
        className="absolute top-0 bottom-0 border-l border-dashed border-foreground/10"
        style={{ left: `${pos}%` }}
      />,
    )
    lines.push(
      <div
        key={`h-${i}`}
        className="absolute left-0 right-0 border-t border-dashed border-foreground/10"
        style={{ top: `${pos}%` }}
      />,
    )
  }
  return <div className="absolute inset-0 pointer-events-none">{lines}</div>
}

interface ResizeHandleProps {
  position: 'nw' | 'ne' | 'sw' | 'se'
  onPointerDown: (e: React.PointerEvent<HTMLDivElement>) => void
}

function ResizeHandle({ position, onPointerDown }: ResizeHandleProps) {
  const positionCn = {
    nw: '-top-1.5 -left-1.5 cursor-nwse-resize',
    ne: '-top-1.5 -right-1.5 cursor-nesw-resize',
    sw: '-bottom-1.5 -left-1.5 cursor-nesw-resize',
    se: '-bottom-1.5 -right-1.5 cursor-nwse-resize',
  }[position]
  return (
    <div
      className={cn(
        'absolute w-3 h-3 bg-primary border-2 border-background rounded-sm',
        positionCn,
      )}
      onPointerDown={onPointerDown}
    />
  )
}

/**
 * Apply a drag delta to a slot's geometry. Move shifts the rectangle
 * keeping its size; resize-* anchors the opposite corner. Optionally
 * snaps each fraction to the 5 % grid.
 */
function applyDrag(
  start: GridSlotDefinition,
  mode: DragMode,
  dxFrac: number,
  dyFrac: number,
  snap: boolean,
): GridSlotDefinition {
  const MIN_SIZE = 0.05
  const round = (v: number) => (snap ? snapFraction(v) : v)

  if (mode === 'move') {
    const x = clamp01(round(start.x + dxFrac))
    const y = clamp01(round(start.y + dyFrac))
    // Don't let the slot escape past the right/bottom edge.
    const cappedX = Math.min(x, 1 - start.width)
    const cappedY = Math.min(y, 1 - start.height)
    return { ...start, x: cappedX, y: cappedY }
  }

  // Resize: figure out which corner anchors and which one moves.
  // The opposite corner stays put; we recompute x/y/width/height so that
  // the dragged corner ends up at (start.x + dx, start.y + dy) (clamped).
  let newLeft = start.x
  let newTop = start.y
  let newRight = start.x + start.width
  let newBottom = start.y + start.height

  if (mode === 'resize-nw') {
    newLeft = clamp01(round(start.x + dxFrac))
    newTop = clamp01(round(start.y + dyFrac))
  } else if (mode === 'resize-ne') {
    newRight = clamp01(round(start.x + start.width + dxFrac))
    newTop = clamp01(round(start.y + dyFrac))
  } else if (mode === 'resize-sw') {
    newLeft = clamp01(round(start.x + dxFrac))
    newBottom = clamp01(round(start.y + start.height + dyFrac))
  } else if (mode === 'resize-se') {
    newRight = clamp01(round(start.x + start.width + dxFrac))
    newBottom = clamp01(round(start.y + start.height + dyFrac))
  }

  // Enforce minimum size — never collapse to zero.
  if (newRight - newLeft < MIN_SIZE) {
    if (mode === 'resize-nw' || mode === 'resize-sw') newLeft = newRight - MIN_SIZE
    else newRight = newLeft + MIN_SIZE
  }
  if (newBottom - newTop < MIN_SIZE) {
    if (mode === 'resize-nw' || mode === 'resize-ne') newTop = newBottom - MIN_SIZE
    else newBottom = newTop + MIN_SIZE
  }

  return {
    ...start,
    x: newLeft,
    y: newTop,
    width: newRight - newLeft,
    height: newBottom - newTop,
  }
}
