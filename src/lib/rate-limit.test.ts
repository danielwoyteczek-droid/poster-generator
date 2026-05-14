import { afterEach, describe, expect, it, vi } from 'vitest'
import { _resetRateLimitForTests, rateLimit } from './rate-limit'

describe('rateLimit', () => {
  afterEach(() => {
    _resetRateLimitForTests()
    vi.useRealTimers()
  })

  it('allows hits up to the limit', () => {
    for (let i = 0; i < 5; i++) {
      const r = rateLimit('k', 5, 60_000)
      expect(r.ok).toBe(true)
      expect(r.remaining).toBe(4 - i)
    }
  })

  it('blocks the hit that would exceed the limit', () => {
    for (let i = 0; i < 3; i++) rateLimit('k', 3, 60_000)
    const blocked = rateLimit('k', 3, 60_000)
    expect(blocked.ok).toBe(false)
    expect(blocked.remaining).toBe(0)
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0)
  })

  it('expires hits as the window slides', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'))
    for (let i = 0; i < 3; i++) rateLimit('k', 3, 60_000)
    expect(rateLimit('k', 3, 60_000).ok).toBe(false)

    // Move 61 seconds forward — all old hits expired.
    vi.setSystemTime(new Date('2026-01-01T00:01:01Z'))
    expect(rateLimit('k', 3, 60_000).ok).toBe(true)
  })

  it('isolates buckets by key', () => {
    for (let i = 0; i < 3; i++) rateLimit('a', 3, 60_000)
    expect(rateLimit('a', 3, 60_000).ok).toBe(false)
    expect(rateLimit('b', 3, 60_000).ok).toBe(true)
  })
})
