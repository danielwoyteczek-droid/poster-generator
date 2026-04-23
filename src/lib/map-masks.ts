export type MapMaskKey =
  | 'none'
  | 'circle'
  | 'heart'
  | 'heart-single'
  | 'frame1'
  | 'text-below'
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
    label: 'Herzen',
    svgPath: '/masks/heart1.svg',
    isSplit: true,
    leftSvgPath: '/masks/heart1-left.svg',
    rightSvgPath: '/masks/heart1-right.svg',
  },
  'heart-single': {
    key: 'heart-single',
    label: 'Herz',
    svgPath: '/masks/heart-single.svg',
    shape: {
      viewBox: '0 0 526 744',
      width: 526, height: 744,
      markup: '<path d="M263 625 C 175 560, 33 430, 33 270 C 33 180, 99 120, 175 120 C 227 120, 263 150, 263 200 C 263 150, 299 120, 351 120 C 427 120, 493 180, 493 270 C 493 430, 351 560, 263 625 Z"/>',
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
