'use client'

import { useEditorStore } from '@/hooks/useEditorStore'
import { PHOTO_MASKS } from '@/lib/photo-masks'

export function PhotoOverlay() {
  const { photos, selectedBlockId, setSelectedBlockId } = useEditorStore()

  return (
    <div className="absolute inset-0 pointer-events-none">
      {photos.map((photo) => {
        const mask = PHOTO_MASKS[photo.maskKey]
        const height = mask.aspectRatio
          ? `${(photo.scale / mask.aspectRatio) * 100}%`
          : `${photo.scale * 100}%`
        const width = `${photo.scale * 100}%`
        const isSelected = selectedBlockId === photo.id
        return (
          <div
            key={photo.id}
            className="absolute pointer-events-auto"
            style={{
              left: `${photo.x * 100}%`,
              top: `${photo.y * 100}%`,
              width,
              height,
              outline: isSelected ? '1px dashed #3b82f6' : 'none',
              outlineOffset: '2px',
              cursor: 'pointer',
            }}
            onPointerDown={(e) => { e.stopPropagation(); setSelectedBlockId(photo.id) }}
          >
            <div
              className="relative w-full h-full overflow-hidden"
              style={{ clipPath: mask.clipPath, WebkitClipPath: mask.clipPath }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo.publicUrl}
                alt=""
                draggable={false}
                className="absolute w-full h-full object-cover select-none"
                style={{
                  transform: `translate(${photo.cropX * 100}%, ${photo.cropY * 100}%)`,
                }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}
