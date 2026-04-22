export type PhotoMaskKey = 'full' | 'circle' | 'heart' | 'square' | 'portrait' | 'landscape'

export interface PhotoMaskDefinition {
  key: PhotoMaskKey
  label: string
  /** SVG path or clip-path expression applied to the photo container */
  clipPath: string
  /** Aspect ratio (w/h). Null = full poster frame */
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
    clipPath:
      "path('M50,88 C50,88 6,60 6,30 C6,15 18,4 32,4 C40,4 46,8 50,14 C54,8 60,4 68,4 C82,4 94,15 94,30 C94,60 50,88 50,88 Z')",
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
