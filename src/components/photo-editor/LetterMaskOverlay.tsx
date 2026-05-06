'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { usePhotoEditorStore, type SlotPhoto } from '@/hooks/usePhotoEditorStore'
import { MASK_FONTS } from '@/lib/letter-mask'
import { cn } from '@/lib/utils'

interface Props {
  posterRef: React.RefObject<HTMLDivElement | null>
  /** When false, slots don't respond to pointer events. Used on Mobile so
   *  only the active tab grants interaction. */
  interactive?: boolean
}

/**
 * Renders the customer's word as a row of equal-width slots. Each slot
 * either shows a photo clipped to its glyph (`background-clip: text`) or
 * the glyph filled with a solid slot color when no photo is uploaded.
 *
 * Slot width grows / shrinks with `wordWidth` from the store, so the
 * customer can scale the letters via a sidebar slider. Slot height is
 * locked to slot width via `aspect-ratio` so the glyphs stay proportional
 * regardless of word length.
 */
export function LetterMaskOverlay({ posterRef, interactive = true }: Props) {
  const {
    word,
    slots,
    wordWidth,
    wordX,
    wordY,
    maskFontKey,
    defaultSlotColor,
    selectedSlotIndex,
    setSelectedSlotIndex,
    updateSlotCrop,
    setWordPosition,
  } = usePhotoEditorStore()

  const wordRef = useRef<HTMLDivElement>(null)
  const font = MASK_FONTS[maskFontKey]

  // Measure each glyph's natural advance width in the mask font so each
  // slot can take a proportional share of the word-container width. Without
  // this every slot would be `flex-1` (equal) which makes wide letters like
  // M overflow into neighbours while narrow letters like I leave huge gaps.
  // Result reads as a normal word instead of a fixed-width grid.
  const charWidths = useMemo(() => {
    if (typeof document === 'undefined' || slots.length === 0) {
      return slots.map(() => 1)
    }
    const probeCanvas = document.createElement('canvas')
    const ctx = probeCanvas.getContext('2d')
    if (!ctx) return slots.map(() => 1)
    // 200 px is arbitrary — only the ratios between widths matter.
    ctx.font = `400 200px ${font.cssFamily}`
    return slots.map((s) => {
      const w = ctx.measureText(s.char).width
      return w > 0 ? w : 1
    })
  }, [slots, font.cssFamily])
  const totalWeight = charWidths.reduce((a, b) => a + b, 0) || 1

  if (word.length === 0) return null

  const containerLeft = (wordX - wordWidth / 2) * 100
  // Container's height is derived from its width so slots get a uniform
  // height regardless of their (proportional) widths. The aspect makes the
  // average slot square-ish (heightOverWidth × avgSlotWidth).
  const containerAspect = slots.length / font.heightOverWidth

  return (
    <div
      ref={wordRef}
      className="absolute flex items-stretch justify-center select-none"
      style={{
        left: `${containerLeft}%`,
        top: `${wordY * 100}%`,
        width: `${wordWidth * 100}%`,
        aspectRatio: `${containerAspect}`,
      }}
      aria-label={`Letter-Mask: ${word}`}
    >
      {slots.map((slot, i) => (
        <LetterSlotView
          key={`${i}-${slot.char}`}
          index={i}
          char={slot.char}
          photo={slot.photo}
          color={slot.color ?? defaultSlotColor}
          fontFamily={font.cssFamily}
          fontSizeFactor={font.fontSizeOverSlotWidth}
          // Width as a fraction of the word container, proportional to
          // the glyph's natural advance.
          widthFraction={charWidths[i] / totalWeight}
          // All glyphs share the same font size — derived from the
          // average slot width so they appear at consistent height.
          avgSlotWidthFactor={1 / slots.length}
          isSelected={selectedSlotIndex === i}
          interactive={interactive}
          onSelect={() => setSelectedSlotIndex(i)}
          onPan={(updates) => updateSlotCrop(i, updates)}
          onMoveWordFromStart={(totalDx, totalDy, startX, startY) => {
            const posterRect = posterRef.current?.getBoundingClientRect()
            const wordRect = wordRef.current?.getBoundingClientRect()
            if (!posterRect || !wordRect) return
            // Clamp so the word's bounding box stays inside the poster.
            // Half-width on the X side because wordX is the CENTER; full
            // height on the Y side because wordY is the TOP.
            const wHalfFrac = wordRect.width / posterRect.width / 2
            const hFrac = wordRect.height / posterRect.height
            const xMin = wHalfFrac
            const xMax = 1 - wHalfFrac
            const yMin = 0
            const yMax = 1 - hFrac
            const targetX = startX + totalDx / posterRect.width
            const targetY = startY + totalDy / posterRect.height
            setWordPosition({
              x: Math.max(xMin, Math.min(xMax, targetX)),
              y: Math.max(yMin, Math.min(yMax, targetY)),
            })
          }}
          startWordX={wordX}
          startWordY={wordY}
          posterRef={posterRef}
        />
      ))}
    </div>
  )
}

