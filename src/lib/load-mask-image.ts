import { resolveMask } from '@/hooks/useCustomMasks'

/**
 * Resolve a mask key into a fully loaded HTMLImageElement of its silhouette
 * SVG, ready for `ctx.drawImage`. Used by the star-map renderer + export
 * pipelines (PROJ-40) so live preview, export PNG/PDF and snapshot rendering
 * all agree on the silhouette — every shape, including the canonical
 * `'circle'`, runs through the same mask compositing pipeline so the star
 * projection geometry stays identical regardless of which silhouette the
 * customer picks. Returns `null` only when the key is missing or its SVG
 * cannot be resolved (network failure, deleted custom mask).
 */
export async function loadSkyMaskImage(maskKey: string | null | undefined): Promise<HTMLImageElement | null> {
  if (!maskKey) return null
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
