'use client'

import { useEffect, useState } from 'react'
import { svgToDataUrl } from '@/lib/mask-composer'

/**
 * Rasterise an SVG mask string to a PNG data URL via an offscreen canvas.
 *
 * Why: Chromium does not reliably honour `<radialGradient>` (and other
 * paint-server features) when an SVG data URL is referenced by CSS
 * `mask-image`. The fast vector path used for masks skips parts of the
 * SVG paint pipeline. Rendering through `<img>` + canvas drawImage runs
 * the full SVG renderer, then we hand the resulting raster PNG to CSS
 * mask-image — and PNG masks always render correctly.
 *
 * Behaviour:
 * - Returns the SVG data URL directly when `shouldRasterize` is false.
 * - When `shouldRasterize` flips true, kicks off the raster job and keeps
 *   returning the previous PNG until the new one is ready, so the mask
 *   doesn't flash to null while the next frame loads.
 */
export function useRasterizedMaskUrl(
  svgString: string | null,
  shouldRasterize: boolean,
  width: number,
  height: number,
): string | null {
  const [rasterUrl, setRasterUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!svgString || !shouldRasterize || !width || !height) return
    let cancelled = false
    const img = new Image()
    img.onload = () => {
      if (cancelled) return
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.drawImage(img, 0, 0, width, height)
      setRasterUrl(canvas.toDataURL('image/png'))
    }
    img.src = svgToDataUrl(svgString)
    return () => { cancelled = true }
  }, [svgString, shouldRasterize, width, height])

  if (!svgString) return null
  if (!shouldRasterize) return svgToDataUrl(svgString)
  return rasterUrl
}
