export type PhotoMaskKey = 'full' | 'circle' | 'heart' | 'square' | 'portrait' | 'landscape'

export interface PhotoMaskDefinition {
  key: PhotoMaskKey
  label: string
  /** CSS clip-path expression applied to the photo container. Null when
   *  the mask uses an SVG via `maskImageUrl` instead — `clip-path: path()`
   *  doesn't accept percentages, so non-trivial silhouettes can't scale
   *  with the container and need an SVG mask-image. */
  clipPath: string | null
  /** Optional SVG data URL for `mask-image`. Used when `clipPath` can't
   *  represent the silhouette in container-relative units (e.g. heart). */
  maskImageUrl?: string
  /** Aspect ratio (w/h). Null = intrinsic (full uses the image's own ratio). */
  aspectRatio: number | null
}

export const PHOTO_MASKS: Record<PhotoMaskKey, PhotoMaskDefinition> = {
  full: {
    key: 'full',
    label: 'Vollbild',
    clipPath: 'inset(0)',
    aspectRatio: null,
  },
  circle: {
    key: 'circle',
    label: 'Kreis',
    clipPath: 'circle(50% at 50% 50%)',
    aspectRatio: 1,
  },
  heart: {
    key: 'heart',
    label: 'Herz',
    // CSS `clip-path: path()` doesn't scale (only absolute pixels), so we
    // use an SVG `mask-image` data URL instead. Container stretches the
    // 100×100 viewBox to 100% × 100% of itself via `mask-size: 100% 100%`.
    clipPath: null,
    maskImageUrl: '/masks/photo/heart.svg',
    aspectRatio: 1,
  },
  square: {
    key: 'square',
    label: 'Quadrat',
    clipPath: 'inset(0)',
    aspectRatio: 1,
  },
  portrait: {
    key: 'portrait',
    label: 'Hochformat',
    clipPath: 'inset(0)',
    aspectRatio: 3 / 4,
  },
  landscape: {
    key: 'landscape',
    label: 'Querformat',
    clipPath: 'inset(0)',
    aspectRatio: 4 / 3,
  },
}

export const PHOTO_MASK_OPTIONS = Object.values(PHOTO_MASKS)
