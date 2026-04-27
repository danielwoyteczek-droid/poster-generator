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

export interface MapMaskDefinition {
  key: MapMaskKey
  label: string
  svgPath: string | null
  isSplit?: boolean
  leftSvgPath?: string
  rightSvgPath?: string
  /**
   * When true, skip the poster-middle 50% clip-path for split rendering.
   * Used when the left/right shapes intentionally extend across the midline
   * (entwined hearts etc.) — without this flag the shapes would be cut
   * along the poster centre.
   */
  noHalfClip?: boolean
  /**
   * Pure shape definition (viewBox + inner markup). Present for non-split
   * masks that participate in the mask composer. Split masks or the "none"
   * entry have no shape.
   */
  shape?: ShapeDefinition
}

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
      bottomFraction: 0.67,
    },
  },
  heart: {
    key: 'heart',
    label: 'Herz geteilt',
    svgPath: '/masks/heart1.svg',
    isSplit: true,
    leftSvgPath: '/masks/heart1-left.svg',
    rightSvgPath: '/masks/heart1-right.svg',
    shape: {
      viewBox: '0 0 595.3 841.9',
      width: 595.3, height: 841.9,
      markup: '<path d="M298 543 C 298 543, 48 375, 48 228 C 48 108, 198 60, 298 178 C 398 60, 548 108, 548 228 C 548 375, 298 543, 298 543 Z"/>',
      bottomFraction: 0.645,
    },
  },
  'heart-single': {
    key: 'heart-single',
    label: 'Herz',
    svgPath: '/masks/heart-single.svg',
    shape: {
      viewBox: '0 0 595.3 841.9',
      width: 595.3, height: 841.9,
      markup: '<path d="M298 543 C 298 543, 48 375, 48 228 C 48 108, 198 60, 298 178 C 398 60, 548 108, 548 228 C 548 375, 298 543, 298 543 Z"/>',
      bottomFraction: 0.645,
    },
  },
  house: {
    key: 'house',
    label: 'Haus',
    svgPath: '/masks/house.svg',
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
    isSplit: true,
    leftSvgPath: '/masks/split-circles-left.svg',
    rightSvgPath: '/masks/split-circles-right.svg',
    shape: {
      viewBox: '0 0 595.3 841.9',
      width: 595.3, height: 841.9,
      markup: '<circle cx="297.65" cy="419.95" r="273.84"/>',
      bottomFraction: 0.824,
    },
  },
'split-halves': {
    key: 'split-halves',
    label: '2× Hälfte',
    svgPath: '/masks/split-halves-preview.svg',
    isSplit: true,
    leftSvgPath: '/masks/split-halves-left.svg',
    rightSvgPath: '/masks/split-halves-right.svg',
    shape: {
      viewBox: '0 0 595.3 841.9',
      width: 595.3, height: 841.9,
      markup: '<rect x="17.86" y="17.86" width="261.93" height="803.66" rx="29.77"/><rect x="315.51" y="17.86" width="261.93" height="803.66" rx="29.77"/>',
      bottomFraction: 0.976,
    },
  },
}

export const MAP_MASK_OPTIONS = Object.values(MAP_MASKS)