interface SlotViewProps {
  index: number
  char: string
  photo: SlotPhoto | null
  color: string
  fontFamily: string
  fontSizeFactor: number
  /** Slot's share of the word-container width (0..1), proportional to the
   *  glyph's natural advance. */
  widthFraction: number
  /** Reference factor (= 1 / wordLength) used to compute a uniform glyph
   *  font-size from the WORD container width — independent of this slot's
   *  individual width. */
  avgSlotWidthFactor: number
  isSelected: boolean
  interactive: boolean
  onSelect: () => void
  onPan: (updates: { cropX?: number; cropY?: number }) => void
  /** Cumulative drag-delta callback for moving the whole word. Receives the
   *  total dx/dy from drag-start (not incremental) plus the wordX/wordY at
   *  drag-start, so the parent can compute an absolute position without
   *  fighting stale closure values. Triggered when the customer pans an
   *  empty slot (no photo). */
  onMoveWordFromStart: (
    totalDx: number,
    totalDy: number,
    startWordX: number,
    startWordY: number,
  ) => void
  startWordX: number
  startWordY: number
  posterRef: React.RefObject<HTMLDivElement | null>
}

function LetterSlotView({
  char,
  photo,
  color,
  fontFamily,
  fontSizeFactor,
  widthFraction,
  avgSlotWidthFactor,
  isSelected,
  interactive,
  onSelect,
  onPan,
  onMoveWordFromStart,
  startWordX,
  startWordY,
}: SlotViewProps) {
  const slotRef = useRef<HTMLDivElement>(null)

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!interactive) return
    e.stopPropagation()
    onSelect()

    const slotEl = slotRef.current
    if (!slotEl) return

    const slotRect = slotEl.getBoundingClientRect()
    const startX = e.clientX
    const startY = e.clientY

    if (photo) {
      // Filled slot → pan the photo crop within this letter
      const startCropX = photo.cropX
      const startCropY = photo.cropY
      const handleMove = (ev: PointerEvent) => {
        const dx = ev.clientX - startX
        const dy = ev.clientY - startY
        const nextCropX = clamp(startCropX + dx / slotRect.width, -0.5, 0.5)
        const nextCropY = clamp(startCropY + dy / slotRect.height, -0.5, 0.5)
        onPan({ cropX: nextCropX, cropY: nextCropY })
      }
      const handleUp = () => {
        window.removeEventListener('pointermove', handleMove)
        window.removeEventListener('pointerup', handleUp)
      }
      window.addEventListener('pointermove', handleMove)
      window.addEventListener('pointerup', handleUp)
      return
    }

    // Empty slot → drag the entire word across the poster.
    // Capture the start word position so the move handler computes an
    // absolute target instead of accumulating against (potentially stale)
    // store values.
    const wordXAtStart = startWordX
    const wordYAtStart = startWordY
    const handleMove = (ev: PointerEvent) => {
      const totalDx = ev.clientX - startX
      const totalDy = ev.clientY - startY
      onMoveWordFromStart(totalDx, totalDy, wordXAtStart, wordYAtStart)
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
      ref={slotRef}
      onPointerDown={handlePointerDown}
      className={cn(
        'min-w-0 flex items-center justify-center relative overflow-hidden',
        interactive && 'cursor-pointer touch-none',
        isSelected && interactive && 'ring-2 ring-blue-500/70 ring-offset-1',
      )}
      style={{
        // Slot width is proportional to the glyph's natural advance —
        // height is uniform across slots (inherited from container's
        // aspect-ratio + items-stretch).
        width: `${widthFraction * 100}%`,
        pointerEvents: interactive ? 'auto' : 'none',
      }}
    >
      <SlotGlyph
        char={char}
        photo={photo}
        color={color}
        fontFamily={fontFamily}
        fontSizeFactor={fontSizeFactor}
        avgSlotWidthFactor={avgSlotWidthFactor}
      />
    </div>
  )
}

