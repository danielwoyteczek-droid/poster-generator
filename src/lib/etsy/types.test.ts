/**
 * PROJ-49: Tests for the Etsy-response helper extractors.
 */

import { describe, it, expect } from 'vitest'
import {
  getPersonalizationText,
  getReceiptShippingAddress,
  type EtsyReceipt,
  type EtsyTransaction,
} from './types'

describe('getPersonalizationText', () => {
  it('prefers transaction.personalization when present', () => {
    const tx: EtsyTransaction = {
      transaction_id: 1,
      receipt_id: 1,
      listing_id: 1,
      personalization: 'Ort: Berlin',
      variations: [
        { formatted_name: 'Größe', formatted_value: 'A3' },
      ],
    }
    expect(getPersonalizationText(tx)).toBe('Ort: Berlin')
  })

  it('falls back to variations as KV-pairs', () => {
    const tx: EtsyTransaction = {
      transaction_id: 1,
      receipt_id: 1,
      listing_id: 1,
      personalization: null,
      variations: [
        { formatted_name: 'Ort', formatted_value: 'Hamburg' },
        { formatted_name: 'Größe', formatted_value: 'A4' },
      ],
    }
    expect(getPersonalizationText(tx)).toBe('Ort: Hamburg\nGröße: A4')
  })

  it('returns null when both fields are empty', () => {
    const tx: EtsyTransaction = {
      transaction_id: 1,
      receipt_id: 1,
      listing_id: 1,
    }
    expect(getPersonalizationText(tx)).toBeNull()
  })

  it('trims whitespace from personalization', () => {
    const tx: EtsyTransaction = {
      transaction_id: 1,
      receipt_id: 1,
      listing_id: 1,
      personalization: '  \n  Ort: Berlin  \n  ',
    }
    expect(getPersonalizationText(tx)).toBe('Ort: Berlin')
  })
})

describe('getReceiptShippingAddress', () => {
  it('flattens receipt address fields', () => {
    const r: EtsyReceipt = {
      receipt_id: 99,
      shop_id: 1,
      name: 'Max Mustermann',
      first_line: 'Beispielstraße 1',
      second_line: null,
      city: 'Berlin',
      state: null,
      zip: '10115',
      country_iso: 'DE',
      formatted_address: 'Max Mustermann\nBeispielstraße 1\n10115 Berlin\nDeutschland',
    }
    const addr = getReceiptShippingAddress(r)
    expect(addr.name).toBe('Max Mustermann')
    expect(addr.first_line).toBe('Beispielstraße 1')
    expect(addr.city).toBe('Berlin')
    expect(addr.country_iso).toBe('DE')
  })
})
