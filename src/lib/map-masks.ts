export type MapMaskKey =
  | 'none'
  | 'circle'
  | 'heart'
  | 'heart-single'
  | 'frame1'
  | 'text-below'
  | 'split-circles'
  | 'split-halves'
  // Custom masks (uploaded via admin UI) get keys like 'custom-abc12345'.
  // The (string & {}) intersection keeps autocomplete for built-ins while
  // still accepting arbitrary strings at runtime.
  | (string & {})

import type { ShapeDefinition } from './mask-composer'
import type { PosterType } from './poster-types'

export interface MapMaskDefinition {
  key: MapMaskKey
  label: string
  svgPath: string | null
  /**
   * PROJ-40: editor variants this mask is allowed in. Built-in masks declare
   * this in code (no DB row); custom masks read it from
   * `custom_masks.applicable_poster_types`. Defaults to `['map']` for
   * mask definitions that don't set it — preserving the pre-PROJ-40
   * behaviour where every mask was assumed to be map-only.
   */
  applicableTo?: PosterType[]
  isSplit?: boolean
  leftSvgPath?: string
  rightSvgPath?: string
  /**
   * When true, skip the poster-middle 50% clip-path for split rendering.
   * Used when the left/right shapes intentionally extend across the midline
   * (entwined hearts etc.) — without this flag the shapes would be cut
   * along the poster centre.
   *
   * Pointer-event routing in this mode is handled by the editor store's
   * `activeSplitMap` toggle (see PosterCanvas) — the user explicitly picks
   * which map is interactive via a "Karte 1 / Karte 2" badge above the
   * canvas.
   */
  noHalfClip?: boolean
  /**
   * Pure shape definition (viewBox + inner markup). Present for non-split
   * masks that participate in the mask composer. Split masks or the "none"
   * entry have no shape.
   */
  shape?: ShapeDefinition
  /**
   * PROJ-35: per-mask customer visibility flag. Built-in masks are always
   * public (treated as `true` when undefined). Custom masks copy this from
   * `custom_masks.is_public`. Used by the editor to render an Admin-only
   * badge on non-public rows in the mask picker.
   */
  isPublic?: boolean
  /**
   * PROJ-35: optional decoration SVG that should auto-apply when this mask
   * is selected. Customer toggles visibility via `decorationVisible` in the
   * editor store; preset's `decorationSvgUrl` overrides this when present.
   */
  decorationSvgUrl?: string | null
  /**
   * PROJ-38 follow-up: admin-tuned offsets for the decoration overlay,
   * applied to its rendering on top of the mask. Defaults 0/0/1.
   */
  decorationTransform?: { x: number; y: number; scale: number }
}

