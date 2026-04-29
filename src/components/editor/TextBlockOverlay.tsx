'use client'

import { useEffect, useRef } from 'react'
import { Lock } from 'lucide-react'
import { useEditorStore, type TextBlock } from '@/hooks/useEditorStore'
import { useIsMobileEditor } from '@/hooks/useIsMobileEditor'

function toDMS(deg: number, isLat: boolean): string {
  const dir = isLat ? (deg >= 0 ? 'N' : 'S') : (deg >= 0 ? 'E' : 'W')
  const abs = Math.abs(deg)
  const d = Math.floor(abs)
  const mFull = (abs - d) * 60
  const m = Math.floor(mFull)
  const s = Math.floor((mFull - m) * 60)
  return `${d}° ${String(m).padStart(2, '0')}' ${String(s).padStart(2, '0')}" ${dir}`
}

export function getCoordinatesText(lat: number, lng: number, locationName: string): string {
  return `${locationName}, ${toDMS(lat, true)}  ${toDMS(lng, false)}`
}

interface BlockItemProps {
  block: TextBlock
  isSelected: boolean
  overlayRef: React.RefObject<HTMLDivElement | null>
  displayText: string
  interactive: boolean
  fontScale: number
}

function BlockItem({ block, isSelected, overlayRef, displayText, interactive, fontScale }: BlockItemProps) {
  const { updateTextBlock, setSelectedBlockId } = useEditorStore()

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation()
    setSelectedBlockId(block.id)
    if (block.locked) return

    const rect = overlayRef.current?.getBoundingClientRect()
    if (!rect) return

    // Measure the block's rendered height so we can clamp the bottom edge
    // inside the poster (not just the top-left). Add a small 2 px safety
    // margin so line-height slop and outline never push the block over.
    const blockEl = e.currentTarget as HTMLDivElement
    const measuredH = blockEl.getBoundingClientRect().height
    const blockHeightPx = (measuredH > 0 ? measuredH : block.fontSize * 1.4) + 2

    const startX = e.clientX
    const startY = e.clientY
    const startBlockX = block.x
    const startBlockY = block.y
    const blockWidthPx = block.width * rect.width

    const handleMove = (ev: PointerEvent) => {
      const dx = ev.clientX - startX
      const dy = ev.clientY - startY
      const rawX = startBlockX + dx / rect.width
      const rawY = startBlockY + dy / rect.height

      // Snap to 10px grid
      const snapX = Math.round((rawX * rect.width) / 10) * 10 / rect.width
      const snapY = Math.round((rawY * rect.height) / 10) * 10 / rect.height

      // Clamp inside poster bounds — keep the whole block on the paper
      const maxX = 1 - blockWidthPx / rect.width
      const maxY = 1 - blockHeightPx / rect.height
      const clampedX = Math.max(0, Math.min(maxX, snapX))
      const clampedY = Math.max(0, Math.min(maxY, snapY))

      updateTextBlock(block.id, { x: clampedX, y: clampedY })
    }

    const handleUp = () => {
      window.removeEventListener('pointermove', handleMove)
      window.removeEventListener('pointerup', handleUp)
    }

    window.addEventListener('pointermove', handleMove)
    window.addEventListener('pointerup', handleUp)
  }

  const handleResizePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation()
    if (block.locked) return

    const rect = overlayRef.current?.getBoundingClientRect()
    if (!rect) return

    const startX = e.clientX
    const startWidth = block.width

    const handleMove = (ev: PointerEvent) => {
      const dx = ev.clientX - startX
      const rawWidth = startWidth + dx / rect.width

      // Snap width to 10px grid
      const snapWidth = Math.round((rawWidth * rect.width) / 10) * 10 / rect.width

      // Clamp width
      const maxWidth = 1 - block.x
      const clampedWidth = Math.max(0.05, Math.min(maxWidth, snapWidth))

      updateTextBlock(block.id, { width: clampedWidth })
    }

    const handleUp = () => {
      window.removeEventListener('pointermove', handleMove)
      window.removeEventListener('pointerup', handleUp)
    }

    window.addEventListener('pointermove', handleMove)
    window.addEventListener('pointerup', handleUp)
  }

  return (
    <div
      data-block-id={block.id}
      className={interactive ? 'absolute pointer-events-auto' : 'absolute pointer-events-none'}
      style={{
        left: `${block.x * 100}%`,
        top: `${block.y * 100}%`,
        width: `${block.width * 100}%`,
        cursor: interactive && !block.locked ? 'move' : 'default',
        outline: isSelected ? '1px dashed #3b82f6' : 'none',
        outlineOffset: '2px',
      }}
      onPointerDown={interactive ? handlePointerDown : undefined}
    >
      <div
        style={{
          fontFamily: block.fontFamily,
          fontSize: block.fontSize * fontScale,
          color: block.color,
          textAlign: block.align,
          fontWeight: block.bold ? 'bold' : 'normal',
          textTransform: block.uppercase ? 'uppercase' : 'none',
          lineHeight: 1.2,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          userSelect: 'none',
        }}
      >
        {displayText}
      </div>

      {isSelected && block.locked && (
        <div
          className="absolute -top-1 -left-1 bg-white rounded-sm shadow-sm p-0.5 pointer-events-none"
        >
          <Lock className="w-3 h-3 text-foreground/70" />
        </div>
      )}

      {isSelected && !block.locked && interactive && (
        <div
          className="absolute top-0 right-0 w-2 h-full cursor-ew-resize"
          style={{ transform: 'translateX(50%)' }}
          onPointerDown={handleResizePointerDown}
        />
      )}
    </div>
  )
}

