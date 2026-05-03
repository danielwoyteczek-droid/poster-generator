'use client'

import { useEffect, useRef, useState } from 'react'
import { ImagePlus } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { usePhotoEditorStore } from '@/hooks/usePhotoEditorStore'
import { GRID_SLOT_MASKS, type GridSlotDefinition } from '@/lib/grid-layout'
import { cn } from '@/lib/utils'

interface Props {
  posterRef: React.RefObject<HTMLDivElement | null>
  /** When false the overlay is rendered but pointer events pass through —
   *  used on Mobile so only the active tab's overlay grabs touch (PROJ-18
   *  Touch-Isolation). */
  interactive?: boolean
}

/**
 * Photo-grid overlay: renders the preset's authored slot rectangles and
 * lets the customer fill each one with a photo, then pan / zoom inside.
 * Slot positions are read-only here — only the photo crop changes. The
 * admin-side `GridLayoutDesigner` is the only place where slot rects get
 * moved or resized.
 *
 * Mirrors `SinglePhotoOverlay` for the per-slot pan/zoom interaction so
 * customers get the same drag + wheel + pinch behaviour they already
 * know from the single-photo and letter-mask modes.
 */
export function PhotoGridOverlay({ posterRef, interactive = true }: Props) {
  const t = useTranslations('photoEditor')
  const {
    gridLayout,
    gridSlots,
    defaultSlotColor,
    selectedGridSlotIndex,
    setSelectedGridSlotIndex,
  } = usePhotoEditorStore()

  void posterRef // reserved for future poster-relative drag math

  if (gridLayout.length === 0) {
    return (
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="flex flex-col items-center gap-2 text-muted-foreground/70 px-6 text-center">
          <ImagePlus className="w-10 h-10" />
          <p className="text-sm">{t('gridEmptyTitle')}</p>
          <p className="text-xs">{t('gridEmptyHint')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className={cn('absolute inset-0', !interactive && 'pointer-events-none')}>
      {gridLayout.map((def, i) => (
        <GridSlotCell
          key={def.id}
          index={i}
          definition={def}
          state={gridSlots[i]}
          defaultColor={defaultSlotColor}
          isSelected={selectedGridSlotIndex === i}
          interactive={interactive}
          onSelect={() => setSelectedGridSlotIndex(i)}
        />
      ))}
    </div>
  )
}

interface CellProps {
  index: number
  definition: GridSlotDefinition
  state: ReturnType<typeof usePhotoEditorStore.getState>['gridSlots'][number] | undefined
  defaultColor: string
  isSelected: boolean
  interactive: boolean
  onSelect: () => void
}

function GridSlotCell({
  index,
  definition,
  state,
  defaultColor,
  isSelected,
  interactive,
  onSelect,
}: CellProps) {
  const t = useTranslations('photoEditor')
  const containerRef = useRef<HTMLDivElement>(null)
  const updateGridSlotCrop = usePhotoEditorStore((s) => s.updateGridSlotCrop)
  const [pointers, setPointers] = useState<Map<number, { x: number; y: number }>>(new Map())

  const photo = state?.photo ?? null
  const color = state?.color ?? defaultColor
  const mask = GRID_SLOT_MASKS[definition.mask] ?? GRID_SLOT_MASKS.rect

  // Wheel-zoom on desktop. Only when interactive AND a photo exists,
  // matches `SinglePhotoOverlay`.
  useEffect(() => {
    if (!interactive || !photo) return
    const el = containerRef.current
    if (!el) return
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault()
      const delta = -e.deltaY * 0.002
      const next = clamp(photo.scale + delta, 1, 4)
      updateGridSlotCrop(index, { scale: next })
    }
    el.addEventListener('wheel', handleWheel, { passive: false })
    return () => el.removeEventListener('wheel', handleWheel)
  }, [interactive, photo, updateGridSlotCrop, index])

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!interactive) return
    onSelect()
    if (!photo) return
    const el = containerRef.current
    if (!el) return
    e.stopPropagation()
    el.setPointerCapture(e.pointerId)

    const rect = el.getBoundingClientRect()
    const startX = e.clientX
    const startY = e.clientY
    const startCropX = photo.cropX
    const startCropY = photo.cropY

    setPointers((prev) => {
      const next = new Map(prev)
      next.set(e.pointerId, { x: e.clientX, y: e.clientY })
      return next
    })

    let lastDistance: number | null = null

    const handleMove = (ev: PointerEvent) => {
      if (pointers.size + 1 >= 2) {
        const updated = new Map(pointers)
        updated.set(ev.pointerId, { x: ev.clientX, y: ev.clientY })
        if (updated.size >= 2) {
          const [a, b] = Array.from(updated.values()).slice(0, 2)
          const distance = Math.hypot(b.x - a.x, b.y - a.y)
          if (lastDistance !== null) {
            const factor = distance / lastDistance
            const next = clamp(photo.scale * factor, 1, 4)
            updateGridSlotCrop(index, { scale: next })
          }
          lastDistance = distance
        }
        return
      }

      const dx = ev.clientX - startX
      const dy = ev.clientY - startY
      const nextCropX = clamp(startCropX + dx / rect.width, -0.5, 0.5)
      const nextCropY = clamp(startCropY + dy / rect.height, -0.5, 0.5)
      updateGridSlotCrop(index, { cropX: nextCropX, cropY: nextCropY })
    }

    const handleUp = (ev: PointerEvent) => {
      setPointers((prev) => {
        const next = new Map(prev)
        next.delete(ev.pointerId)
        return next
      })
      window.removeEventListener('pointermove', handleMove)
      window.removeEventListener('pointerup', handleUp)
      window.removeEventListener('pointercancel', handleUp)
      try {
        el.releasePointerCapture(ev.pointerId)
      } catch {
        /* ignore */
      }
    }

    window.addEventListener('pointermove', handleMove)
    window.addEventListener('pointerup', handleUp)
    window.addEventListener('pointercancel', handleUp)
  }

  const bgX = photo ? 50 - photo.cropX * 100 : 50
  const bgY = photo ? 50 - photo.cropY * 100 : 50

  return (
    <div
      ref={containerRef}
      role="button"
      tabIndex={interactive ? 0 : -1}
      aria-label={t('gridSlotLabel', { n: index + 1 })}
      aria-pressed={isSelected}
      onPointerDown={handlePointerDown}
      onClick={(e) => {
        if (!interactive) return
        e.stopPropagation()
        onSelect()
      }}
      className={cn(
        'absolute overflow-hidden bg-muted/30',
        interactive && 'cursor-pointer touch-none pointer-events-auto',
        photo && interactive && 'cursor-grab active:cursor-grabbing',
        isSelected && interactive && 'outline outline-2 outline-primary outline-offset-1',
      )}
      style={{
        left: `${definition.x * 100}%`,
        top: `${definition.y * 100}%`,
        width: `${definition.width * 100}%`,
        height: `${definition.height * 100}%`,
        clipPath: mask.clipPath,
        WebkitClipPath: mask.clipPath,
        backgroundColor: photo ? undefined : color,
      }}
    >
      {photo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={photo.publicUrl}
          alt=""
          draggable={false}
          className="absolute inset-0 w-full h-full object-cover select-none"
          style={{
            transform: `scale(${photo.scale})`,
            transformOrigin: `${bgX}% ${bgY}%`,
          }}
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center text-white/70">
          <ImagePlus className="w-6 h-6" />
        </div>
      )}
    </div>
  )
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}
