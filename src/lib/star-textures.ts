/**
 * Manifest of painted/watercolor textures available for the Star-Map sky
 * background. Customer picks one in the Star-Map editor under "Farben".
 *
 * Files live in `public/star-textures/` and should be roughly square or
 * portrait. The renderer centre-crops to a square that fills the sky-circle's
 * bounding box. ~3000×3000 px is plenty for A3-print at 300 DPI; smaller
 * (1500×1500) is fine for editor preview but slightly soft on A3 print.
 */
export interface StarTexture {
  key: string
  /** Translation key under `starMapEditor.textures.{labelKey}`. UI resolves
   *  this via `useTranslations('starMapEditor')` at render time. */
  labelKey: string
  path: string
}

export const STAR_TEXTURES: StarTexture[] = [
  {
    key: 'ink-blue',
    labelKey: 'inkBlue',
    path: '/star-textures/texture_blue-1500.png',
  },
  {
    key: 'ink-black',
    labelKey: 'inkBlack',
    path: '/star-textures/texture_black_1500.png',
  },
  {
    key: 'ink-green',
    labelKey: 'inkGreen',
    path: '/star-textures/texture_green-1500.png',
  },
  {
    key: 'ink-pink',
    labelKey: 'inkPink',
    path: '/star-textures/texture_pink-1500.png',
  },
]

const STAR_TEXTURE_MAP: Record<string, StarTexture> = Object.fromEntries(
  STAR_TEXTURES.map((t) => [t.key, t]),
)

export function getStarTexture(key: string | null | undefined): StarTexture | null {
  if (!key) return null
  return STAR_TEXTURE_MAP[key] ?? null
}

/**
 * Resolves a textureKey to a loaded HTMLImageElement. Returns null when the
 * key is empty/unknown OR when the load fails — callers should treat null as
 * "render flat sky background, no texture", never as an error to bubble up.
 * Used by both the editor export pipeline and the headless snapshot render.
 */
export async function loadStarTexture(key: string | null | undefined): Promise<HTMLImageElement | null> {
  const texture = getStarTexture(key)
  if (!texture) return null
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => {
      console.warn(`[star-textures] failed to load: ${texture.path}`)
      resolve(null)
    }
    img.src = texture.path
  })
}
