/**
 * PROJ-49: Personalization-Parser unit tests.
 *
 * Covers realistic buyer-input variants from Etsy:
 *   - Clean German + English labels
 *   - Different separators (:, =, em-dash, ' - ')
 *   - Smart quotes, extra whitespace, mobile-paste noise
 *   - Positional fallback (buyer drops labels entirely)
 *   - Required-field failure → manual_review
 *   - Regex validation
 *   - Diacritics + case insensitivity
 */

import { describe, it, expect } from 'vitest'
import {
  parsePersonalization,
  type PersonalizationSchema,
} from './personalization-parser'

const cityPosterSchema: PersonalizationSchema = [
  { key: 'ort', label: 'Ort', labelEn: 'Location', required: true, fallbacks: ['stadt', 'city'], positional: true },
  { key: 'titel', label: 'Titel', labelEn: 'Title', required: true, fallbacks: ['headline'], positional: true },
  { key: 'untertitel', label: 'Untertitel', labelEn: 'Subtitle', required: false, fallbacks: ['subtitle', 'untertext'], positional: true },
  { key: 'koordinaten', label: 'Koordinaten', labelEn: 'Coordinates', required: false, fallbacks: ['coords'], positional: false, regex: '^-?\\d+\\.\\d+,\\s*-?\\d+\\.\\d+$' },
]

