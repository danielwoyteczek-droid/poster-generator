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
