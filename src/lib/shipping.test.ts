import { describe, expect, it, afterEach } from 'vitest'
import {
  domesticMethodFor,
  quoteShipping,
  zoneForCountry,
  DOMESTIC_FREE_SHIPPING_CENTS,
  LETTER_MAX_A4_SHEETS,
  type ShippableItem,
} from './shipping'

/**
 * Die Zuordnung Warenkorb → Versandart ist reine Rechnung und entscheidet
 * darüber, ob eine Bestellung Geld bringt oder kostet. Ein A3-Bogen, der
 * fälschlich als Brief durchgeht, ist ein Bogen, der so nicht versendbar
 * ist — Großbrief endet bei 353 mm, A3 misst 420 mm.
 */

function dtf(format: string, quantity = 1): ShippableItem {
  return { productId: 'dtf', format, quantity }
}
function poster(format: string, withFrame = false): ShippableItem {
  return { productId: 'poster', format, withFrame, quantity: 1 }
}
const download: ShippableItem = { productId: 'download', format: 'a4', quantity: 1 }

afterEach(() => {
  delete process.env.NEXT_PUBLIC_SHIPPING_ENABLED
})

describe('zoneForCountry', () => {
  it('erkennt Deutschland als Inland', () => {
    expect(zoneForCountry('DE')).toBe('domestic')
  })

  it('erkennt EU-Länder', () => {
    expect(zoneForCountry('AT')).toBe('eu')
    expect(zoneForCountry('FR')).toBe('eu')
  })

  it('liefert null für nicht belieferte Länder', () => {
    // Die Schweiz war früher freigeschaltet und ist bewusst raus.
    expect(zoneForCountry('CH')).toBeNull()
    expect(zoneForCountry('US')).toBeNull()
  })
})

describe('domesticMethodFor — Versandart nach Format', () => {
  it('A4-Bögen gehen als Brief', () => {
    expect(domesticMethodFor([dtf('a4', 3)])).toBe('letter')
  })

  it('A3 geht nie als Brief', () => {
    // Großbrief endet bei 353 mm, A3 ist 420 mm lang.
    expect(domesticMethodFor([dtf('a3')])).toBe('small_parcel')
  })

  it('40x50 geht als Paket', () => {
    expect(domesticMethodFor([dtf('40x50')])).toBe('parcel')
  })

  it('kippt bei zu vielen A4-Bögen auf Kleinpaket', () => {
    expect(domesticMethodFor([dtf('a4', LETTER_MAX_A4_SHEETS)])).toBe('letter')
    expect(domesticMethodFor([dtf('a4', LETTER_MAX_A4_SHEETS + 1)])).toBe('small_parcel')
  })

  it('zählt A4-Bögen über mehrere Positionen zusammen', () => {
    // Zwei Positionen mit je sechs Bögen sind zwölf in EINER Sendung.
    expect(domesticMethodFor([dtf('a4', 6), dtf('a4', 6)])).toBe('small_parcel')
  })

  it('Poster ohne Rahmen als Kleinpaket, mit Rahmen als Paket', () => {
    expect(domesticMethodFor([poster('a4')])).toBe('small_parcel')
    expect(domesticMethodFor([poster('a4', true)])).toBe('parcel')
  })

  it('bei gemischtem Warenkorb gewinnt die teuerste Art', () => {
    expect(domesticMethodFor([dtf('a4'), dtf('a3')])).toBe('small_parcel')
    expect(domesticMethodFor([dtf('a4'), dtf('40x50')])).toBe('parcel')
    expect(domesticMethodFor([dtf('a3'), poster('a2', true)])).toBe('parcel')
  })

  it('ignoriert Downloads', () => {
    expect(domesticMethodFor([download, dtf('a4')])).toBe('letter')
  })

  it('liefert null bei reinem Download-Warenkorb', () => {
    expect(domesticMethodFor([download])).toBeNull()
  })
})

describe('quoteShipping — Inland', () => {
  it('berechnet den Brief-Tarif', () => {
    const q = quoteShipping([dtf('a4')], 'DE', 499)!
    expect(q.method).toBe('letter')
    expect(q.cents).toBe(250)
    expect(q.freeReason).toBeNull()
  })

  it('nennt den Fehlbetrag bis zum kostenfreien Versand', () => {
    const q = quoteShipping([dtf('a4')], 'DE', 1000)!
    expect(q.remainingToFreeCents).toBe(DOMESTIC_FREE_SHIPPING_CENTS - 1000)
  })

  it('liefert ab der Schwelle kostenfrei', () => {
    const q = quoteShipping([dtf('40x50')], 'DE', DOMESTIC_FREE_SHIPPING_CENTS)!
    expect(q.cents).toBe(0)
    expect(q.freeReason).toBe('threshold')
  })
})

describe('quoteShipping — EU-Ausland', () => {
  it('berechnet unabhängig vom Inhalt den Paket-Tarif', () => {
    expect(quoteShipping([dtf('a4')], 'FR', 499)!.cents).toBe(999)
    expect(quoteShipping([dtf('40x50')], 'AT', 499)!.method).toBe('parcel')
  })

  it('kennt keinen Freibetrag', () => {
    // Sonst lägen ab der Schwelle die vollen Portokosten bei uns.
    const q = quoteShipping([dtf('a4')], 'IT', 20000)!
    expect(q.cents).toBe(999)
    expect(q.remainingToFreeCents).toBeNull()
  })
})

describe('quoteShipping — Sonderfälle', () => {
  it('verlangt bei reinem Download nichts', () => {
    const q = quoteShipping([download], 'DE', 999)!
    expect(q.method).toBeNull()
    expect(q.cents).toBe(0)
    expect(q.freeReason).toBe('digital_only')
  })

  it('verlangt bei Download plus physischem Produkt Versand', () => {
    expect(quoteShipping([download, dtf('a4')], 'DE', 999)!.cents).toBe(250)
  })

  it('liefert null für nicht belieferte Länder', () => {
    expect(quoteShipping([dtf('a4')], 'CH', 499)).toBeNull()
  })

  it('berechnet nichts, wenn der Schalter aus ist', () => {
    process.env.NEXT_PUBLIC_SHIPPING_ENABLED = 'false'
    const q = quoteShipping([dtf('40x50')], 'FR', 499)!
    expect(q.cents).toBe(0)
    expect(q.freeReason).toBe('disabled')
  })

  it('nutzt den Warenkorbwert VOR Rabatt für die Schwelle', () => {
    // Wird der Wert nach Rabatt übergeben, finanziert ein Gutschein
    // zusätzlich den Versand. Der Aufrufer muss den Bruttowert liefern —
    // dieser Test hält die Erwartung fest.
    const beforeDiscount = DOMESTIC_FREE_SHIPPING_CENTS
    expect(quoteShipping([poster('a2')], 'DE', beforeDiscount)!.cents).toBe(0)
    expect(quoteShipping([poster('a2')], 'DE', beforeDiscount - 1)!.cents).toBe(399)
  })
})
