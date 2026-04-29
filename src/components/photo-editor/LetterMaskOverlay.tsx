'use client'

import { useEffect, useRef } from 'react'
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
    maskFontKey,
    defaultSlotColor,
    selectedSlotIndex,
    setSelectedSlotIndex,
    updateSlotCrop,
  } = usePhotoEditorStore()

  const font = MASK_FONTS[maskFontKey]

  if (word.length === 0) return null

  const containerLeft = ((1 - wordWidth) / 2) * 100
  const slotAspect = 1 / font.heightOverWidth // width/height for CSS aspect-ratio

  return (
    <div
      className="absolute flex items-stretch justify-center select-none"
      style={{
        left: `${containerLeft}%`,
        top: '12%',
        width: `${wordWidth * 100}%`,
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
          slotAspect={slotAspect}
          isSelected={selectedSlotIndex === i}
          interactive={interactive}
          onSelect={() => setSelectedSlotIndex(i)}
          onPan={(updates) => updateSlotCrop(i, updates)}
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
  slotAspect: number
  isSelected: boolean
  interactive: boolean
  onSelect: () => void
  onPan: (updates: { cropX?: number; cropY?: number }) => void
  posterRef: React.RefObject<HTMLDivElement | null>
}

function LetterSlotView({
  char,
  photo,
  color,
  fontFamily,
  fontSizeFactor,
  slotAspect,
  isSelected,
  interactive,
  onSelect,
  onPan,
}: SlotViewProps) {
  const slotRef = useRef<HTMLDivElement>(null)

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!interactive) return
    e.stopPropagation()
    onSelect()
    if (!photo) return

    const slotEl = slotRef.current
    if (!slotEl) return

    const slotRect = slotEl.getBoundingClientRect()
    const startX = e.clientX
    const startY = e.clientY
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
  }

  return (
    <div
      ref={slotRef}
      onPointerDown={handlePointerDown}
      className={cn(
        'flex-1 min-w-0 flex items-center justify-center relative',
        interactive && 'cursor-pointer touch-none',
        isSelected && interactive && 'ring-2 ring-blue-500/70 ring-offset-1',
      )}
      style={{
        aspectRatio: `${slotAspect}`,
        pointerEvents: interactive ? 'auto' : 'none',
      }}
    >
      <SlotGlyph
        char={char}
        photo={photo}
        color={color}
        fontFamily={fontFamily}
        fontSizeFactor={fontSizeFactor}
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
}

function SlotGlyph({ char, photo, color, fontFamily, fontSizeFactor }: GlyphProps) {
  const ref = useRef<HTMLSpanElement>(null)

  // The glyph spans 100% of the slot. We measure the slot via the glyph's
  // own bounding box (since both share the same dimensions thanks to the
  // wrapping flex+aspect-ratio), then:
  //   - set font-size proportional to slot width so glyphs scale with the
  //     `wordWidth` slider
  //   - set background-size so the photo properly COVERS the slot
  //     (background-clip: text masks it later, but the source background
  //     must fill the whole element first or the glyph gets cropped image
  //     edges in tall letters)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const parent = el.parentElement
    if (!parent) return

    const update = () => {
      const rect = parent.getBoundingClientRect()
      const elemW = rect.width
      const elemH = rect.height
      el.style.fontSize = `${elemW * fontSizeFactor}px`

      if (photo && photo.width > 0 && photo.height > 0) {
        // Compute "cover" sizing in pixels: scale image so its smaller
        // dimension fully covers the element, then multiply by `scale` for
        // additional zoom.
        const sx = elemW / photo.width
        const sy = elemH / photo.height
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
    ro.observe(parent)
    return () => ro.disconnect()
  }, [fontSizeFactor, photo])

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
