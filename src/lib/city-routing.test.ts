import { describe, expect, it } from 'vitest'
import { CITY_URL_SEGMENT, CITY_SLUG_PREFIX, buildCityPagePath, suggestCitySlug } from './city-routing'
import { locales } from '@/i18n/config'

describe('CITY_URL_SEGMENT (PROJ-42)', () => {
  it('has an entry for every active locale', () => {
    for (const locale of locales) {
      expect(typeof CITY_URL_SEGMENT[locale]).toBe('string')
      expect(CITY_URL_SEGMENT[locale].length).toBeGreaterThan(0)
    }
  })

  it('uses URL-safe lowercase ascii + dashes', () => {
    const urlSafe = /^[a-z][a-z0-9-]*$/
    for (const locale of locales) {
      expect(urlSafe.test(CITY_URL_SEGMENT[locale])).toBe(true)
    }
  })

  it('DE uses "stadtkarte"', () => {
    expect(CITY_URL_SEGMENT.de).toBe('stadtkarte')
  })

  it('EN uses "city-map"', () => {
    expect(CITY_URL_SEGMENT.en).toBe('city-map')
  })
})

describe('CITY_SLUG_PREFIX', () => {
  it('has an entry for every active locale', () => {
    for (const locale of locales) {
      expect(typeof CITY_SLUG_PREFIX[locale]).toBe('string')
      expect(CITY_SLUG_PREFIX[locale].length).toBeGreaterThan(0)
    }
  })
})

describe('buildCityPagePath', () => {
  it('builds the DE pattern correctly', () => {
    expect(buildCityPagePath('de', 'stadtkarte-hamburg')).toBe('/de/stadtkarte/stadtkarte-hamburg')
  })

  it('builds the EN pattern correctly', () => {
    expect(buildCityPagePath('en', 'city-map-london')).toBe('/en/city-map/city-map-london')
  })

  it('builds the FR pattern correctly', () => {
    expect(buildCityPagePath('fr', 'carte-de-paris')).toBe('/fr/carte-de-ville/carte-de-paris')
  })

  it('builds the IT pattern correctly', () => {
    expect(buildCityPagePath('it', 'mappa-citta-roma')).toBe('/it/mappa-citta/mappa-citta-roma')
  })

  it('builds the ES pattern correctly', () => {
    expect(buildCityPagePath('es', 'mapa-ciudad-madrid')).toBe('/es/mapa-ciudad/mapa-ciudad-madrid')
  })

  it('returns paths with leading slash and no trailing slash', () => {
    const path = buildCityPagePath('de', 'irgendeine-stadt')
    expect(path.startsWith('/')).toBe(true)
    expect(path.endsWith('/')).toBe(false)
  })
})

describe('suggestCitySlug', () => {
  it('produces "stadtkarte-{city}" for DE', () => {
    expect(suggestCitySlug('de', 'hamburg')).toBe('stadtkarte-hamburg')
    expect(suggestCitySlug('de', 'frankfurt-am-main')).toBe('stadtkarte-frankfurt-am-main')
  })

  it('produces "city-map-{city}" for EN', () => {
    expect(suggestCitySlug('en', 'london')).toBe('city-map-london')
  })

  it('produces "carte-de-{city}" for FR', () => {
    expect(suggestCitySlug('fr', 'paris')).toBe('carte-de-paris')
  })

  it('returns slug-shaped output for every locale', () => {
    const slugRe = /^[a-z0-9]+(-[a-z0-9]+)*$/
    for (const locale of locales) {
      const out = suggestCitySlug(locale, 'hamburg')
      expect(slugRe.test(out)).toBe(true)
    }
  })
})
