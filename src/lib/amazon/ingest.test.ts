/**
 * PROJ-31: Tests fuer die reinen Bausteine der Ingest-Logik.
 *
 * Der Rest von `ingest.ts` haengt an Supabase und wird per curl gegen die
 * echte Route geprueft. Hier stehen die drei Stellen, an denen ein stiller
 * Fehler teuer waere:
 *
 *   - unwrapCustomizationItem: zwei Formen desselben Inhalts
 *   - diffAmazonFields:        entscheidet ueber Dublette vs. Aktualisierung
 *   - sanitizeFilename:        Dateiname aus fremder Quelle wird zum Pfad
 */

import { describe, it, expect } from 'vitest'
import {
  unwrapCustomizationItem,
  diffAmazonFields,
  sanitizeFilename,
} from './ingest'

const INNER = {
  orderId: '111-2222222-3333333',
  orderItemId: '99999999999999',
  asin: 'B0DZ161YB3',
  customizationData: { type: 'PageContainerCustomization', children: [] },
  customizationInfo: { 'version3.0': { surfaces: [] } },
}

describe('unwrapCustomizationItem', () => {
  it('packt den Knoten aus der JTL-Antwort-Huelle aus', () => {
    const wrapped = {
      status: 200,
      successful: true,
      data: {
        pageUrl: 'https://amzn.eu/x',
        orderCustomizationData: [INNER],
        archiveUrl: 'https://zme-caps.amazon.com/t/x',
      },
      request_id: 'abc',
    }
    expect(unwrapCustomizationItem(wrapped)).toEqual(INNER)
  })

  it('nimmt die ZIP-Form unveraendert, dort liegt der Knoten schon oben', () => {
    expect(unwrapCustomizationItem(INNER)).toEqual(INNER)
  })

  it('erkennt die ZIP-Form auch an customizationInfo allein', () => {
    const onlyInfo = { orderId: 'x', customizationInfo: { 'version3.0': { surfaces: [] } } }
    expect(unwrapCustomizationItem(onlyInfo)).toEqual(onlyInfo)
  })

  it('gibt null zurueck, wenn nichts Brauchbares drinsteht', () => {
    expect(unwrapCustomizationItem(null)).toBeNull()
    expect(unwrapCustomizationItem('text')).toBeNull()
    expect(unwrapCustomizationItem({ status: 500, successful: false })).toBeNull()
    expect(unwrapCustomizationItem({ data: { orderCustomizationData: [] } })).toBeNull()
  })
})

describe('diffAmazonFields', () => {
  const base = {
    position: 1,
    sku: 'LQ-30001-09',
    asin: 'B0DZ161YB3',
    marketplace_id: 'A1PA6795UKMFR9',
    purchase_date: '2026-09-14T20:38:38.000Z',
    quantity: 1,
    order_state: 'open',
    jtl_position_id: 42818,
    customization_source: 'jtl_column',
    preview_path: 'a/b/p.jpg',
    svg_path: 'a/b/d.svg',
    xml_path: 'a/b/d.xml',
    archive_url: 'https://zme-caps.amazon.com/t/x',
    page_url: 'https://amzn.eu/x',
    latest_ship_at: null,
  }

  it('meldet nichts, wenn dieselbe Position erneut kommt', () => {
    expect(diffAmazonFields(base, { ...base })).toEqual([])
  })

  it('erkennt einen Storno — das ist der Grund fuer das Rueckschaufenster', () => {
    expect(diffAmazonFields(base, { ...base, order_state: 'cancelled' })).toEqual([
      'order_state',
    ])
  })

  it('stoert sich nicht an Postgres-Zeitstempelformaten', () => {
    // So liest Postgres zurueck, so schickt der Abholer.
    const fromDb = { ...base, purchase_date: '2026-09-14 20:38:38+00' }
    expect(diffAmazonFields(fromDb, base)).toEqual([])
  })

  it('nimmt ein nachgereichtes Asset als Aenderung auf', () => {
    const withoutPreview = { ...base, preview_path: null }
    expect(diffAmazonFields(withoutPreview, base)).toEqual(['preview_path'])
  })

  it('loescht ein vorhandenes Asset nicht, wenn Amazons ZIP gerade klemmt', () => {
    // Das ist der gefaehrliche Fall: waere das eine Aenderung, verloeren wir
    // das Vorschaubild bei jedem Lauf, in dem Amazon nicht liefert.
    expect(diffAmazonFields(base, { ...base, preview_path: null })).toEqual([])
    expect(diffAmazonFields(base, { ...base, svg_path: null, xml_path: null })).toEqual([])
  })

  it('sieht Queue-Felder gar nicht an', () => {
    const printed = { ...base, queue_status: 'gedruckt', printed_at: '2026-09-15T00:00:00Z' }
    expect(diffAmazonFields(printed, { ...base })).toEqual([])
  })

  it('meldet mehrere geaenderte Felder', () => {
    const changed = { ...base, order_state: 'shipped', quantity: 2 }
    expect(diffAmazonFields(base, changed).sort()).toEqual(['order_state', 'quantity'])
  })
})

describe('sanitizeFilename', () => {
  it('behaelt einen normalen Amazon-Dateinamen', () => {
    expect(sanitizeFilename('0c0947e4-aaaa-bbbb.svg', 'x.svg')).toBe('0c0947e4-aaaa-bbbb.svg')
  })

  it('schneidet Pfadanteile ab — der Name wird zu einem Storage-Pfad', () => {
    expect(sanitizeFilename('../../../etc/passwd.jpg', 'x.jpg')).toBe('passwd.jpg')
    expect(sanitizeFilename('..\\..\\windows\\system32\\x.jpg', 'x.jpg')).toBe('x.jpg')
  })

  it('laesst keinen Namen zu, der nur aus Punkten besteht', () => {
    expect(sanitizeFilename('..', 'fallback.jpg')).toBe('fallback.jpg')
    expect(sanitizeFilename('.', 'fallback.jpg')).toBe('fallback.jpg')
    expect(sanitizeFilename('', 'fallback.jpg')).toBe('fallback.jpg')
  })

  it('ersetzt alles, was in einem Pfad nichts zu suchen hat', () => {
    expect(sanitizeFilename('a b?c*d.jpg', 'x.jpg')).toBe('a_b_c_d.jpg')
  })

  it('deckelt die Laenge', () => {
    expect(sanitizeFilename('a'.repeat(300) + '.jpg', 'x.jpg')).toHaveLength(120)
  })
})
