/**
 * PROJ-31: Auswertung der Anpassungsdaten, geprüft an der anonymisierten
 * Fixture aus `docs/amazon-ingest/` — also an der Struktur einer echten
 * LabelQueen-Bestellung, nicht an einem ausgedachten Beispiel.
 */

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  flattenCustomization,
  matchAmazonFields,
  extractDesignHints,
} from './customization'
import { LQ_DEFAULT_SCHEMA } from './sku-schema'

const fixture = JSON.parse(
  readFileSync(
    join(process.cwd(), 'docs/amazon-ingest/fixture-ingest-beispiel.json'),
    'utf8',
  ),
)
const ITEM = fixture.items[0].customization_item

describe('flattenCustomization', () => {
  it('findet alle Käuferangaben im Baum', () => {
    const r = flattenCustomization(ITEM)
    expect(r.usedFallback).toBe(false)
    expect(r.unknownTypes).toEqual([])
    expect(r.surfaces).toEqual(['Heart'])

    const texts = r.fields.filter((f) => f.kind === 'text').map((f) => f.value)
    expect(texts).toEqual([
      'Musterstraße 1 12345 Musterstadt',
      '(52.5200000, 13.4050000)',
      'Unser Anfang',
      'Anna & Ben',
      'Für immer',
    ])

    const options = r.fields.filter((f) => f.kind === 'option').map((f) => f.value)
    expect(options).toEqual(['DIN A4', 'Weißer Rahmen'])
  })

  it('bindet Schrift und Farbe an ihren Textblock', () => {
    const r = flattenCustomization(ITEM)
    const fonts = r.fields.filter((f) => f.kind === 'font')
    const colors = r.fields.filter((f) => f.kind === 'color')

    // Zwei Schriften, zwei Farben — und beide Farbfelder heißen "Farbe".
    expect(fonts.length).toBe(2)
    expect(colors.length).toBe(2)
    expect(colors.every((c) => c.label === 'Farbe')).toBe(true)

    // Genau das ist der Punkt: unterschiedliche Blöcke, unterscheidbar.
    expect(new Set(colors.map((c) => c.groupKey)).size).toBe(2)
    expect(fonts[0].groupKey).not.toBe(fonts[1].groupKey)
  })

  it('trägt die Schriftdatei mit, auch bei selbst hochgeladener Schrift', () => {
    const r = flattenCustomization(ITEM)
    const fonts = r.fields.filter((f) => f.kind === 'font')
    expect(fonts.every((f) => f.meta?.fontUrl?.startsWith('https://'))).toBe(true)
  })

  it('kommt mit Unsinn klar, statt zu werfen', () => {
    expect(flattenCustomization(null).fields).toEqual([])
    expect(flattenCustomization('text').fields).toEqual([])
    expect(flattenCustomization({}).fields).toEqual([])
  })

  it('nutzt die flache Liste, wenn der Baum fehlt', () => {
    const ohneBaum = { ...ITEM }
    delete ohneBaum.customizationData
    const r = flattenCustomization(ohneBaum)
    expect(r.usedFallback).toBe(true)
    const texts = r.fields.filter((f) => f.kind === 'text').map((f) => f.value)
    expect(texts).toContain('Unser Anfang')
    expect(texts).toContain('Anna & Ben')
  })
})

describe('matchAmazonFields', () => {
  it('ordnet die Fixture vollständig zu', () => {
    const { fields } = flattenCustomization(ITEM)
    const r = matchAmazonFields(fields, LQ_DEFAULT_SCHEMA)

    expect(r.ok).toBe(true)
    expect(r.parsed).toEqual({
      location: 'Musterstraße 1 12345 Musterstadt',
      coords: '(52.5200000, 13.4050000)',
      title: 'Unser Anfang',
      names: 'Anna & Ben',
      subline: 'Für immer',
      format: 'DIN A4',
      frame: 'Weißer Rahmen',
    })
    expect(r.unmatchedLines).toEqual([])
  })

  it('greift auf den internen Feldnamen zurück, wenn die Beschriftung sich ändert', () => {
    const { fields } = flattenCustomization(ITEM)
    // Der Verkäufer formuliert die Kundenansicht um — Amazons `name` bleibt.
    const umbenannt = fields.map((f) =>
      f.label === 'Titel' ? { ...f, label: 'Deine Überschrift' } : f,
    )
    const r = matchAmazonFields(umbenannt, LQ_DEFAULT_SCHEMA)
    expect(r.parsed.title).toBe('Unser Anfang')
  })

  it('behält Werte mit Bindestrich — der Textumweg verlöre sie', () => {
    const { fields } = flattenCustomization(ITEM)
    const mitStrich = fields.map((f) =>
      f.label === 'Namen' ? { ...f, value: 'Anna - Ben' } : f,
    )
    const r = matchAmazonFields(mitStrich, LQ_DEFAULT_SCHEMA)
    expect(r.parsed.names).toBe('Anna - Ben')
  })

  it('meldet ein fehlendes Pflichtfeld statt es zu verschlucken', () => {
    const { fields } = flattenCustomization(ITEM)
    const ohneOrt = fields.filter((f) => f.label !== 'Adresse für die Karte')
    const r = matchAmazonFields(ohneOrt, LQ_DEFAULT_SCHEMA)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.missing).toContain('location')
  })

  it('listet unbekannte Felder auf, statt sie fallen zu lassen', () => {
    const { fields } = flattenCustomization(ITEM)
    const extra = [
      ...fields,
      { path: [], name: 'Gravur', label: 'Gravur', kind: 'text' as const, value: 'XYZ', groupKey: '' },
    ]
    const r = matchAmazonFields(extra, LQ_DEFAULT_SCHEMA)
    expect(r.unmatchedLines).toContain('Gravur: XYZ')
  })
})

describe('extractDesignHints', () => {
  it('trennt die Gestaltung von Titel und Namen', () => {
    const { fields } = flattenCustomization(ITEM)
    const r = matchAmazonFields(fields, LQ_DEFAULT_SCHEMA)
    const hints = extractDesignHints(fields, r)

    expect(hints.length).toBe(2)

    const titelBlock = hints.find((h) => h.textKeys.includes('title'))
    const namenBlock = hints.find((h) => h.textKeys.includes('names'))

    expect(titelBlock).toBeDefined()
    expect(namenBlock).toBeDefined()
    expect(titelBlock!.fontFamily).not.toBe(namenBlock!.fontFamily)
    expect(titelBlock!.colorHex).not.toBe(namenBlock!.colorHex)
    // Die Namenszeile und der Freitext darunter teilen sich einen Block.
    expect(namenBlock!.textKeys).toContain('subline')
  })
})
