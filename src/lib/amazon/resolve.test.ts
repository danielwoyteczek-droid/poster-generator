import { describe, it, expect } from 'vitest'
import { applyCorrections, unknownFonts } from './resolve'
import { buildFontLibrary } from './fonts'
import { LQ_DEFAULT_SCHEMA } from './sku-schema'
import { finalizeParse } from '@/lib/etsy/personalization-parser'
import type { DesignHint } from './customization'

const schema = LQ_DEFAULT_SCHEMA

function hint(fontFamily: string | null): DesignHint {
  return { groupKey: 'g', fontFamily, fontUrl: null, colorName: null, colorHex: null, textKeys: ['title'] }
}

describe('applyCorrections', () => {
  it('lässt das Ergebnis unverändert, wenn nichts korrigiert ist', () => {
    const parse = finalizeParse({ location: 'Berlin' }, { location: { label: 'Adresse', mode: 'labelled' } }, [], schema)
    expect(applyCorrections(parse, {}, schema)).toBe(parse)
    expect(applyCorrections(parse, null, schema)).toBe(parse)
  })

  it('trägt ein fehlendes Pflichtfeld nach und holt die Position aus der Prüfung', () => {
    const parse = finalizeParse({ title: 'Unser Anfang' }, {}, [], schema)
    expect(parse.ok).toBe(false)

    const next = applyCorrections(parse, { location: 'Musterstadt' }, schema)
    expect(next.ok).toBe(true)
    expect(next.parsed).toEqual({ title: 'Unser Anfang', location: 'Musterstadt' })
  })

  it('überschreibt einen erkannten Wert und nimmt ihm die Amazon-Herkunft', () => {
    const parse = finalizeParse(
      { location: 'Berlin', names: 'Anna & Bne' },
      {
        location: { label: 'Adresse', mode: 'labelled' },
        names: { label: 'Namen', mode: 'labelled' },
      },
      [],
      schema,
    )
    const next = applyCorrections(parse, { names: 'Anna & Ben' }, schema)
    expect(next.parsed.names).toBe('Anna & Ben')
    expect(next.ok && next.matchedAs.names).toBeFalsy()
    expect(next.ok && next.matchedAs.location).toEqual({ label: 'Adresse', mode: 'labelled' })
  })

  it('prüft eine Korrektur gegen das Muster des Feldes', () => {
    const parse = finalizeParse({ location: 'Berlin' }, {}, [], schema)
    const next = applyCorrections(parse, { coords: 'irgendwo' }, schema)
    expect(next.ok).toBe(false)
    expect(!next.ok && next.invalid.map((i) => i.key)).toEqual(['coords'])
  })

  it('eine leere Korrektur auf einem Pflichtfeld lässt es fehlen', () => {
    const parse = finalizeParse({ location: 'Berlin' }, {}, [], schema)
    const next = applyCorrections(parse, { location: '' }, schema)
    expect(!next.ok && next.missing).toEqual(['location'])
  })

  it('behält die nicht zugeordneten Zeilen', () => {
    const parse = finalizeParse({}, {}, ['Extra: 1'], schema)
    expect(applyCorrections(parse, { location: 'X' }, schema).unmatchedLines).toEqual(['Extra: 1'])
  })
})

describe('unknownFonts', () => {
  const library = buildFontLibrary(['Adelia'])

  it('erkennt eingebaute Schriften auch in Amazons Schreibweise', () => {
    expect(unknownFonts([hint('Caviar Dreams'), hint('Cathalia')], library)).toEqual([])
  })

  it('erkennt hochgeladene Schriften unabhängig von Groß- und Kleinschreibung', () => {
    expect(unknownFonts([hint('adelia')], library)).toEqual([])
  })

  it('meldet eine unbekannte Schrift einmal, auch wenn sie mehrfach vorkommt', () => {
    expect(unknownFonts([hint('Comic Neue'), hint('Comic Neue'), hint(null)], library)).toEqual(['Comic Neue'])
  })
})
