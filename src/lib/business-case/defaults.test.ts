import { describe, expect, it } from 'vitest'
import {
  DEFAULT_MONTHLY_DISTRIBUTION,
  isPhysicalTier,
  mapOrderItemToTier,
} from './defaults'

describe('mapOrderItemToTier', () => {
  it('maps digital downloads to digital tier regardless of format', () => {
    expect(mapOrderItemToTier('download', 'a4')).toBe('digital')
    expect(mapOrderItemToTier('download', 'a3')).toBe('digital')
    expect(mapOrderItemToTier('download', null)).toBe('digital')
  })

  it('maps poster + format to poster_<format> tier', () => {
    expect(mapOrderItemToTier('poster', 'a4')).toBe('poster_a4')
    expect(mapOrderItemToTier('poster', 'a3')).toBe('poster_a3')
  })

  it('maps frame + format to frame_<format> tier', () => {
    expect(mapOrderItemToTier('frame', 'a4')).toBe('frame_a4')
    expect(mapOrderItemToTier('frame', 'a3')).toBe('frame_a3')
  })

  it('returns null for unknown product or unsupported format', () => {
    expect(mapOrderItemToTier('mug', 'a4')).toBeNull()
    expect(mapOrderItemToTier('poster', 'a2')).toBeNull()
    expect(mapOrderItemToTier('poster', null)).toBeNull()
    expect(mapOrderItemToTier('', '')).toBeNull()
  })
})

describe('isPhysicalTier', () => {
  it('marks every non-digital tier as physical', () => {
    expect(isPhysicalTier('digital')).toBe(false)
    expect(isPhysicalTier('poster_a4')).toBe(true)
    expect(isPhysicalTier('poster_a3')).toBe(true)
    expect(isPhysicalTier('frame_a4')).toBe(true)
    expect(isPhysicalTier('frame_a3')).toBe(true)
    expect(isPhysicalTier('a2_future')).toBe(true)
  })
})

describe('DEFAULT_MONTHLY_DISTRIBUTION', () => {
  it('has 12 entries that sum to 100', () => {
    expect(DEFAULT_MONTHLY_DISTRIBUTION).toHaveLength(12)
    const sum = DEFAULT_MONTHLY_DISTRIBUTION.reduce((a, n) => a + n, 0)
    expect(sum).toBeCloseTo(100, 5)
  })
})
