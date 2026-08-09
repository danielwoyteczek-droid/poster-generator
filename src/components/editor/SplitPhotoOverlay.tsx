'use client'

import { useRef } from 'react'
import { useEditorStore } from '@/hooks/useEditorStore'
import { filterCss } from '@/lib/photo-filters'

interface Props {
  /** clip-path svg url from the active map mask (leftSvgPath or rightSvgPath). */
  svgPath: string
  /** Which half of the poster the photo occupies, so pointer events stay
   *  out of the opposite half and the map underneath remains draggable. */
  side: 'left' | 'right'
  /** When true, the photo overlay covers the whole poster (used when the
   *  mask extends across the midline and the half-clip would cut it). */
  noHalfClip?: boolean
  /** Pixel offset on each side of the canvas midline that the half-clip
   *  should leave empty, so the photo and the opposite-side map have a
   *  visible parting gap. Defaults to 0 (hard at 50%). */
  gapHalfPx?: number
  /** When false, photo is rendered but cannot be dragged/scaled. Used on
   *  Mobile so that only the Photo tab grants interaction. Defaults true. */
  interactive?: boolean
}

/**
 * Renders the split photo over the half of the poster that the user
 * assigned. The SVG mask defines the visible shape; the photo itself
 * can be panned (cropX/cropY) and zoomed (cropScale) within that shape.
 */
export function SplitPhotoOverlay({ svgPath, side, noHalfClip, gapHalfPx = 0, interactive = true }: Props) {
  const { splitPhoto, updateSplitPhoto } = useEditorStore()
  // Ref on the masked photo div — the resize handle measures its width to
  // normalise drag distance into a cropScale delta.
  const photoDivRef = useRef<HTMLDivElement>(null)
  if (!splitPhoto) return null

  // Restrict pointer events to the half this photo occupies, so the map
  // on the opposite half keeps working for drag + zoom. The half ends
  // gapHalfPx short of the centerline so a visible parting gap matches
  // both the dual-map preview and the export pipeline.
  const leftEdge = `calc(50% - ${gapHalfPx}px)`
  const rightEdge = `calc(50% + ${gapHalfPx}px)`
  const halfClip = noHalfClip
    ? undefined
    : side === 'left'
      ? `polygon(0 0, ${leftEdge} 0, ${leftEdge} 100%, 0 100%)`
      : `polygon(${rightEdge} 0, 100% 0, 100% 100%, ${rightEdge} 100%)`

  const maskStyle: React.CSSProperties = {
    // url() MUST be quoted: composed mask data-URLs contain literal
    // parentheses (transform="translate(…) scale(…)" / clip-path="url(#h)")
    // and an unquoted CSS url() would terminate at the first inner ")",
    // breaking the mask so the photo spills over the whole canvas.
    maskImage: `url("${svgPath}")`,
    WebkitMaskImage: `url("${svgPath}")`,
    maskRepeat: 'no-repeat',
    WebkitMaskRepeat: 'no-repeat',
    maskSize: '100% 100%',
    WebkitMaskSize: '100% 100%',
    ...(halfClip ? { clipPath: halfClip, WebkitClipPath: halfClip } : {}),
  }

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation()
    const target = e.currentTarget
    const rect = target.getBoundingClientRect()
    if (!rect) return

    const startX = e.clientX
    const startY = e.clientY
    const startCropX = splitPhoto.cropX
    const startCropY = splitPhoto.cropY

    const handleMove = (ev: PointerEvent) => {
      const dx = (ev.clientX - startX) / rect.width
      const dy = (ev.clientY - startY) / rect.height
      updateSplitPhoto({
        cropX: Math.max(-0.5, Math.min(0.5, startCropX + dx)),
        cropY: Math.max(-0.5, Math.min(0.5, startCropY + dy)),
      })
    }

    const handleUp = () => {
      window.removeEventListener('pointermove', handleMove)
      window.removeEventListener('pointerup', handleUp)
    }

    window.addEventListener('pointermove', handleMove)
    window.addEventListener('pointerup', handleUp)
  }

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault()
    const delta = -e.deltaY * 0.002
    // Lower bound 0.3 matches the sidebar zoom slider — the old min of 1
    // meant the wheel could only zoom in, never back out.
    const newScale = Math.max(0.3, Math.min(4, splitPhoto.cropScale + delta))
    updateSplitPhoto({ cropScale: newScale })
  }

  // Corner resize handle — drags the photo's cropScale, mirroring the
  // normal poster photo's handle. Dragging the handle outward (away from
  // the centre seam) enlarges the photo; inward shrinks it.
  const handleResizePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation()
    const rect = photoDivRef.current?.getBoundingClientRect()
    if (!rect) return

    const startX = e.clientX
    const startScale = splitPhoto.cropScale

    const handleMove = (ev: PointerEvent) => {
      const dx = ev.clientX - startX
      // Right-zone handle sits bottom-right → drag right grows it.
      // Left-zone handle sits bottom-left → drag left grows it.
      const directional = side === 'right' ? dx : -dx
      const next = startScale + (directional / rect.width) * 3
      updateSplitPhoto({ cropScale: Math.max(0.3, Math.min(4, next)) })
    }

    const handleUp = () => {
      window.removeEventListener('pointermove', handleMove)
      window.removeEventListener('pointerup', handleUp)
    }

    window.addEventListener('pointermove', handleMove)
    window.addEventListener('pointerup', handleUp)
  }

  return (
    <>
      <div
        ref={photoDivRef}
        className={
          interactive
            ? 'absolute inset-0 pointer-events-auto cursor-move'
            : 'absolute inset-0 pointer-events-none'
        }
        style={maskStyle}
        onPointerDown={interactive ? handlePointerDown : undefined}
        onWheel={interactive ? handleWheel : undefined}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={splitPhoto.publicUrl}
          alt=""
          draggable={false}
          className="absolute w-full h-full object-cover select-none"
          style={{
            transform: `translate(${splitPhoto.cropX * 100}%, ${splitPhoto.cropY * 100}%) scale(${splitPhoto.cropScale})`,
            transformOrigin: 'center',
            filter: filterCss(splitPhoto.filter),
          }}
        />
      </div>
      {/* Resize handle — rendered OUTSIDE the masked div (the CSS mask
          would otherwise clip it away) at the outer-bottom corner of the
          photo's half. */}
      {interactive && (
        <div
          className={
            'absolute bottom-1 z-50 h-4 w-4 rounded-sm border border-primary bg-white shadow pointer-events-auto ' +
            (side === 'right' ? 'right-1 cursor-nwse-resize' : 'left-1 cursor-nesw-resize')
          }
          onPointerDown={handleResizePointerDown}
        />
      )}
    </>
  )
}
