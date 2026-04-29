'use client'

import { useEffect, useRef, useState } from 'react'
import { useEditorStore } from '@/hooks/useEditorStore'
import { usePhotoEditorStore } from '@/hooks/usePhotoEditorStore'
import { PRINT_FORMATS } from '@/lib/print-formats'
import { computeFontScale } from '@/lib/font-scale'
import { TextBlockOverlay } from '@/components/editor/TextBlockOverlay'
import { LetterMaskOverlay } from './LetterMaskOverlay'
import type { MobileEditorTool } from '@/components/editor/PosterCanvas'

interface PhotoPosterCanvasProps {
  /** Total padding subtracted from wrapper before sizing the poster.
   *  Desktop default 64 (32 each side), Mobile passes ~16. */
  padding?: number
  /** When set, only this overlay receives pointer events — used on Mobile
   *  for touch-isolation per tab (PROJ-18 pattern). Undefined on Desktop
   *  means everything is interactive simultaneously. */
  activeMobileTool?: MobileEditorTool
}

/**
 * Canvas-Pendant für Foto-Poster. Sizing-Logik gespiegelt aus PosterCanvas
 * (Karten-Editor) und StarMapCanvas — zentrierter Poster-Container, der
 * sich am Wrapper ausrichtet, plus Overlay-Stack.
 */
export function PhotoPosterCanvas({
  padding = 64,
  activeMobileTool,
}: PhotoPosterCanvasProps = {}) {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const posterRef = useRef<HTMLDivElement>(null)
  const [posterSize, setPosterSize] = useState({ width: 0, height: 0 })

  const { printFormat } = useEditorStore()
  const { layoutMode, orientation } = usePhotoEditorStore()
  const format = PRINT_FORMATS[printFormat]
  const baseRatio = format.widthMm / format.heightMm
  const ratio = orientation === 'landscape' ? 1 / baseRatio : baseRatio

  const fontScale = computeFontScale(posterSize.width)

  useEffect(() => {
    const wrapper = wrapperRef.current
    if (!wrapper) return

    const update = () => {
      const rect = wrapper.getBoundingClientRect()
      const availW = Math.max(0, rect.width - padding)
      const availH = Math.max(0, rect.height - padding)
      let width = availW
      let height = width / ratio
      if (height > availH) {
        height = availH
        width = height * ratio
      }
      setPosterSize({ width, height })
    }

    update()
    const ro = new ResizeObserver(update)
    ro.observe(wrapper)
    return () => ro.disconnect()
  }, [padding, ratio])

  const letterMaskInteractive =
    activeMobileTool === undefined || activeMobileTool === 'photo'
  const textInteractive =
    activeMobileTool === undefined || activeMobileTool === 'text'

  return (
    <div
      ref={wrapperRef}
      className="flex-1 min-h-0 flex items-center justify-center bg-muted/30"
    >
      <div
        ref={posterRef}
        className="relative bg-white shadow-md overflow-hidden"
        style={{
          width: posterSize.width || 'auto',
          height: posterSize.height || 'auto',
          aspectRatio: posterSize.width === 0 ? `${ratio}` : undefined,
        }}
      >
        {layoutMode === 'letter-mask' && (
          <LetterMaskOverlay
            posterRef={posterRef}
            interactive={letterMaskInteractive}
          />
        )}

        {layoutMode !== 'letter-mask' && (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
            Modus „{layoutMode}" — kommt in Folge-Pass
          </div>
        )}

        <TextBlockOverlay
          fontScale={fontScale}
          interactive={textInteractive}
          hideCoordinates
        />
      </div>
    </div>
  )
}
