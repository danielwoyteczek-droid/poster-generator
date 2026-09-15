/**
 * PROJ-31: Auswertung der Auswahlfelder einer Amazon-Bestellung.
 * Format und Rahmen bestimmen, was gedruckt und was verpackt wird —
 * ein Fehler hier kostet Material oder einen Nachversand.
 */

import { describe, it, expect } from 'vitest'
import { parseFormat, parseFrame, parseCoords, schemaOrDefault, LQ_DEFAULT_SCHEMA } from './sku-schema'

describe('parseFormat', () => {
  it('erkennt die gängigen Schreibweisen', () => {
    expect(parseFormat('DIN A4')).toBe('a4')
    expect(parseFormat('din a3')).toBe('a3')
    expect(parseFormat('A2')).toBe('a2')
    expect(parseFormat('DIN-A4')).toBe('a4')
  })

  it('gibt null zurück, statt zu raten', () => {
    expect(parseFormat(null)).toBeNull()
    expect(parseFormat('')).toBeNull()
    expect(parseFormat('Sondergröße')).toBeNull()
  })
})

describe('parseFrame', () => {
  it('erkennt einen gewählten Rahmen samt Farbe', () => {
    expect(parseFrame('Weißer Rahmen')).toEqual({ withFrame: true, colorLabel: 'Weißer Rahmen' })
    expect(parseFrame('Schwarzer Rahmen')).toEqual({ withFrame: true, colorLabel: 'Schwarzer Rahmen' })
  })

  it('erkennt die Abwahl', () => {
    expect(parseFrame('Ohne Rahmen').withFrame).toBe(false)
    expect(parseFrame('Kein Rahmen').withFrame).toBe(false)
  })

  it('bleibt im Zweifel ohne Rahmen', () => {
    // Einer zu wenig faellt auf und ist nachlieferbar. Einer zu viel kostet
    // Geld, und niemand meldet sich.
    expect(parseFrame(null).withFrame).toBe(false)
    expect(parseFrame('').withFrame).toBe(false)
    expect(parseFrame('Passepartout').withFrame).toBe(false)
  })
})

describe('parseCoords', () => {
  it('nimmt die Klammerschreibweise aus der Fixture', () => {
    expect(parseCoords('(52.5200000, 13.4050000)')).toEqual({ lat: 52.52, lng: 13.405 })
  })

  it('nimmt die Gradschreibweise', () => {
    expect(parseCoords('45.255574°N, 19.841893°E')).toEqual({ lat: 45.255574, lng: 19.841893 })
  })

  it('beachtet Süd und West', () => {
    expect(parseCoords('33.9249°S, 18.4241°W')).toEqual({ lat: -33.9249, lng: -18.4241 })
  })

  it('nimmt Komma als Dezimaltrenner', () => {
    expect(parseCoords('52,52; 13,405')).toEqual({ lat: 52.52, lng: 13.405 })
  })

  it('weist Unsinn ab, statt die Karte falsch zu zentrieren', () => {
    expect(parseCoords(null)).toBeNull()
    expect(parseCoords('keine Ahnung')).toBeNull()
    expect(parseCoords('999, 999')).toBeNull()
  })
})

describe('schemaOrDefault', () => {
  it('nimmt ein gepflegtes Schema', () => {
    const eigenes = [{ key: 'title', label: 'Überschrift', required: true, fallbacks: [], positional: true }]
    expect(schemaOrDefault(eigenes)[0].key).toBe('title')
    expect(schemaOrDefault(eigenes).length).toBe(1)
  })

  it('faellt auf den Standard zurueck, statt an einem Tippfehler zu scheitern', () => {
    expect(schemaOrDefault(null)).toBe(LQ_DEFAULT_SCHEMA)
    expect(schemaOrDefault([])).toBe(LQ_DEFAULT_SCHEMA)
    expect(schemaOrDefault({ kaputt: true })).toBe(LQ_DEFAULT_SCHEMA)
    expect(schemaOrDefault([{ ohneKey: 1 }])).toBe(LQ_DEFAULT_SCHEMA)
  })
})
