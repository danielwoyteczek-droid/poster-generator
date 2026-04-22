'use client'

import { useEffect, useRef } from 'react'
import { Lock } from 'lucide-react'
import { useEditorStore, type PhotoItem } from '@/hooks/useEditorStore'
import { PHOTO_MASKS } from '@/lib/photo-masks'

function photoHeightFraction(photo: PhotoItem, posterRatio: number): number {
  const mask = PHOTO_MASKS[photo.maskKey]
  if (mask.aspectRatio) {
    return (photo.scale / mask.aspectRatio) * posterRatio
  }
  const intrinsic = photo.width / photo.height
  return (photo.scale / intrinsic) * posterRatio
}

interface Props {
  posterRef: React.RefObject<HTMLDivElement | null>
}

function PhotoItemView({
  photo,
  posterRef,
  posterRatio,
}: {
  photo: PhotoItem
  posterRef: React.RefObject<HTMLDivElement | null>
  posterRatio: number
}) {
  const { updatePhoto, selectedBlockId, setSelectedBlockId } = useEditorStore()
  const mask = PHOTO_MASKS[photo.maskKey]
  const isSelected = selectedBlockId === photo.id

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation()
    setSelectedBlockId(photo.id)
    const rect = posterRef.current?.getBoundingClientRect()
    if (!rect) return

    const startX = e.clientX
    const startY = e.clientY
    const startPhotoX = photo.x
    const startPhotoY = photo.y

    const handleMove = (ev: PointerEvent) => {
      const dx = ev.clientX - startX
      const dy = ev.clientY - startY
      const rawX = startPhotoX + dx / rect.width
      const rawY = startPhotoY + dy / rect.height
      const heightFrac = photoHeightFraction(photo, posterRatio)
      const maxX = Math.max(0, 1 - photo.scale)
      const maxY = Math.max(0, 1 - heightFrac)
      const snapX = Math.round((rawX * rect.width) / 10) * 10 / rect.width
      const snapY = Math.round((rawY * rect.height) / 10) * 10 / rect.height
      updatePhoto(photo.id, {
        x: Math.max(0, Math.min(maxX, snapX)),
        y: Math.max(0, Math.min(maxY, snapY)),
      })
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
    const rect = posterRef.current?.getBoundingClientRect()
    if (!rect) return

    const startX = e.clientX
    const startScale = photo.scale

    const handleMove = (ev: PointerEvent) => {
      const dx = ev.clientX - startX
      const rawScale = startScale + dx / rect.width
      const maxScale = 1 - photo.x
      const clamped = Math.max(0.08, Math.min(maxScale, rawScale))
      updatePhoto(photo.id, { scale: clamped })
    }

    const handleUp = () => {
      window.removeEventListener('pointermove', handleMove)
      window.removeEventListener('pointerup', handleUp)
    }

    window.addEventListener('pointermove', handleMove)
    window.addEventListener('pointerup', handleUp)
  }

  const heightFrac = photoHeightFraction(photo, posterRatio)

  return (
    <div
      className="absolute pointer-events-auto"
      style={{
        left: `${photo.x * 100}%`,
        top: `${photo.y * 100}%`,
        width: `${photo.scale * 100}%`,
        height: `${heightFrac * 100}%`,
        cursor: 'move',
        outline: isSelected ? '1px dashed #3b82f6' : 'none',
        outlineOffset: '2px',
      }}
      onPointerDown={handlePointerDown}
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

      {isSelected && (
        <>
          <div
            className="absolute -right-1 -bottom-1 w-3 h-3 bg-white border border-blue-500 rounded-sm cursor-nwse-resize"
            onPointerDown={handleResizePointerDown}
          />
        </>
      )}
    </div>
  )
}

export function PhotoOverlay({ posterRef }: Props) {
  const { photos, selectedBlockId, updatePhoto, removePhoto } = useEditorStore()

  useEffect(() => {
    const rect = posterRef.current?.getBoundingClientRect()
    if (!rect) return

    const handleKeyDown = (e: KeyboardEvent) => {
      const active = document.activeElement
      const tag = active?.tagName?.toLowerCase()
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return
      if (active instanceof HTMLElement && active.isContentEditable) return

      if (!selectedBlockId) return
      const photo = photos.find((p) => p.id === selectedBlockId)
      if (!photo) return

      const step = e.shiftKey ? 10 : 1
      const stepX = step / rect.width
      const stepY = step / rect.height

      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        updatePhoto(photo.id, { x: Math.max(0, photo.x - stepX) })
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        const maxX = Math.max(0, 1 - photo.scale)
        updatePhoto(photo.id, { x: Math.min(maxX, photo.x + stepX) })
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        updatePhoto(photo.id, { y: Math.max(0, photo.y - stepY) })
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        updatePhoto(photo.id, { y: Math.min(0.95, photo.y + stepY) })
      } else if (e.key === 'Backspace' || e.key === 'Delete') {
        e.preventDefault()
        removePhoto(photo.id)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedBlockId, photos, updatePhoto, removePhoto, posterRef])

  const posterRatio = useRefPosterRatio(posterRef)

  return (
    <div className="absolute inset-0 pointer-events-none">
      {photos.map((photo) => (
        <PhotoItemView
          key={photo.id}
          photo={photo}
          posterRef={posterRef}
          posterRatio={posterRatio}
        />
      ))}
    </div>
  )
}

function useRefPosterRatio(posterRef: React.RefObject<HTMLDivElement | null>): number {
  const ratioRef = useRef(1)
  useEffect(() => {
    const el = posterRef.current
    if (!el) return
    const update = () => {
      const rect = el.getBoundingClientRect()
      if (rect.height > 0) ratioRef.current = rect.width / rect.height
    }
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [posterRef])
  return ratioRef.current
}