describe('parsePersonalization', () => {
  it('parses clean German labelled input', () => {
    const input = `Ort: Berlin, Deutschland
Titel: Unser Zuhause
Untertitel: Seit 2018`
    const r = parsePersonalization(input, cityPosterSchema)
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.parsed.ort).toBe('Berlin, Deutschland')
      expect(r.parsed.titel).toBe('Unser Zuhause')
      expect(r.parsed.untertitel).toBe('Seit 2018')
      expect(r.matchedAs.ort.mode).toBe('labelled')
    }
  })

  it('parses English labels via labelEn', () => {
    const input = `Location: Paris
Title: Our Honeymoon`
    const r = parsePersonalization(input, cityPosterSchema)
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.parsed.ort).toBe('Paris')
      expect(r.parsed.titel).toBe('Our Honeymoon')
    }
  })

  it('parses fallback aliases ("city", "headline")', () => {
    const input = `city: Hamburg
headline: Heimat`
    const r = parsePersonalization(input, cityPosterSchema)
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.parsed.ort).toBe('Hamburg')
      expect(r.parsed.titel).toBe('Heimat')
    }
  })

  it('handles separators = and em-dash', () => {
    const input = `Ort = München
Titel — Bayern`
    const r = parsePersonalization(input, cityPosterSchema)
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.parsed.ort).toBe('München')
      expect(r.parsed.titel).toBe('Bayern')
    }
  })

  it('does NOT split on bare hyphen (so addresses are safe)', () => {
    const input = `Ort: Berlin-Wedding
Titel: Heimat`
    const r = parsePersonalization(input, cityPosterSchema)
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.parsed.ort).toBe('Berlin-Wedding')
    }
  })

  it('splits on " - " (space-dash-space)', () => {
    const input = `Ort - Hamburg
Titel - Hafen`
    const r = parsePersonalization(input, cityPosterSchema)
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.parsed.ort).toBe('Hamburg')
      expect(r.parsed.titel).toBe('Hafen')
    }
  })

  it('is case + diacritics insensitive on labels', () => {
    const input = `ORT: Köln
TíTeL: Dom`
    const r = parsePersonalization(input, cityPosterSchema)
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.parsed.ort).toBe('Köln')
      expect(r.parsed.titel).toBe('Dom')
    }
  })

  it('trims smart quotes and whitespace', () => {
    const input = `  Ort:   Paris   \n Titel:  "Mein Liebling"  `
    const r = parsePersonalization(input, cityPosterSchema)
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.parsed.ort).toBe('Paris')
      expect(r.parsed.titel).toBe('"Mein Liebling"')
    }
  })

  it('positional fallback when buyer omits labels', () => {
    const input = `Berlin
Unser Zuhause`
    const r = parsePersonalization(input, cityPosterSchema)
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.parsed.ort).toBe('Berlin')
      expect(r.parsed.titel).toBe('Unser Zuhause')
      expect(r.matchedAs.ort.mode).toBe('positional')
    }
  })

  it('does NOT positional-fill non-positional fields (coordinates)', () => {
    // Buyer types 3 unlabelled lines. Positional fill goes ort → titel → untertitel.
    // Koordinaten stays empty because positional:false.
    const input = `Berlin\nUnser Zuhause\n52.5,13.4`
    const r = parsePersonalization(input, cityPosterSchema)
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.parsed.ort).toBe('Berlin')
      expect(r.parsed.titel).toBe('Unser Zuhause')
      expect(r.parsed.untertitel).toBe('52.5,13.4')
      // koordinaten is positional:false, so even with leftover unlabelled
      // content the parser never auto-fills it.
      expect(r.parsed.koordinaten).toBeUndefined()
    }
  })

  it('fails with missing-required when no labels and not enough positional lines', () => {
    const input = `Berlin`
    const r = parsePersonalization(input, cityPosterSchema)
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.missing).toContain('titel')
      expect(r.parsed.ort).toBe('Berlin')
    }
  })

  it('fails with missing-required on empty input', () => {
    const r = parsePersonalization('', cityPosterSchema)
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.missing).toEqual(expect.arrayContaining(['ort', 'titel']))
    }
  })

  it('validates regex on coordinates', () => {
    const input = `Ort: Berlin
Titel: Hauptstadt
Koordinaten: nicht eine Zahl`
    const r = parsePersonalization(input, cityPosterSchema)
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.invalid.some((i) => i.key === 'koordinaten')).toBe(true)
    }
  })

  it('accepts valid coordinates', () => {
    const input = `Ort: Berlin
Titel: Hauptstadt
Koordinaten: 52.5200, 13.4050`
    const r = parsePersonalization(input, cityPosterSchema)
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.parsed.koordinaten).toBe('52.5200, 13.4050')
    }
  })

  it('treats duplicate field lines: first occurrence wins', () => {
    const input = `Ort: Berlin
Ort: München
Titel: Stadt`
    const r = parsePersonalization(input, cityPosterSchema)
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.parsed.ort).toBe('Berlin')
      expect(r.unmatchedLines).toContain('Ort: München')
    }
  })

  it('captures unmatched labelled lines without blocking', () => {
    const input = `Ort: Berlin
Titel: Hauptstadt
ZufällesFeld: irgendwas`
    const r = parsePersonalization(input, cityPosterSchema)
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.unmatchedLines).toContain('ZufällesFeld: irgendwas')
    }
  })

  it('handles null + undefined input', () => {
    const r1 = parsePersonalization(null, cityPosterSchema)
    const r2 = parsePersonalization(undefined, cityPosterSchema)
    expect(r1.ok).toBe(false)
    expect(r2.ok).toBe(false)
  })

  it('returns ok for empty schema regardless of input', () => {
    const r = parsePersonalization('anything', [])
    expect(r.ok).toBe(true)
  })

  describe('case-insensitive regex via regexFlags', () => {
    const couplePosterSchema: PersonalizationSchema = [
      { key: 'ort', label: 'Ort', labelEn: 'Location', required: true, fallbacks: ['city'], positional: true },
      { key: 'titel', label: 'Titel', labelEn: 'Title', required: true, fallbacks: [], positional: true },
      { key: 'untertitel', label: 'Untertitel', labelEn: 'Subtitle', required: false, fallbacks: ['subtitle'], positional: true },
      {
        key: 'farbe',
        label: 'Farbe/Stil',
        labelEn: 'Color/Style',
        required: true,
        fallbacks: ['farbe', 'stil', 'color', 'style', 'palette'],
        positional: true,
        regex: '^(?:original|dark|pink|navy)$',
        regexFlags: 'i',
      },
    ]

    it('accepts palette name regardless of case', () => {
      for (const value of ['Pink', 'pink', 'PINK', 'pInK']) {
        const r = parsePersonalization(
          `Ort: Berlin\nTitel: Wir beide\nFarbe: ${value}`,
          couplePosterSchema,
        )
        expect(r.ok, `failed for "${value}"`).toBe(true)
      }
    })

    it('rejects unknown palette names', () => {
      const r = parsePersonalization(
        'Ort: Berlin\nTitel: Wir beide\nFarbe: Terracotta',
        couplePosterSchema,
      )
      expect(r.ok).toBe(false)
      if (!r.ok) {
        expect(r.invalid.some((i) => i.key === 'farbe')).toBe(true)
      }
    })

    it('accepts palette via positional fallback', () => {
      const r = parsePersonalization('Berlin\nWir beide\nSeit 2018\nNavy', couplePosterSchema)
      expect(r.ok).toBe(true)
      if (r.ok) {
        expect(r.parsed.farbe).toBe('Navy')
      }
    })

    it('accepts EN label fallback', () => {
      const r = parsePersonalization(
        'Location: Berlin\nTitle: Wir beide\nColor: Dark',
        couplePosterSchema,
      )
      expect(r.ok).toBe(true)
      if (r.ok) {
        expect(r.parsed.farbe).toBe('Dark')
      }
    })
  })
})
