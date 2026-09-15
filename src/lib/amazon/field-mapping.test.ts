/**
 * PROJ-31: Zuordnung Anpassungsfeld → Textblock des Presets.
 *
 * Der Fehler, den diese Tests festhalten sollen, ist ein stiller: ein Text
 * landet auf dem falschen Block oder gar nicht, und niemand merkt es, bis
 * das Poster gedruckt ist. Deshalb prüfen sie beides — dass das Richtige
 * passiert, und dass ein ungepflegter Fall als Mangel gemeldet wird statt
 * geraten zu werden.
 */

import { describe, it, expect } from 'vitest'
import { PersonalizationSchemaSchema } from '@/lib/etsy/personalization-parser'
import {
  readPresetBlocks,
  checkMapping,
  planBlockActions,
  suggestTargets,
  blockLabel,
  textFields,
  type PresetBlock,
} from './field-mapping'

/** Die Blöcke des echten Presets AMZ_LQ-30001-09. */
const BLOCKS: PresetBlock[] = [
  { id: 'block-title', isCoordinates: false, text: 'Wo alles begann…', label: null },
  { id: 'block-1789496636322', isCoordinates: false, text: 'Maria & Alex', label: null },
  { id: 'block-coords', isCoordinates: true, text: '', label: 'Ort & Koordinaten' },
]

const schema = (fields: unknown[]) => PersonalizationSchemaSchema.parse(fields)

/** Die gepflegte Zuordnung für LQ-30001-09. */
const GEPFLEGT = schema([
  { key: 'location', label: 'Adresse für die Karte', required: true },
  { key: 'title', label: 'Titel', target: 'block-title', whenEmpty: 'preset' },
  { key: 'names', label: 'Namen', target: 'block-1789496636322', whenEmpty: 'preset' },
  { key: 'subline', label: 'Stadt und Koordinaten', target: 'block-coords', whenEmpty: 'auto' },
  { key: 'format', label: 'Größe des Posters' },
  { key: 'frame', label: 'Bilderrahmen A4' },
])

describe('readPresetBlocks', () => {
  it('liest Kennung, Koordinatenflag und Preset-Text', () => {
    const blocks = readPresetBlocks({
      textBlocks: [
        { id: 'block-title', text: 'Hallo', isCoordinates: false },
        { id: 'block-coords', text: '', isCoordinates: true, label: 'Ort & Koordinaten' },
      ],
    })
    expect(blocks).toEqual([
      { id: 'block-title', isCoordinates: false, text: 'Hallo', label: null },
      { id: 'block-coords', isCoordinates: true, text: '', label: 'Ort & Koordinaten' },
    ])
  })

  it('gibt eine leere Liste zurück, statt an unerwarteter Form zu scheitern', () => {
    expect(readPresetBlocks(null)).toEqual([])
    expect(readPresetBlocks({})).toEqual([])
    expect(readPresetBlocks({ textBlocks: 'kaputt' })).toEqual([])
    expect(readPresetBlocks({ textBlocks: [null, 42, { text: 'ohne id' }] })).toEqual([])
  })
})

describe('textFields', () => {
  it('lässt Ort, Koordinaten, Format und Rahmen aus — die füllen keinen Textblock', () => {
    expect(textFields(GEPFLEGT).map((f) => f.key)).toEqual(['title', 'names', 'subline'])
  })
})

describe('checkMapping', () => {
  it('meldet nichts, wenn jedes Textfeld ein vorhandenes Ziel hat', () => {
    expect(checkMapping(GEPFLEGT, BLOCKS)).toEqual([])
  })

  it('meldet ein Textfeld ohne Ziel', () => {
    const ohne = schema([
      { key: 'title', label: 'Titel', target: 'block-title' },
      { key: 'names', label: 'Namen' },
    ])
    expect(checkMapping(ohne, BLOCKS)).toEqual([
      { key: 'names', label: 'Namen', kind: 'ohne_ziel' },
    ])
  })

  it('meldet ein Ziel, das es im Preset nicht mehr gibt', () => {
    const verwaist = schema([{ key: 'title', label: 'Titel', target: 'block-geloescht' }])
    expect(checkMapping(verwaist, BLOCKS)).toEqual([
      { key: 'title', label: 'Titel', kind: 'ziel_fehlt', target: 'block-geloescht' },
    ])
  })

  it('beanstandet ein fehlendes Ziel bei Ort, Format und Rahmen nicht', () => {
    const nurReserviert = schema([
      { key: 'location', label: 'Adresse für die Karte' },
      { key: 'format', label: 'Größe des Posters' },
      { key: 'frame', label: 'Bilderrahmen A4' },
      { key: 'coords', label: 'Koordinaten' },
    ])
    expect(checkMapping(nurReserviert, BLOCKS)).toEqual([])
  })
})

