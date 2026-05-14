import { describe, expect, it } from 'vitest'
import { configReferencesFontFamily } from './fonts-server'

describe('configReferencesFontFamily', () => {
  it('returns false for nullish or non-object input', () => {
    expect(configReferencesFontFamily(null, 'Cathalia')).toBe(false)
    expect(configReferencesFontFamily(undefined, 'Cathalia')).toBe(false)
    expect(configReferencesFontFamily('Cathalia', 'Cathalia')).toBe(false)
    expect(configReferencesFontFamily(42, 'Cathalia')).toBe(false)
  })

  it('finds a top-level fontFamily', () => {
    expect(configReferencesFontFamily({ fontFamily: 'Cathalia' }, 'Cathalia')).toBe(true)
    expect(configReferencesFontFamily({ fontFamily: 'Welcome' }, 'Cathalia')).toBe(false)
  })

  it('finds fontFamily nested inside arrays', () => {
    const cfg = {
      textBlocks: [
        { id: '1', fontFamily: 'Inter', text: 'hi' },
        { id: '2', fontFamily: 'Cathalia', text: 'bye' },
      ],
    }
    expect(configReferencesFontFamily(cfg, 'Cathalia')).toBe(true)
    expect(configReferencesFontFamily(cfg, 'Cormorant Garamond')).toBe(false)
  })

  it('finds fontFamily in deeply nested objects', () => {
    const cfg = {
      layout: {
        header: { style: { fontFamily: 'Allura Script' } },
        footer: {},
      },
    }
    expect(configReferencesFontFamily(cfg, 'Allura Script')).toBe(true)
    expect(configReferencesFontFamily(cfg, 'Other')).toBe(false)
  })

  it('ignores non-string fontFamily values (e.g. null or numbers)', () => {
    const cfg = { textBlocks: [{ fontFamily: null }, { fontFamily: 42 }] }
    expect(configReferencesFontFamily(cfg, 'null')).toBe(false)
    expect(configReferencesFontFamily(cfg, '42')).toBe(false)
  })

  it('handles cyclical-ish but acyclic deep structures', () => {
    // Build a moderately deep nested array — not actually cyclical (the walk
    // doesn't track visited nodes), but enough to exercise the stack.
    const deep: { a: unknown; fontFamily?: string } = { a: null }
    let cursor: typeof deep = deep
    for (let i = 0; i < 100; i += 1) {
      const next = { a: null }
      cursor.a = next
      cursor = next as typeof deep
    }
    cursor.fontFamily = 'Cathalia'
    expect(configReferencesFontFamily(deep, 'Cathalia')).toBe(true)
  })

  it('is case-sensitive and exact-match', () => {
    expect(configReferencesFontFamily({ fontFamily: 'cathalia' }, 'Cathalia')).toBe(false)
    expect(configReferencesFontFamily({ fontFamily: 'Cathalia ' }, 'Cathalia')).toBe(false)
  })
})