export const MAP_MASKS: Record<MapMaskKey, MapMaskDefinition> = {
  none: { key: 'none', label: 'Keins', svgPath: null, applicableTo: ['map'] },
  circle: {
    key: 'circle',
    label: 'Kreis',
    svgPath: '/masks/circle.svg',
    applicableTo: ['map', 'star-map'],
    shape: {
      viewBox: '0 0 595.3 841.9',
      width: 595.3, height: 841.9,
      markup: '<circle cx="297.6" cy="297.6" r="266.5"/>',
      bottomFraction: 0.67,
      landscapeScale: 1.15,
      landscapeYOffset: 0.06,
    },
  },
  heart: {
    key: 'heart',
    label: 'Herz geteilt',
    svgPath: '/masks/heart1.svg',
    applicableTo: ['map'],
    isSplit: true,
    // Two clean half-hearts with a 2 mm centerline gap. Each half is a
    // closed path whose V-dip and bottom-tip sit ~1 mm off the canvas
    // midline — the Z then draws an implicit vertical seam line per half,
    // and the gap between the two seam lines is what the customer sees as
    // the parting between the two maps. Without this we relied on a CSS
    // clipPath at 50% ± 1mm to split a single full-heart outline into two,
    // which left visible "joins" at the V-dip and bottom-tip because the
    // outline endpoints lay exactly on the midline.
    noHalfClip: true,
    leftSvgPath: '/masks/heart1-left.svg',
    rightSvgPath: '/masks/heart1-right.svg',
    shape: {
      viewBox: '0 0 595.3 841.9',
      width: 595.3, height: 841.9,
      markup: '<path d="M298 543 C 298 543, 48 375, 48 228 C 48 108, 198 60, 298 178 C 398 60, 548 108, 548 228 C 548 375, 298 543, 298 543 Z"/>',
      splitMarkup: {
        left: '<path d="M 294.815 178 C 198 60, 48 108, 48 228 C 48 375, 294.815 543, 294.815 543 Z"/>',
        right: '<path d="M 300.485 178 C 398 60, 548 108, 548 228 C 548 375, 300.485 543, 300.485 543 Z"/>',
      },
      bottomFraction: 0.645,
      landscapeScale: 1.15,
      landscapeYOffset: 0.06,
      shapeLandscape: {
        viewBox: '0 0 841.9 595.3',
        width: 841.9,
        height: 595.3,
        // The single-heart path wrapped in an outer translate so its
        // centerline (x=298 in the source) lands on the landscape canvas
        // midline (x=420.95). Scale 0.92 keeps the heart at near-portrait
        // size while a small upward translate gives a bit of breathing
        // room above the text area.
        markup: '<g transform="translate(147 -58) scale(0.92)"><path d="M298 543 C 298 543, 48 375, 48 228 C 48 108, 198 60, 298 178 C 398 60, 548 108, 548 228 C 548 375, 298 543, 298 543 Z"/></g>',
        splitMarkup: {
          left: '<g transform="translate(147 -58) scale(0.92)"><path d="M 294.815 178 C 198 60, 48 108, 48 228 C 48 375, 294.815 543, 294.815 543 Z"/></g>',
          right: '<g transform="translate(147 -58) scale(0.92)"><path d="M 300.485 178 C 398 60, 548 108, 548 228 C 548 375, 300.485 543, 300.485 543 Z"/></g>',
        },
        bottomFraction: 1,
      },
    },
  },
  'heart-single': {
    key: 'heart-single',
    label: 'Herz',
    svgPath: '/masks/heart-single.svg',
    applicableTo: ['map', 'star-map'],
    shape: {
      viewBox: '0 0 595.3 841.9',
      width: 595.3, height: 841.9,
      markup: '<path d="M298 543 C 298 543, 48 375, 48 228 C 48 108, 198 60, 298 178 C 398 60, 548 108, 548 228 C 548 375, 298 543, 298 543 Z"/>',
      bottomFraction: 0.645,
      landscapeScale: 1.15,
      landscapeYOffset: 0.06,
    },
  },
  house: {
    key: 'house',
    label: 'Haus',
    svgPath: '/masks/house.svg',
    applicableTo: ['map', 'star-map'],
    shape: {
      viewBox: '0 0 595.3 841.9',
      width: 595.3, height: 841.9,
      markup: '<path d="M115 550 L115 310 L60 310 L297.65 80 L535 310 L480 310 L480 550 Z"/>',
      bottomFraction: 0.653,
    },
  },
  frame1: {
    key: 'frame1',
    label: 'Rahmen',
    svgPath: '/masks/frame1.svg',
    applicableTo: ['map', 'star-map'],
    shape: {
      viewBox: '0 0 1000 1400',
      width: 1000, height: 1400,
      markup: '<rect x="50" y="50" width="900" height="908"/>',
      bottomFraction: 0.684,
    },
  },
  'text-below': {
    key: 'text-below',
    label: 'Classic',
    svgPath: '/masks/text-below.svg',
    applicableTo: ['map'],
    shape: {
      viewBox: '0 0 595.3 841.9',
      width: 595.3, height: 841.9,
      markup: '<rect x="0" y="0" width="595.3" height="589.33"/>',
    },
  },
  'split-circles': {
    key: 'split-circles',
    label: 'Kreis geteilt',
    svgPath: '/masks/split-circles-preview.svg',
    applicableTo: ['map'],
    isSplit: true,
    leftSvgPath: '/masks/split-circles-left.svg',
    rightSvgPath: '/masks/split-circles-right.svg',
    shape: {
      viewBox: '0 0 595.3 841.9',
      width: 595.3, height: 841.9,
      // Match the non-split `circle` mask geometry (cy=297.6, r=266.5)
      // so single/split versions sit at the same poster height.
      markup: '<circle cx="297.6" cy="297.6" r="266.5"/>',
      bottomFraction: 0.67,
      landscapeScale: 1.15,
      landscapeYOffset: 0.06,
    },
  },
'split-halves': {
    key: 'split-halves',
    label: '2× Hälfte',
    svgPath: '/masks/split-halves-preview.svg',
    applicableTo: ['map'],
    isSplit: true,
    leftSvgPath: '/masks/split-halves-left.svg',
    rightSvgPath: '/masks/split-halves-right.svg',
    shape: {
      viewBox: '0 0 595.3 841.9',
      width: 595.3, height: 841.9,
      // Two wide rounded panels filling the whole poster with a 3 mm
      // outer margin and 2 mm centre gap, instead of the old narrow
      // strips with a big margin. Same approach in landscape via
      // shapeLandscape below.
      markup: '<rect x="8.5" y="8.5" width="286.32" height="824.9" rx="29.77"/><rect x="300.49" y="8.5" width="286.32" height="824.9" rx="29.77"/>',
      bottomFraction: 0.99,
      shapeLandscape: {
        viewBox: '0 0 841.9 595.3',
        width: 841.9,
        height: 595.3,
        markup: '<rect x="8.5" y="8.5" width="409.62" height="578.3" rx="29.77"/><rect x="423.79" y="8.5" width="409.62" height="578.3" rx="29.77"/>',
        bottomFraction: 1,
      },
    },
  },
  'hearts-curved': {
    key: 'hearts-curved',
    label: '2× Herz geschwungen',
    svgPath: '/masks/hearts-curved.svg',
    applicableTo: ['map'],
    isSplit: true,
    leftSvgPath: '/masks/hearts-curved-left.svg',
    rightSvgPath: '/masks/hearts-curved-right.svg',
    // Hearts curve into each other near the centre — neither a midline
    // polygon nor SVG-clip-path partition holds up reliably for pointer
    // events. Instead, PosterCanvas reads `activeSplitMap` from the
    // editor store and gates pointer-events: the user toggles which map
    // is interactive via the "Karte 1 / Karte 2" badge above the canvas.
    noHalfClip: true,
    shape: {
      viewBox: '0 0 595.3 841.9',
      width: 595.3, height: 841.9,
      markup: '<g transform="translate(-12 -87) scale(1.52)"><path d="M211.2,224.38c3.12-53.45-41.67-104.88-97.22-95.13l-.18.03c-80.21,15.67-90.26,95.71-56.78,158.97,20.87,40.7,58.58,71.89,98.42,93.38,8.37,4.38,16.92,8.54,25.68,12.34,5.81,2.2,11.43,5.94,16.73,4.48,5.06-2.1-10.63-25.09-11.01-31.22-25.8-63,20.33-85.35,24.35-142.85Z"/><path d="M364.1,183.38c-19.67-61.75-106.26-75.91-142.8-21.78-14.78,19.83,8.86,49.29.87,76.4-5.3,29.47-26.69,52.38-30.88,82.28-4.25,19.24,7.08,66.16,22.81,77.65l.14.07c19.1,6.07,50.24-22.98,66.44-33.72,50.73-42.97,103.78-110.65,83.42-180.9Z"/></g>',
      splitMarkup: {
        left: '<g transform="translate(-12 -87) scale(1.52)"><path d="M211.2,224.38c3.12-53.45-41.67-104.88-97.22-95.13l-.18.03c-80.21,15.67-90.26,95.71-56.78,158.97,20.87,40.7,58.58,71.89,98.42,93.38,8.37,4.38,16.92,8.54,25.68,12.34,5.81,2.2,11.43,5.94,16.73,4.48,5.06-2.1-10.63-25.09-11.01-31.22-25.8-63,20.33-85.35,24.35-142.85Z"/></g>',
        right: '<g transform="translate(-12 -87) scale(1.52)"><path d="M364.1,183.38c-19.67-61.75-106.26-75.91-142.8-21.78-14.78,19.83,8.86,49.29.87,76.4-5.3,29.47-26.69,52.38-30.88,82.28-4.25,19.24,7.08,66.16,22.81,77.65l.14.07c19.1,6.07,50.24-22.98,66.44-33.72,50.73-42.97,103.78-110.65,83.42-180.9Z"/></g>',
      },
      bottomFraction: 0.61,
      landscapeScale: 1.15,
      landscapeYOffset: 0.06,
      shapeLandscape: {
        viewBox: '0 0 841.9 595.3',
        width: 841.9,
        height: 595.3,
        // Pre-baked landscape variant: re-positions the curved-hearts pair
        // into a landscape canvas (841.9x595.3) so the auto-fit doesn't
        // shrink them. The intra-form centerline sits on canvas midline
        // (x=420.95); vertical translate keeps them comfortably above the
        // text area, similar to portrait's bottomFraction 0.61.
        markup: '<g transform="translate(147 -127) scale(1.30)"><path d="M211.2,224.38c3.12-53.45-41.67-104.88-97.22-95.13l-.18.03c-80.21,15.67-90.26,95.71-56.78,158.97,20.87,40.7,58.58,71.89,98.42,93.38,8.37,4.38,16.92,8.54,25.68,12.34,5.81,2.2,11.43,5.94,16.73,4.48,5.06-2.1-10.63-25.09-11.01-31.22-25.8-63,20.33-85.35,24.35-142.85Z"/><path d="M364.1,183.38c-19.67-61.75-106.26-75.91-142.8-21.78-14.78,19.83,8.86,49.29.87,76.4-5.3,29.47-26.69,52.38-30.88,82.28-4.25,19.24,7.08,66.16,22.81,77.65l.14.07c19.1,6.07,50.24-22.98,66.44-33.72,50.73-42.97,103.78-110.65,83.42-180.9Z"/></g>',
        splitMarkup: {
          left: '<g transform="translate(147 -127) scale(1.30)"><path d="M211.2,224.38c3.12-53.45-41.67-104.88-97.22-95.13l-.18.03c-80.21,15.67-90.26,95.71-56.78,158.97,20.87,40.7,58.58,71.89,98.42,93.38,8.37,4.38,16.92,8.54,25.68,12.34,5.81,2.2,11.43,5.94,16.73,4.48,5.06-2.1-10.63-25.09-11.01-31.22-25.8-63,20.33-85.35,24.35-142.85Z"/></g>',
          right: '<g transform="translate(147 -127) scale(1.30)"><path d="M364.1,183.38c-19.67-61.75-106.26-75.91-142.8-21.78-14.78,19.83,8.86,49.29.87,76.4-5.3,29.47-26.69,52.38-30.88,82.28-4.25,19.24,7.08,66.16,22.81,77.65l.14.07c19.1,6.07,50.24-22.98,66.44-33.72,50.73-42.97,103.78-110.65,83.42-180.9Z"/></g>',
        },
        bottomFraction: 1,
      },
    },
  },
  'hearts-diagonal': {
    key: 'hearts-diagonal',
    label: '2× Herz schräg',
    svgPath: '/masks/hearts-diagonal.svg',
    applicableTo: ['map'],
    isSplit: true,
    leftSvgPath: '/masks/hearts-diagonal-left.svg',
    rightSvgPath: '/masks/hearts-diagonal-right.svg',
    // Hearts cross the canvas midline at angles. Same reasoning as
    // hearts-curved: pointer events follow `activeSplitMap` (toggle badge
    // above the canvas) instead of any geometric partition.
    noHalfClip: true,
    shape: {
      viewBox: '0 0 595.3 841.9',
      width: 595.3, height: 841.9,
      markup: '<g transform="translate(46 130) scale(1.3)"><path d="M136.3,61.11c1.5-5.53,9.76-33.85,38.57-50.14,37.18-21.02,80.27-7.67,100.29,29.57,15.66,29.14,7.57,57.08,6,62.14-15.22-18.91-39.57-27.47-62.14-21.86-22.02,5.48-37.95,23.6-43.18,45.33-6.1,25.34,4.7,46.41,14.46,69.09,3.84,8.93,9.56,22.47,16.29,39.43-6,13.29-12,26.57-18,39.86-35.95-24.11-72.04-48.01-108.26-71.72-27.96-18.3-60.6-33.17-73.46-66.28C.02,118.9-1.21,98.73,5.18,80.79,26.1,22.02,95.54,27.45,136.3,61.11Z"/><path d="M291.01,133.68c3.17-1.95,37.47-22.36,67.14-6.57,4.64,2.47,10.77,6.67,16.57,14,3.49,4.8,11.45,17.16,11.43,34.29-.01,10.3-2.91,19.15-6.78,26.37-6.29,11.72-16.35,20.97-28.33,26.73l-119.46,57.47-46-110.86c-2.77-5.15-11.25-22.53-6.86-44.57.32-1.6.69-3.16,1.11-4.65,5.23-18.81,19.37-34.07,37.95-40.06,6.49-2.09,14.05-3.26,22.35-2.3,24.4,2.84,45.26,22.97,50.87,50.15Z"/></g>',
      splitMarkup: {
        left: '<g transform="translate(46 130) scale(1.3)"><path d="M136.3,61.11c1.5-5.53,9.76-33.85,38.57-50.14,37.18-21.02,80.27-7.67,100.29,29.57,15.66,29.14,7.57,57.08,6,62.14-15.22-18.91-39.57-27.47-62.14-21.86-22.02,5.48-37.95,23.6-43.18,45.33-6.1,25.34,4.7,46.41,14.46,69.09,3.84,8.93,9.56,22.47,16.29,39.43-6,13.29-12,26.57-18,39.86-35.95-24.11-72.04-48.01-108.26-71.72-27.96-18.3-60.6-33.17-73.46-66.28C.02,118.9-1.21,98.73,5.18,80.79,26.1,22.02,95.54,27.45,136.3,61.11Z"/></g>',
        right: '<g transform="translate(46 130) scale(1.3)"><path d="M291.01,133.68c3.17-1.95,37.47-22.36,67.14-6.57,4.64,2.47,10.77,6.67,16.57,14,3.49,4.8,11.45,17.16,11.43,34.29-.01,10.3-2.91,19.15-6.78,26.37-6.29,11.72-16.35,20.97-28.33,26.73l-119.46,57.47-46-110.86c-2.77-5.15-11.25-22.53-6.86-44.57.32-1.6.69-3.16,1.11-4.65,5.23-18.81,19.37-34.07,37.95-40.06,6.49-2.09,14.05-3.26,22.35-2.3,24.4,2.84,45.26,22.97,50.87,50.15Z"/></g>',
      },
      bottomFraction: 0.6,
      // Portrait keeps the modest 1.08 auto-fit boost; landscape uses a
      // hand-tuned variant below because the diagonal hearts have their
      // tips so close to the upper edge that any larger uniform-fit
      // value clipped them. The variant repositions the same paths into
      // a landscape viewBox so they fill the wider canvas.
      landscapeScale: 1.08,
      landscapeYOffset: 0.04,
      shapeLandscape: {
        viewBox: '0 0 841.9 595.3',
        width: 841.9,
        height: 595.3,
        markup: '<g transform="translate(141 39) scale(1.4)"><path d="M136.3,61.11c1.5-5.53,9.76-33.85,38.57-50.14,37.18-21.02,80.27-7.67,100.29,29.57,15.66,29.14,7.57,57.08,6,62.14-15.22-18.91-39.57-27.47-62.14-21.86-22.02,5.48-37.95,23.6-43.18,45.33-6.1,25.34,4.7,46.41,14.46,69.09,3.84,8.93,9.56,22.47,16.29,39.43-6,13.29-12,26.57-18,39.86-35.95-24.11-72.04-48.01-108.26-71.72-27.96-18.3-60.6-33.17-73.46-66.28C.02,118.9-1.21,98.73,5.18,80.79,26.1,22.02,95.54,27.45,136.3,61.11Z"/><path d="M291.01,133.68c3.17-1.95,37.47-22.36,67.14-6.57,4.64,2.47,10.77,6.67,16.57,14,3.49,4.8,11.45,17.16,11.43,34.29-.01,10.3-2.91,19.15-6.78,26.37-6.29,11.72-16.35,20.97-28.33,26.73l-119.46,57.47-46-110.86c-2.77-5.15-11.25-22.53-6.86-44.57.32-1.6.69-3.16,1.11-4.65,5.23-18.81,19.37-34.07,37.95-40.06,6.49-2.09,14.05-3.26,22.35-2.3,24.4,2.84,45.26,22.97,50.87,50.15Z"/></g>',
        splitMarkup: {
          left: '<g transform="translate(141 39) scale(1.4)"><path d="M136.3,61.11c1.5-5.53,9.76-33.85,38.57-50.14,37.18-21.02,80.27-7.67,100.29,29.57,15.66,29.14,7.57,57.08,6,62.14-15.22-18.91-39.57-27.47-62.14-21.86-22.02,5.48-37.95,23.6-43.18,45.33-6.1,25.34,4.7,46.41,14.46,69.09,3.84,8.93,9.56,22.47,16.29,39.43-6,13.29-12,26.57-18,39.86-35.95-24.11-72.04-48.01-108.26-71.72-27.96-18.3-60.6-33.17-73.46-66.28C.02,118.9-1.21,98.73,5.18,80.79,26.1,22.02,95.54,27.45,136.3,61.11Z"/></g>',
          right: '<g transform="translate(141 39) scale(1.4)"><path d="M291.01,133.68c3.17-1.95,37.47-22.36,67.14-6.57,4.64,2.47,10.77,6.67,16.57,14,3.49,4.8,11.45,17.16,11.43,34.29-.01,10.3-2.91,19.15-6.78,26.37-6.29,11.72-16.35,20.97-28.33,26.73l-119.46,57.47-46-110.86c-2.77-5.15-11.25-22.53-6.86-44.57.32-1.6.69-3.16,1.11-4.65,5.23-18.81,19.37-34.07,37.95-40.06,6.49-2.09,14.05-3.26,22.35-2.3,24.4,2.84,45.26,22.97,50.87,50.15Z"/></g>',
        },
        // Pre-baked: no further auto-fit, scale or offset on top.
        bottomFraction: 1,
      },
    },
  },
}

export const MAP_MASK_OPTIONS = Object.values(MAP_MASKS)
