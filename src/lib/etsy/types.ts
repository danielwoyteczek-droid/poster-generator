/**
 * PROJ-49: Type-Definitionen für Etsy Open API v3 Responses.
 *
 * Kein offizielles SDK von Etsy → wir typisieren defensiv (nur die Felder,
 * die wir tatsächlich nutzen). Etsy ändert die API selten breaking, aber
 * fügt Felder hinzu — unknown-Fallback toleriert das.
 */

export interface EtsyReceiptAddress {
  name?: string
  first_line?: string
  second_line?: string | null
  city?: string
  state?: string | null
  zip?: string
  country_iso?: string
  formatted_address?: string
}

export interface EtsyTransaction {
  transaction_id: number
  receipt_id: number
  listing_id: number
  product_id?: number | null
  sku?: string | null
  title?: string
  variations?: Array<{
    property_id?: number
    value_id?: number
    formatted_name?: string
    formatted_value?: string
  }>
  /**
   * Etsy hat zwei Stellen, an denen Personalisierung landen kann:
   *  - `buyer_message` auf der Receipt (Käufer-Notiz zur ganzen Bestellung)
   *  - `personalization` direkt auf der Transaction (item-spezifisch)
   * Wir bevorzugen die transaction-spezifische, fallen auf buyer_message zurück.
   */
  personalization?: string | null
  quantity?: number
  price?: { amount: number; divisor: number; currency_code: string }
}

export interface EtsyReceipt {
  receipt_id: number
  shop_id: number
  status?: string
  buyer_email?: string
  name?: string
  first_line?: string
  second_line?: string | null
  city?: string
  state?: string | null
  zip?: string
  country_iso?: string
  formatted_address?: string
  is_paid?: boolean
  is_shipped?: boolean
  was_paid?: boolean
  was_shipped?: boolean
  was_canceled?: boolean
  create_timestamp?: number
  created_timestamp?: number
  updated_timestamp?: number
  message_from_buyer?: string | null
  transactions?: EtsyTransaction[]
  grandtotal?: { amount: number; divisor: number; currency_code: string }
}

export interface EtsyReceiptsResponse {
  count: number
  results: EtsyReceipt[]
}

export interface EtsyTransactionsResponse {
  count: number
  results: EtsyTransaction[]
}

export interface EtsyShop {
  shop_id: number
  shop_name: string
  user_id: number
}

export interface EtsyMeResponse {
  user_id: number
  shop_id?: number
}

/**
 * Extrahiert die Klartext-Personalisierung aus einer Transaction.
 * Fallback-Reihenfolge: transaction.personalization → transaction.variations → null.
 */
export function getPersonalizationText(tx: EtsyTransaction): string | null {
  if (tx.personalization && tx.personalization.trim().length > 0) {
    return tx.personalization.trim()
  }
  // Variations kann auch Personalisierungs-Feld als formatted_value enthalten
  // (Etsy-Listing mit Personalization als Variation). Wir konkatenieren als Fallback.
  if (tx.variations && tx.variations.length > 0) {
    const lines: string[] = []
    for (const v of tx.variations) {
      if (v.formatted_name && v.formatted_value) {
        lines.push(`${v.formatted_name}: ${v.formatted_value}`)
      }
    }
    if (lines.length > 0) return lines.join('\n')
  }
  return null
}

/**
 * Extrahiert die Lieferadresse aus dem Receipt-Payload. Etsy liefert die
 * Felder flach auf der Receipt-Ebene, NICHT als nested object.
 */
export function getReceiptShippingAddress(r: EtsyReceipt): EtsyReceiptAddress {
  return {
    name: r.name,
    first_line: r.first_line,
    second_line: r.second_line,
    city: r.city,
    state: r.state,
    zip: r.zip,
    country_iso: r.country_iso,
    formatted_address: r.formatted_address,
  }
}