describe('planBlockActions', () => {
  const hints = [
    { fontFamily: 'Cathalia', colorHex: '#000000', textKeys: ['title'] },
    { fontFamily: 'Caviar Dreams', colorHex: '#888888', textKeys: ['names', 'subline'] },
  ]

  it('schreibt jeden Text auf seinen zugeordneten Block, nicht der Reihe nach', () => {
    const actions = planBlockActions(
      GEPFLEGT,
      { title: 'Unser Tag', names: 'Maria & Alex' },
      BLOCKS,
      hints,
    )
    expect(actions).toContainEqual({
      kind: 'text',
      target: 'block-title',
      value: 'Unser Tag',
      fontFamily: 'Cathalia',
      color: '#000000',
    })
    expect(actions).toContainEqual({
      kind: 'text',
      target: 'block-1789496636322',
      value: 'Maria & Alex',
      fontFamily: 'Caviar Dreams',
      color: '#888888',
    })
  })

  it('lässt den Koordinatenblock automatisch, wenn der Käufer das Feld leer lässt', () => {
    const actions = planBlockActions(GEPFLEGT, { title: 'Unser Tag' }, BLOCKS, [])
    expect(actions).toContainEqual({ kind: 'auto', target: 'block-coords' })
  })

  it('ersetzt den Koordinatenblock durch den Freitext, wenn der Käufer ihn ausfüllt', () => {
    const actions = planBlockActions(GEPFLEGT, { subline: 'Dort, wo wir uns trauten' }, BLOCKS, [])
    expect(actions).toContainEqual({
      kind: 'text',
      target: 'block-coords',
      value: 'Dort, wo wir uns trauten',
      fontFamily: null,
      color: null,
    })
    expect(actions).not.toContainEqual({ kind: 'auto', target: 'block-coords' })
  })

  it('behandelt reine Leerzeichen wie eine leere Eingabe', () => {
    const actions = planBlockActions(GEPFLEGT, { subline: '   ' }, BLOCKS, [])
    expect(actions).toContainEqual({ kind: 'auto', target: 'block-coords' })
  })

  it('lässt den Preset-Text stehen, wenn nichts anderes gepflegt ist', () => {
    const actions = planBlockActions(GEPFLEGT, {}, BLOCKS, [])
    const ziele = actions.map((a) => a.target)
    expect(ziele).not.toContain('block-title')
    expect(ziele).not.toContain('block-1789496636322')
  })

  it('leert einen Block, wenn das so gepflegt ist', () => {
    const leeren = schema([
      { key: 'title', label: 'Titel', target: 'block-title', whenEmpty: 'leer' },
    ])
    expect(planBlockActions(leeren, {}, BLOCKS, [])).toEqual([
      { kind: 'leer', target: 'block-title' },
    ])
  })

  it('befüllt nichts für ein Feld ohne Ziel — es wird nicht ersatzweise verteilt', () => {
    const ohne = schema([{ key: 'title', label: 'Titel' }])
    expect(planBlockActions(ohne, { title: 'Unser Tag' }, BLOCKS, [])).toEqual([])
  })

  it('befüllt nichts, wenn das Ziel im Preset fehlt', () => {
    const verwaist = schema([{ key: 'title', label: 'Titel', target: 'block-geloescht' }])
    expect(planBlockActions(verwaist, { title: 'Unser Tag' }, BLOCKS, [])).toEqual([])
  })
})

describe('blockLabel', () => {
  it('nimmt den Preset-Text, weil der Betreiber den auf dem Poster sieht', () => {
    expect(blockLabel(BLOCKS[0])).toBe('Wo alles begann…')
  })

  it('fällt bei einem leeren Koordinatenblock auf dessen Beschriftung zurück', () => {
    expect(blockLabel(BLOCKS[2])).toBe('Ort & Koordinaten')
  })

  it('kürzt sehr lange Texte, statt die Auswahl zu sprengen', () => {
    const lang = { id: 'b', isCoordinates: false, text: 'x'.repeat(80), label: null }
    expect(blockLabel(lang)).toHaveLength(41)
    expect(blockLabel(lang).endsWith('…')).toBe(true)
  })
})

describe('suggestTargets', () => {
  const ungepflegt = schema([
    { key: 'location', label: 'Adresse für die Karte' },
    { key: 'title', label: 'Wo alles begann' },
    { key: 'names', label: 'Namen' },
    { key: 'subline', label: 'Stadt und Koordinaten' },
    { key: 'format', label: 'Größe des Posters' },
  ])

  it('gibt dem Koordinatenfeld den Koordinatenblock — samt Regel „automatisch"', () => {
    const v = suggestTargets(ungepflegt, BLOCKS)
    expect(v).toContainEqual({
      key: 'subline',
      target: 'block-coords',
      whenEmpty: 'auto',
      reason: 'koordinaten',
    })
  })

  it('erkennt einander enthaltende Beschriftungen', () => {
    const v = suggestTargets(ungepflegt, BLOCKS)
    const titel = v.find((s) => s.key === 'title')
    expect(titel).toMatchObject({ target: 'block-title', reason: 'beschriftung' })
  })

  it('weist geratene Vorschläge als solche aus', () => {
    const v = suggestTargets(ungepflegt, BLOCKS)
    const namen = v.find((s) => s.key === 'names')
    expect(namen).toMatchObject({ target: 'block-1789496636322', reason: 'reihenfolge' })
  })

  it('schlägt nichts für bereits gepflegte Felder vor', () => {
    expect(suggestTargets(GEPFLEGT, BLOCKS)).toEqual([])
  })

  it('belegt keinen Block doppelt', () => {
    const v = suggestTargets(ungepflegt, BLOCKS)
    expect(new Set(v.map((s) => s.target)).size).toBe(v.length)
  })

  it('schlägt nur so viel vor, wie es Blöcke gibt', () => {
    const vieleFelder = schema([
      { key: 'a', label: 'Eins' },
      { key: 'b', label: 'Zwei' },
      { key: 'c', label: 'Drei' },
      { key: 'd', label: 'Vier' },
    ])
    expect(suggestTargets(vieleFelder, BLOCKS).length).toBe(BLOCKS.length)
  })

  it('beachtet ein schon belegtes Ziel und vergibt es nicht erneut', () => {
    const halb = schema([
      { key: 'title', label: 'Titel', target: 'block-title' },
      { key: 'names', label: 'Namen' },
    ])
    const v = suggestTargets(halb, BLOCKS)
    expect(v.map((s) => s.target)).not.toContain('block-title')
  })
})
