export type MapMaskKey =
  | 'none'
  | 'circle'
  | 'heart'
  | 'frame1'
  | 'split-circles'
  | 'split-hearts'
  | 'split-halves'
  // Custom masks (uploaded via admin UI) get keys like 'custom-abc12345'.
  // The (string & {}) intersection keeps autocomplete for built-ins while
  // still accepting arbitrary strings at runtime.
  | (string & {})

import type { ShapeDefinition } from './mask-composer'

export interface MapMaskDefinition {
  key: MapMaskKey
  label: string
  svgPath: string | null
  isSplit?: boolean
  leftSvgPath?: string
  rightSvgPath?: string
  /**
   * Pure shape definition (viewBox + inner markup). Present for non-split
   * masks that participate in the mask composer. Split masks or the "none"
   * entry have no shape.
   */
  shape?: ShapeDefinition
}

const HEART_PATH_1 = 'M277.33,474.13c-21.85-15.95-37.58-81.13-31.68-107.84,5.81-41.52,35.52-73.35,42.88-114.27,11.09-37.65-21.73-78.57-1.2-106.11,50.76-75.18,171.01-55.51,198.33,30.24,28.27,97.58-45.41,191.56-115.86,251.24-22.49,14.91-65.74,55.26-92.27,46.83l-.19-.1Z'
const HEART_PATH_2 = 'M138.28,100.98c77.14-13.54,139.35,57.89,135.02,132.12-5.59,79.86-69.65,110.9-33.82,198.4.53,8.51,22.32,40.43,15.3,43.36-7.36,2.02-15.16-3.17-23.23-6.23-12.17-5.29-24.04-11.06-35.67-17.14-55.33-29.85-107.7-73.17-136.69-129.69C12.68,233.94,26.64,122.77,138.03,101.02l.25-.04Z'

export const MAP_MASKS: Record<MapMaskKey, MapMaskDefinition> = {
  none: { key: 'none', label: 'Keins', svgPath: null },
  circle: {
    key: 'circle',
    label: 'Kreis',
    svgPath: '/masks/circle.svg',
    shape: {
      viewBox: '0 0 595.3 841.9',
      width: 595.3, height: 841.9,
      markup: '<circle cx="297.6" cy="297.6" r="266.5"/>',
    },
  },
  heart: {
    key: 'heart',
    label: 'Herz',
    svgPath: '/masks/heart1.svg',
    shape: {
      viewBox: '0 0 526 744',
      width: 526, height: 744,
      markup: `<path d="${HEART_PATH_1}"/><path d="${HEART_PATH_2}"/>`,
    },
  },
  frame1: {
    key: 'frame1',
    label: 'Rahmen',
    svgPath: '/masks/frame1.svg',
    shape: {
      viewBox: '0 0 1000 1400',
      width: 1000, height: 1400,
      markup: '<rect x="50" y="50" width="900" height="908"/>',
    },
  },
  'split-circles': {
    key: 'split-circles',
    label: 'Kreis geteilt',
    svgPath: '/masks/split-circles-preview.svg',
    isSplit: true,
    leftSvgPath: '/masks/split-circles-left.svg',
    rightSvgPath: '/masks/split-circles-right.svg',
  },
  'split-hearts': {
    key: 'split-hearts',
    label: 'Herz geteilt',
    svgPath: '/masks/split-hearts-preview.svg',
    isSplit: true,
    leftSvgPath: '/masks/split-hearts-left.svg',
    rightSvgPath: '/masks/split-hearts-right.svg',
  },
  'split-halves': {
    key: 'split-halves',
    label: '2× Hälfte',
    svgPath: '/masks/split-halves-preview.svg',
    isSplit: true,
    leftSvgPath: '/masks/split-halves-left.svg',
    rightSvgPath: '/masks/split-halves-right.svg',
  },
}

export const MAP_MASK_OPTIONS = Object.values(MAP_MASKS)
