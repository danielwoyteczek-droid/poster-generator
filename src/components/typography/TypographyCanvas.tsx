'use client'

import { useEffect, useRef, useState } from 'react'
import { useEditorStore } from '@/hooks/useEditorStore'
import { effectiveLogicalCanvas } from '@/lib/print-formats'
import { TypographyPoster } from './TypographyPoster'

/**
 * PROJ-46: Canvas-Wrapper für das Typografie-Hochzeitsposter.
 *
 * Adopts das PROJ-37-Logical-Canvas-Pattern: Ein innerer `div` lebt im
 * LOGICAL-Pixel-Space (A4 = 800×1131, A3 = 1131×1600, A2 = 1600×2263) und
 * wird via `transform: scale(visualScale)` ans Wrapper-Element angepasst.
 * Damit skalieren Font-Größen + Layout-Abstände konsistent über alle Formate.
 *
 * Format + Orientation kommen aus `useEditorStore` — derselbe Shared-State,
 * den die anderen Editoren (Map, Star-Map, Photo, Wedding) auch nutzen, damit
 * Customer Format-Wahl über die Editoren hinweg konsistent bleibt.
 */
export function TypographyCanvas() {
  const printFormat = useEditorStore((s) => s.printFormat)
  const orientation = useEditorStore((s) => s.orientation)

  const wrapperRef = useRef<HTMLDivElement | null>(null)
  const [visualSize, setVisualSize] = useState<{ w: number; h: number } | null>(null)

  const logical = effectiveLogicalCanvas(printFormat, orientation)
  const logicalAspect = logical.width / logical.height

  useEffect(() => {
    if (!wrapperRef.current) return
    const el = wrapperRef.current

    const measure = () => {
      const rect = el.getBoundingClientRect()
      // Fit-into-rect mit konstantem Aspect-Ratio des aktuellen Formats.
      const targetAspect = logical.width / logical.height
      const containerAspect = rect.width / rect.height
      let w: number, h: number
      if (containerAspect > targetAspect) {
        h = rect.height
        w = h * targetAspect
      } else {
        w = rect.width
        h = w / targetAspect
      }
      setVisualSize({ w, h })
    }

    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [logical.width, logical.height])

  const visualScale = visualSize ? visualSize.w / logical.width : 0

  return (
    <div
      ref={wrapperRef}
      className="w-full h-full flex items-center justify-center p-4 sm:p-6"
    >
      {visualSize ? (
        <div
          className="relative shadow-xl"
          style={{
            width: visualSize.w,
            height: visualSize.h,
          }}
          data-poster-aspect={logicalAspect.toFixed(3)}
        >
          <div
            className="origin-top-left"
            style={{
              width: logical.width,
              height: logical.height,
              transform: `scale(${visualScale})`,
            }}
          >
            <TypographyPoster canvasHeight={logical.height} />
          </div>
        </div>
      ) : null}
    </div>
  )
}
