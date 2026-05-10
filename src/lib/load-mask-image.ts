import { resolveMask } from '@/hooks/useCustomMasks'

/**
 * Resolve a mask key into a fully loaded HTMLImageElement of its silhouette
 * SVG, ready for `ctx.drawImage`. Returns `null` for the canonical 'circle'
 * key (or anything missing) — callers treat null as "no mask, render the
 * default sky circle". Used by the star-map renderer + export pipelines
 * (PROJ-40) so live preview, export PNG/PDF and snapshot rendering all
 * agree on the silhouette.
 */
export async function loadSkyMaskImage(maskKey: string | null | undefined): Promise<HTMLImageElement | null> {
  if (!maskKey || maskKey === 'circle') return null
  const mask = await resolveMask(maskKey)
  const url = mask?.svgPath
  if (!url) return null
  return loadImageFromUrl(url)
}

function loadImageFromUrl(url: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = url
  })
}
