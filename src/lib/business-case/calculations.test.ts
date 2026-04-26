import { describe, expect, it } from 'vitest'
import {
  calculateFulfillmentCeiling,
  calculateMetrics,
  calculateThresholds,
  calculateVolume,
} from './calculations'
import { DEFAULT_SCENARIO_DATA } from './defaults'

describe('calculateMetrics', () => {
  it('produces stable defaults from the seed scenario', () => {
    const m = calculateMetrics(DEFAULT_SCENARIO_DATA)
    expect(m.mixSum).toBe(100)
    // 0.4*4 + 0.25*15 + 0.10*20 + 0.15*35 + 0.10*50 = 17.60
    expect(m.aov).toBeCloseTo(17.6, 2)
    // Cost-mix: 0.4*0.5 + 0.25*9.5 + 0.10*12 + 0.15*22 + 0.10*32 = 10.275
    expect(m.avgCost).toBeCloseTo(10.275, 2)
    expect(m.avgMargin).toBeCloseTo(7.325, 2)
    expect(m.physicalShare).toBeCloseTo(0.6, 2)
    expect(m.fixedMonthly).toBe(100)
    expect(m.fixedYearly).toBe(1200)
    // CAC 3 × 30% paid share = 0.9
    expect(m.effectiveCac).toBeCloseTo(0.9, 2)
    expect(m.marginAfterCac).toBeCloseTo(6.425, 2)
    // Break-even: ceil(1200 / 6.425) = 187
    expect(m.breakEvenOrders).toBe(187)
  })

  it('normalizes when mix-sum != 100', () => {
    const data = {
      ...DEFAULT_SCENARIO_DATA,
      tiers: DEFAULT_SCENARIO_DATA.tiers.map((t, i) => ({ ...t, mix: i === 0 ? 80 : 5 })),
    }
    const m = calculateMetrics(data)
    expect(m.mixSum).toBe(100)
  })

  it('handles all-zero mix gracefully (no division by zero)', () => {
    const data = {
      ...DEFAULT_SCENARIO_DATA,
      tiers: DEFAULT_SCENARIO_DATA.tiers.map((t) => ({ ...t, mix: 0 })),
    }
    const m = calculateMetrics(data)
    expect(m.aov).toBe(0)
    expect(m.avgMargin).toBe(0)
    expect(m.breakEvenOrders).toBe(Number.POSITIVE_INFINITY)
  })

  it('counts only non-digital tiers as physical', () => {
    const data = DEFAULT_SCENARIO_DATA
    const m = calculateMetrics(data)
    // 25 + 10 + 15 + 10 = 60% physical
    expect(m.physicalShare).toBeCloseTo(0.6, 5)
  })
})

describe('calculateVolume', () => {
  it('computes daily and yearly figures from order count', () => {
    const m = calculateMetrics(DEFAULT_SCENARIO_DATA)
    const v = calculateVolume(6000, m)
    expect(v.orders).toBe(6000)
    expect(v.ordersPerDay).toBeCloseTo(6000 / 365, 2)
    expect(v.revenue).toBeCloseTo(6000 * m.aov, 2)
    expect(v.grossMargin).toBeCloseTo(6000 * m.avgMargin, 2)
    expect(v.fixed).toBe(m.fixedYearly)
  })
})

describe('calculateThresholds', () => {
  it('returns four thresholds for non-zero AOV', () => {
    const m = calculateMetrics(DEFAULT_SCENARIO_DATA)
    const t = calculateThresholds(m)
    expect(t).toHaveLength(4)
    expect(t.map((r) => r.revenue)).toEqual([50000, 100000, 250000, 500000])
  })

  it('returns empty array when AOV is zero', () => {
    const data = {
      ...DEFAULT_SCENARIO_DATA,
      tiers: DEFAULT_SCENARIO_DATA.tiers.map((t) => ({ ...t, price: 0 })),
    }
    const m = calculateMetrics(data)
    expect(calculateThresholds(m)).toEqual([])
  })
})

describe('calculateFulfillmentCeiling', () => {
  it('returns the revenue at 50 packages/day', () => {
    const m = calculateMetrics(DEFAULT_SCENARIO_DATA)
    const ceil = calculateFulfillmentCeiling(m)
    // 50 / 0.6 × 365 × 17.60 = ~535.300
    expect(ceil).toBeCloseTo((50 / 0.6) * 365 * m.aov, 0)
  })

  it('returns null when scenario has no physical tier', () => {
    const data = {
      ...DEFAULT_SCENARIO_DATA,
      tiers: DEFAULT_SCENARIO_DATA.tiers.map((t) =>
        t.key === 'digital' ? { ...t, mix: 100 } : { ...t, mix: 0 },
      ),
    }
    const m = calculateMetrics(data)
    expect(calculateFulfillmentCeiling(m)).toBeNull()
  })
})
