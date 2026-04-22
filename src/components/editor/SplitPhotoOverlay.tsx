'use client'

import { useEditorStore } from '@/hooks/useEditorStore'
import { filterCss } from '@/lib/photo-filters'

interface Props {
  /** clip-path svg url from the active map mask (leftSvgPath or rightSvgPath). */
  svgPath: string
}

/**
 * Renders the split photo over the half of the poster that the user
 * assigned. The SVG mask defines the visible shape; the photo itself
 * can be panned (cropX/cropY) and zoomed (cropScale) within that shape.
 */
export function SplitPhotoOverlay({ svgPath }: Props) {
  const { splitPhoto, updateSplitPhoto } = useEditorStore()
  if (!splitPhoto) return null

  const maskStyle: React.CSSProperties = {
    maskImage: `url(${svgPath})`,
    WebkitMaskImage: `url(${svgPath})`,
    maskRepeat: 'no-repeat',
    WebkitMaskRepeat: 'no-repeat',
    maskSize: '100% 100%',
    WebkitMaskSize: '100% 100%',
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
    const newScale = Math.max(1, Math.min(4, splitPhoto.cropScale + delta))
    updateSplitPhoto({ cropScale: newScale })
  }

  return (
    <div
      className="absolute inset-0 pointer-events-auto cursor-move"
      style={maskStyle}
      onPointerDown={handlePointerDown}
      onWheel={handleWheel}
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
  )
}
