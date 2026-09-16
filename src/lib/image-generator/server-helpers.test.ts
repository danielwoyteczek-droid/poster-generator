// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { configHash } from './config-hash'
import { bakePaletteIntoConfig } from './palette-bake'

describe('configHash', () => {
  it('ist unabhängig von der Schlüssel-Reihenfolge', () => {
    expect(configHash({ a: 1, b: { c: 2, d: [1, 2] } })).toBe(configHash({ b: { d: [1, 2], c: 2 }, a: 1 }))
  })
  it('unterscheidet echte Änderungen', () => {
    expect(configHash({ paletteId: 'a' })).not.toBe(configHash({ paletteId: 'b' }))
  })
  it('behandelt null wie leeres Objekt und ignoriert undefined', () => {
    expect(configHash(null)).toBe(configHash({}))
    expect(configHash({ a: 1, b: undefined })).toBe(configHash({ a: 1 }))
  })
})

describe('bakePaletteIntoConfig', () => {
  it('backt DB-Farben als custom ein und lässt das Original unverändert', () => {
    const base = { paletteId: 'mint', zoom: 12 }
    const colors = { water: '#112233', land: '#445566' }
    const out = bakePaletteIntoConfig(base, 'salbei', colors)
    expect(out).toEqual({ paletteId: 'custom', zoom: 12, customPalette: colors, customPaletteBase: '#112233' })
    expect(base).toEqual({ paletteId: 'mint', zoom: 12 })
  })
  it('fällt auf land und Standardfarbe zurück', () => {
    expect(bakePaletteIntoConfig({}, 'x', { land: '#abcdef' }).customPaletteBase).toBe('#abcdef')
    expect(bakePaletteIntoConfig({}, 'x', {}).customPaletteBase).toBe('#84c5a6')
  })
  it('setzt nur die Paletten-ID, wenn keine Farben bekannt sind', () => {
    expect(bakePaletteIntoConfig({ zoom: 3 }, 'sand', null)).toEqual({ zoom: 3, paletteId: 'sand' })
  })
})
