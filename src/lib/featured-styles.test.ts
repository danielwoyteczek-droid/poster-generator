import { describe, expect, it } from 'vitest'
import {
  FEATURED_STYLES,
  FEATURED_STYLE_IDS,
  DEFAULT_FEATURED_STYLE_ID,
  getFeaturedStyle,
  isValidFeaturedStyleId,
  getFeaturedStyleLabel,
} from './featured-styles'
import { MAP_LAYOUTS } from './map-layouts'
import { MAP_PALETTES } from './map-palettes'
import { locales } from '@/i18n/config'

describe('FEATURED_STYLES (PROJ-42)', () => {
  it('contains exactly 3 entries', () => {
    expect(FEATURED_STYLES).toHaveLength(3)
  })

  it('has unique style ids', () => {
    const ids = FEATURED_STYLES.map((s) => s.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('every layoutId references an existing entry in MAP_LAYOUTS', () => {
    const layoutIds = new Set(MAP_LAYOUTS.map((l) => l.id))
    for (const style of FEATURED_STYLES) {
      expect(
        layoutIds.has(style.layoutId),
        `layoutId "${style.layoutId}" of featured-style "${style.id}" not found in MAP_LAYOUTS`,
      ).toBe(true)
    }
  })

  it('every paletteId references an existing entry in MAP_PALETTES', () => {
    const paletteIds = new Set(MAP_PALETTES.map((p) => p.id))
    for (const style of FEATURED_STYLES) {
      expect(
        paletteIds.has(style.paletteId),
        `paletteId "${style.paletteId}" of featured-style "${style.id}" not found in MAP_PALETTES`,
      ).toBe(true)
    }
  })

  it('every style has labels for all locales', () => {
    for (const style of FEATURED_STYLES) {
      for (const locale of locales) {
        expect(typeof style.label[locale]).toBe('string')
        expect(style.label[locale].length).toBeGreaterThan(0)
      }
    }
  })

  it('style ids match slug-format (lowercase, dashes, no leading/trailing dash)', () => {
    const slugRe = /^[a-z0-9]+(-[a-z0-9]+)*$/
    for (const style of FEATURED_STYLES) {
      expect(slugRe.test(style.id), `style.id "${style.id}" violates slug format`).toBe(true)
    }
  })
})

describe('FEATURED_STYLE_IDS', () => {
  it('mirrors FEATURED_STYLES.id-Liste', () => {
    expect(FEATURED_STYLE_IDS).toEqual(FEATURED_STYLES.map((s) => s.id))
  })
})

describe('DEFAULT_FEATURED_STYLE_ID', () => {
  it('is the first entry in FEATURED_STYLES', () => {
    expect(DEFAULT_FEATURED_STYLE_ID).toBe(FEATURED_STYLES[0].id)
  })

  it('is a valid id', () => {
    expect(isValidFeaturedStyleId(DEFAULT_FEATURED_STYLE_ID)).toBe(true)
  })
})

describe('getFeaturedStyle', () => {
  it('returns the matching style', () => {
    const first = FEATURED_STYLES[0]
    expect(getFeaturedStyle(first.id)).toEqual(first)
  })

  it('returns null for unknown id', () => {
    expect(getFeaturedStyle('does-not-exist')).toBeNull()
  })

  it('returns null for empty string', () => {
    expect(getFeaturedStyle('')).toBeNull()
  })
})

describe('isValidFeaturedStyleId', () => {
  it('accepts every defined id', () => {
    for (const style of FEATURED_STYLES) {
      expect(isValidFeaturedStyleId(style.id)).toBe(true)
    }
  })

  it('rejects unknown ids', () => {
    expect(isValidFeaturedStyleId('not-a-style')).toBe(false)
    expect(isValidFeaturedStyleId('')).toBe(false)
  })
})

describe('getFeaturedStyleLabel', () => {
  it('returns the locale-specific label when defined', () => {
    const style = FEATURED_STYLES[0]
    expect(getFeaturedStyleLabel(style, 'en')).toBe(style.label.en)
  })

  it('falls back to DE when locale label is missing (defensive)', () => {
    const style = {
      ...FEATURED_STYLES[0],
      label: {
        ...FEATURED_STYLES[0].label,
        // simulate missing fr by setting it to undefined via cast
      },
    }
    // All FEATURED_STYLES entries have all 5 locales by spec, so this test
    // just validates the fallback contract on a synthetic missing entry.
    const synthetic = { ...style, label: { ...style.label, fr: undefined as unknown as string } }
    expect(getFeaturedStyleLabel(synthetic, 'fr')).toBe(style.label.de)
  })
})