interface GlyphProps {
  char: string
  photo: SlotPhoto | null
  color: string
  fontFamily: string
  fontSizeFactor: number
  /** Reference factor (= 1 / wordLength) — combined with the WORD container
   *  width to derive a glyph font-size that's identical across all slots,
   *  even though slots have proportional (non-uniform) widths. */
  avgSlotWidthFactor: number
}

function SlotGlyph({ char, photo, color, fontFamily, fontSizeFactor, avgSlotWidthFactor }: GlyphProps) {
  const ref = useRef<HTMLSpanElement>(null)

  // Font-size is uniform across all letter slots, derived from the word
  // container's width × `avgSlotWidthFactor` (= 1 / wordLength) ×
  // `fontSizeFactor`. We can't use the slot's own width here because slots
  // are now proportional to their glyph's natural advance — that would
  // produce a different font-size per letter.
  // background-size for `background-clip: text` still tracks the slot's
  // dimensions (each slot displays its own object-cover'd portion of the
  // photo).
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const slot = el.parentElement
    if (!slot) return
    const wordContainer = slot.parentElement
    if (!wordContainer) return

    const update = () => {
      const slotRect = slot.getBoundingClientRect()
      const wordRect = wordContainer.getBoundingClientRect()
      const refSlotW = wordRect.width * avgSlotWidthFactor
      const fontSizePx = refSlotW * fontSizeFactor
      el.style.fontSize = `${fontSizePx}px`

      if (photo && photo.width > 0 && photo.height > 0) {
        // Cover relative to THIS slot's actual rect (each slot crops the
        // photo to its own area independently — so a wide M-slot shows
        // more horizontal pixels than a narrow I-slot of the same photo).
        const sx = slotRect.width / photo.width
        const sy = slotRect.height / photo.height
        const coverScale = Math.max(sx, sy) * photo.scale
        const bgW = photo.width * coverScale
        const bgH = photo.height * coverScale
        el.style.backgroundSize = `${bgW}px ${bgH}px`
      } else {
        el.style.backgroundSize = ''
      }
    }
    update()
    const ro = new ResizeObserver(update)
    ro.observe(slot)
    ro.observe(wordContainer)
    return () => ro.disconnect()
  }, [fontSizeFactor, avgSlotWidthFactor, photo])

  if (photo) {
    // bgPositionX 50% centers the image within the element. Pan offsets
    // shift it: cropX positive (user dragged right) → image moves right
    // (we see the LEFT portion of the photo) → bgPositionX < 50.
    const bgX = 50 - photo.cropX * 100
    const bgY = 50 - photo.cropY * 100
    return (
      <span
        ref={ref}
        className="block leading-none whitespace-pre"
        style={{
          fontFamily,
          fontWeight: 400,
          color: 'transparent',
          backgroundImage: `url(${photo.publicUrl})`,
          backgroundPosition: `${bgX}% ${bgY}%`,
          backgroundRepeat: 'no-repeat',
          WebkitBackgroundClip: 'text',
          backgroundClip: 'text',
        }}
      >
        {char}
      </span>
    )
  }

  return (
    <span
      ref={ref}
      className="block leading-none whitespace-pre"
      style={{ fontFamily, fontWeight: 400, color }}
    >
      {char}
    </span>
  )
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}
