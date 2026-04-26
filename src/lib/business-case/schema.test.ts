import { describe, expect, it } from 'vitest'
import { DEFAULT_SCENARIO_DATA } from './defaults'
import {
  createScenarioSchema,
  monthlyDistributionSchema,
  scenarioDataSchema,
  updateDistributionSchema,
  updateScenarioSchema,
} from './schema'

describe('scenarioDataSchema', () => {
  it('accepts the default seed scenario', () => {
    const result = scenarioDataSchema.safeParse(DEFAULT_SCENARIO_DATA)
    expect(result.success).toBe(true)
  })

  it('rejects scenarios with no tiers', () => {
    const bad = { ...DEFAULT_SCENARIO_DATA, tiers: [] }
    expect(scenarioDataSchema.safeParse(bad).success).toBe(false)
  })

  it('rejects negative prices', () => {
    const bad = {
      ...DEFAULT_SCENARIO_DATA,
      tiers: [{ ...DEFAULT_SCENARIO_DATA.tiers[0], price: -1 }, ...DEFAULT_SCENARIO_DATA.tiers.slice(1)],
    }
    expect(scenarioDataSchema.safeParse(bad).success).toBe(false)
  })

  it('rejects non-3 volume scenarios array', () => {
    const bad = { ...DEFAULT_SCENARIO_DATA, volumes: DEFAULT_SCENARIO_DATA.volumes.slice(0, 2) }
    expect(scenarioDataSchema.safeParse(bad).success).toBe(false)
  })

  it('rejects mix > 100', () => {
    const bad = {
      ...DEFAULT_SCENARIO_DATA,
      tiers: [{ ...DEFAULT_SCENARIO_DATA.tiers[0], mix: 101 }, ...DEFAULT_SCENARIO_DATA.tiers.slice(1)],
    }
    expect(scenarioDataSchema.safeParse(bad).success).toBe(false)
  })
})

describe('createScenarioSchema', () => {
  it('accepts a name only', () => {
    expect(createScenarioSchema.safeParse({ name: 'Foo' }).success).toBe(true)
  })

  it('accepts name + cloneFromId UUID', () => {
    const r = createScenarioSchema.safeParse({
      name: 'Foo',
      cloneFromId: '550e8400-e29b-41d4-a716-446655440000',
    })
    expect(r.success).toBe(true)
  })

  it('rejects empty name', () => {
    expect(createScenarioSchema.safeParse({ name: '' }).success).toBe(false)
  })

  it('rejects non-UUID cloneFromId', () => {
    expect(createScenarioSchema.safeParse({ name: 'Foo', cloneFromId: 'not-a-uuid' }).success).toBe(false)
  })
})

describe('updateScenarioSchema', () => {
  it('accepts partial updates', () => {
    expect(updateScenarioSchema.safeParse({ name: 'New' }).success).toBe(true)
    expect(updateScenarioSchema.safeParse({ description: 'desc' }).success).toBe(true)
    expect(updateScenarioSchema.safeParse({ description: null }).success).toBe(true)
    expect(updateScenarioSchema.safeParse({ data: DEFAULT_SCENARIO_DATA }).success).toBe(true)
  })

  it('rejects invalid embedded data', () => {
    const r = updateScenarioSchema.safeParse({ data: { ...DEFAULT_SCENARIO_DATA, tiers: [] } })
    expect(r.success).toBe(false)
  })
})

describe('monthlyDistributionSchema', () => {
  it('accepts an array summing to 100', () => {
    const even = Array.from({ length: 12 }, () => 100 / 12)
    expect(monthlyDistributionSchema.safeParse(even).success).toBe(true)
  })

  it('rejects when sum != 100', () => {
    const bad = Array.from({ length: 12 }, () => 5)
    expect(monthlyDistributionSchema.safeParse(bad).success).toBe(false)
  })

  it('rejects when length != 12', () => {
    const bad = Array.from({ length: 11 }, () => 100 / 11)
    expect(monthlyDistributionSchema.safeParse(bad).success).toBe(false)
  })

  it('rejects negative values', () => {
    const bad = [-10, ...Array.from({ length: 11 }, () => 110 / 11)]
    expect(monthlyDistributionSchema.safeParse(bad).success).toBe(false)
  })
})

describe('updateDistributionSchema', () => {
  it('wraps the distribution validator', () => {
    const even = Array.from({ length: 12 }, () => 100 / 12)
    expect(updateDistributionSchema.safeParse({ monthlyDistribution: even }).success).toBe(true)
    expect(updateDistributionSchema.safeParse({}).success).toBe(false)
  })
})
