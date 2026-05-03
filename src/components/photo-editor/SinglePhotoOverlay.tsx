'use client'

import { useEffect, useRef, useState } from 'react'
import { ImagePlus } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { usePhotoEditorStore } from '@/hooks/usePhotoEditorStore'
import { PHOTO_MASKS } from '@/lib/photo-masks'
import { filterCss } from '@/lib/photo-filters'
import { cn } from '@/lib/utils'

interface Props {
  posterRef: React.RefObject<HTMLDivElement | null>
  /** When false, the overlay still renders but doesn't capture pointer
   *  events. Used on Mobile so only the active tab grants interaction
   *  (PROJ-18 Touch-Isolation pattern). */
  interactive?: boolean
}

/**
 * Renders the single-photo layout: one customer photo clipped by a mask
 * (full / circle / heart / square / portrait / landscape). Drag-to-pan
 * shifts the crop, wheel/pinch zooms it. Mirrors the patterns from
 * `LetterMaskOverlay` (pan-crop) and `PhotoOverlay` (the map editor's
 * sidecar photos) without duplicating their state model.
 *
 * The mask is applied as a CSS clip-path on a container that fills the
 * full poster minus an inner-margin so the photo doesn't touch the
 * paper edge. The image inside the container uses `object-cover` plus
 * a transform-translate driven by `cropX`/`cropY` and a `scale()` for
 * additional zoom (cover already happens via `object-cover`).
 */
export function SinglePhotoOverlay({ posterRef, interactive = true }: Props) {
  const t = useTranslations('photoEditor')
  const {
    singlePhoto,
    singlePhotoMaskKey,
    updateSinglePhotoCrop,
  } = usePhotoEditorStore()

  const containerRef = useRef<HTMLDivElement>(null)
  const mask = PHOTO_MASKS[singlePhotoMaskKey]
  const [pointers, setPointers] = useState<Map<number, { x: number; y: number }>>(new Map())

  // ── Wheel-zoom (Desktop) ──────────────────────────────────────────────
  useEffect(() => {
    if (!interactive || !singlePhoto) return
    const el = containerRef.current
    if (!el) return
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault()
      const delta = -e.deltaY * 0.002
      const next = clamp(singlePhoto.scale + delta, 1, 4)
      updateSinglePhotoCrop({ scale: next })
    }
    el.addEventListener('wheel', handleWheel, { passive: false })
    return () => el.removeEventListener('wheel', handleWheel)
  }, [interactive, singlePhoto, updateSinglePhotoCrop])

  if (!singlePhoto) {
    // Empty-state placeholder — Customer hasn't uploaded anything yet.
    return (
      <div
        className="absolute inset-0 flex items-center justify-center pointer-events-none"
        aria-label={t('singlePhotoEmptyTitle')}
      >
        <div className="flex flex-col items-center gap-2 text-muted-foreground/70 px-6 text-center">
          <ImagePlus className="w-10 h-10" />
          <p className="text-sm">{t('singlePhotoEmptyTitle')}</p>
          <p className="text-xs">{t('singlePhotoEmptyHint')}</p>
        </div>
      </div>
    )
  }

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!interactive) return
    const el = containerRef.current
    if (!el) return
    e.stopPropagation()
    el.setPointerCapture(e.pointerId)

    const rect = el.getBoundingClientRect()
    const startX = e.clientX
    const startY = e.clientY
    const startCropX = singlePhoto.cropX
    const startCropY = singlePhoto.cropY

    // Track pointers for pinch-to-zoom on touch devices.
    setPointers((prev) => {
      const next = new Map(prev)
      next.set(e.pointerId, { x: e.clientX, y: e.clientY })
      return next
    })

    let lastDistance: number | null = null

    const handleMove = (ev: PointerEvent) => {
      // Multi-touch → pinch-zoom path
      if (pointers.size + 1 >= 2) {
        const updated = new Map(pointers)
        updated.set(ev.pointerId, { x: ev.clientX, y: ev.clientY })
        if (updated.size >= 2) {
          const [a, b] = Array.from(updated.values()).slice(0, 2)
          const distance = Math.hypot(b.x - a.x, b.y - a.y)
          if (lastDistance !== null) {
            const factor = distance / lastDistance
            const next = clamp(singlePhoto.scale * factor, 1, 4)
            updateSinglePhotoCrop({ scale: next })
          }
          lastDistance = distance
        }
        return
      }

      // Single-touch → pan crop. Translate pixel-delta into fractional
      // crop offset relative to the container size. Clamp so the photo
      // doesn't slide entirely out of the mask.
      const dx = ev.clientX - startX
      const dy = ev.clientY - startY
      const nextCropX = clamp(startCropX + dx / rect.width, -0.5, 0.5)
      const nextCropY = clamp(startCropY + dy / rect.height, -0.5, 0.5)
      updateSinglePhotoCrop({ cropX: nextCropX, cropY: nextCropY })
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
        /* ignore — pointer already released */
      }
    }

    window.addEventListener('pointermove', handleMove)
    window.addEventListener('pointerup', handleUp)
    window.addEventListener('pointercancel', handleUp)
  }

  // bgPosition mirrors LetterMaskOverlay semantics: positive cropX (user
  // dragged right) shows the LEFT portion of the photo, so bgX < 50.
  const bgX = 50 - singlePhoto.cropX * 100
  const bgY = 50 - singlePhoto.cropY * 100

  // For non-`full` masks the mask defines an aspect ratio. We size the
  // container as a square (or the mask's native ratio) centered inside
  // the poster, taking up most of the available space.
  const containerStyle: React.CSSProperties = mask.aspectRatio
    ? {
        width: '80%',
        aspectRatio: `${mask.aspectRatio}`,
        clipPath: mask.clipPath,
        WebkitClipPath: mask.clipPath,
      }
    : {
        // Full-bleed → fills the whole poster.
        position: 'absolute',
        inset: 0,
        clipPath: mask.clipPath,
        WebkitClipPath: mask.clipPath,
      }

  // posterRef isn't used today (drag math derives from container rect),
  // but kept in the API for parity with LetterMaskOverlay so future
  // word-style poster-relative clamping can hook in.
  void posterRef

  return (
    <div
      className={cn(
        'absolute inset-0 flex items-center justify-center',
        interactive ? 'pointer-events-none' : 'pointer-events-none',
      )}
    >
      <div
        ref={containerRef}
        className={cn(
          'relative overflow-hidden bg-muted/30',
          interactive && 'cursor-grab active:cursor-grabbing touch-none pointer-events-auto',
        )}
        style={containerStyle}
        onPointerDown={interactive ? handlePointerDown : undefined}
        aria-label={t('singlePhotoAria')}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={singlePhoto.publicUrl}
          alt=""
          draggable={false}
          className="absolute inset-0 w-full h-full object-cover select-none"
          style={{
            transform: `scale(${singlePhoto.scale})`,
            transformOrigin: `${bgX}% ${bgY}%`,
            filter: filterCss(singlePhoto.filter),
          }}
        />
      </div>
    </div>
  )
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}
