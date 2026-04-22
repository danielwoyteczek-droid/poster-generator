export type PhotoMaskKey =
  | 'full'
  | 'circle'
  | 'heart'
  | 'square'
  | 'portrait'
  | 'landscape'
  | 'split-circles-left'
  | 'split-circles-right'
  | 'split-hearts-left'
  | 'split-hearts-right'
  | 'split-halves-left'
  | 'split-halves-right'

export interface PhotoMaskDefinition {
  key: PhotoMaskKey
  label: string
  group: 'single' | 'split'
  /** CSS clip-path expression (for simple shapes). Mutually exclusive with svgPath. */
  clipPath?: string
  /** SVG file in /public/masks used as a CSS mask-image + canvas mask. */
  svgPath?: string
  /** Aspect ratio (w/h). Null = free (image intrinsic) or fills full poster for split masks. */
  aspectRatio: number | null
  /** When true, the photo always covers the entire poster (used by split masks). */
  fullPoster: boolean
}

export const PHOTO_MASKS: Record<PhotoMaskKey, PhotoMaskDefinition> = {
  full: {
    key: 'full',
    label: 'Vollbild',
    group: 'single',
    clipPath: 'inset(0)',
    aspectRatio: null,
    fullPoster: false,
  },
  circle: {
    key: 'circle',
    label: 'Kreis',
    group: 'single',
    clipPath: 'circle(50% at 50% 50%)',
    aspectRatio: 1,
    fullPoster: false,
  },
  heart: {
    key: 'heart',
    label: 'Herz',
    group: 'single',
    clipPath:
      "path('M50,88 C50,88 6,60 6,30 C6,15 18,4 32,4 C40,4 46,8 50,14 C54,8 60,4 68,4 C82,4 94,15 94,30 C94,60 50,88 50,88 Z')",
    aspectRatio: 1,
    fullPoster: false,
  },
  square: {
    key: 'square',
    label: 'Quadrat',
    group: 'single',
    clipPath: 'inset(0)',
    aspectRatio: 1,
    fullPoster: false,
  },
  portrait: {
    key: 'portrait',
    label: 'Hochformat',
    group: 'single',
    clipPath: 'inset(0)',
    aspectRatio: 3 / 4,
    fullPoster: false,
  },
  landscape: {
    key: 'landscape',
    label: 'Querformat',
    group: 'single',
    clipPath: 'inset(0)',
    aspectRatio: 4 / 3,
    fullPoster: false,
  },
  'split-circles-left': {
    key: 'split-circles-left',
    label: 'Kreis links',
    group: 'split',
    svgPath: '/masks/split-circles-left.svg',
    aspectRatio: null,
    fullPoster: true,
  },
  'split-circles-right': {
    key: 'split-circles-right',
    label: 'Kreis rechts',
    group: 'split',
    svgPath: '/masks/split-circles-right.svg',
    aspectRatio: null,
    fullPoster: true,
  },
  'split-hearts-left': {
    key: 'split-hearts-left',
    label: 'Herz links',
    group: 'split',
    svgPath: '/masks/split-hearts-left.svg',
    aspectRatio: null,
    fullPoster: true,
  },
  'split-hearts-right': {
    key: 'split-hearts-right',
    label: 'Herz rechts',
    group: 'split',
    svgPath: '/masks/split-hearts-right.svg',
    aspectRatio: null,
    fullPoster: true,
  },
  'split-halves-left': {
    key: 'split-halves-left',
    label: 'Hälfte links',
    group: 'split',
    svgPath: '/masks/split-halves-left.svg',
    aspectRatio: null,
    fullPoster: true,
  },
  'split-halves-right': {
    key: 'split-halves-right',
    label: 'Hälfte rechts',
    group: 'split',
    svgPath: '/masks/split-halves-right.svg',
    aspectRatio: null,
    fullPoster: true,
  },
}

export const PHOTO_MASK_OPTIONS = Object.values(PHOTO_MASKS)
export const PHOTO_MASK_SINGLES = PHOTO_MASK_OPTIONS.filter((m) => m.group === 'single')
export const PHOTO_MASK_SPLITS = PHOTO_MASK_OPTIONS.filter((m) => m.group === 'split')