interface TextBlockOverlayProps {
  coordinatesSource?: { lat: number; lng: number; locationName: string }
  /** Multiplier applied to each block's fontSize in the preview. Used on
   *  Mobile to compensate for the smaller poster preview — the stored
   *  fontSize is in preview-pixels and looks correct at desktop preview
   *  width (~600 px), so we scale it down proportionally on smaller
   *  viewports. Desktop passes 1 (no change). */
  fontScale?: number
  /** Explicit override for drag/resize interaction. When undefined, falls
   *  back to "interactive on Desktop, non-interactive on Mobile". Mobile
   *  passes `true` while the Text tab is active so users can reposition
   *  blocks, and `false` otherwise to keep other-tab taps from grabbing
   *  a block by accident. */
  interactive?: boolean
  /** Photo-Poster-Editor passes true: a coordinates block doesn't fit a
   *  photo product, so we drop it from rendering even though it lives in
   *  the shared editor store. */
  hideCoordinates?: boolean
}

export function TextBlockOverlay({ coordinatesSource, fontScale = 1, interactive: interactiveProp, hideCoordinates = false }: TextBlockOverlayProps = {}) {
  const overlayRef = useRef<HTMLDivElement>(null)
  const isMobile = useIsMobileEditor()
  const interactive = interactiveProp ?? !isMobile
  const {
    textBlocks,
    selectedBlockId,
    setSelectedBlockId,
    updateTextBlock,
    deleteTextBlock,
    viewState,
    marker,
    locationName,
  } = useEditorStore()
  // Pin-Position hat Vorrang vor Map-Zentrum, damit Koordinaten dem Pin folgen
  const coords = coordinatesSource ?? {
    lat: marker.lat ?? viewState.lat,
    lng: marker.lng ?? viewState.lng,
    locationName,
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const active = document.activeElement
      const tag = active?.tagName?.toLowerCase()
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return
      if (active instanceof HTMLElement && active.isContentEditable) return

      if (!selectedBlockId) return
      const block = textBlocks.find((b) => b.id === selectedBlockId)
      if (!block) return

      const rect = overlayRef.current?.getBoundingClientRect()
      if (!rect) return

      const step = e.shiftKey ? 10 : 1
      const stepX = step / rect.width
      const stepY = step / rect.height

      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        if (!block.locked) {
          updateTextBlock(block.id, { x: Math.max(0, block.x - stepX) })
        }
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        if (!block.locked) {
          const maxX = 1 - block.width
          updateTextBlock(block.id, { x: Math.min(maxX, block.x + stepX) })
        }
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        if (!block.locked) {
          updateTextBlock(block.id, { y: Math.max(0, block.y - stepY) })
        }
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        if (!block.locked) {
          // Measure the rendered block height so the arrow-down clamp matches
          // the pointer-drag clamp and keeps the whole block on the paper.
          const blockEl = document.querySelector(`[data-block-id="${block.id}"]`) as HTMLElement | null
          const blockHeightPx = blockEl?.getBoundingClientRect().height ?? block.fontSize * 1.4
          const maxY = 1 - blockHeightPx / rect.height
          updateTextBlock(block.id, { y: Math.min(maxY, block.y + stepY) })
        }
      } else if (e.key === 'Backspace' || e.key === 'Delete') {
        e.preventDefault()
        deleteTextBlock(block.id)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedBlockId, textBlocks, updateTextBlock, deleteTextBlock])

  return (
    <div
      ref={overlayRef}
      className="absolute inset-0 pointer-events-none"
    >
      {textBlocks.map((block) => {
        if (hideCoordinates && block.isCoordinates) return null
        const displayText = block.isCoordinates
          ? getCoordinatesText(coords.lat, coords.lng, coords.locationName)
          : block.text
        return (
          <BlockItem
            key={block.id}
            block={block}
            isSelected={block.id === selectedBlockId}
            overlayRef={overlayRef}
            displayText={displayText}
            interactive={interactive}
            fontScale={fontScale}
          />
        )
      })}
    </div>
  )
}
