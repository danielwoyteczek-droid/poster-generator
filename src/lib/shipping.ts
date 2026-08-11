/**
 * PROJ-26: Versandkosten.
 *
 * Zwei Zonen, drei Versandarten, eine Regel: Das größte Format im Warenkorb
 * bestimmt die Versandart. Bewusst so einfach gehalten, dass sie auch in
 * einem Jahr noch nachvollziehbar ist — die ursprünglich geplante Matrix
 * Land × Produkt × Format wäre für den heutigen Bedarf überdimensioniert
 * gewesen.
 *
 * Die Beträge liegen in Stripe (Shipping Rates), im Code stehen nur die IDs.
 * Preisänderungen brauchen damit keinen Deploy — dasselbe Muster wie bei den
 * Produktpreisen.
 */

export type ShippingZone = 'domestic' | 'eu'
export type ShippingMethod = 'letter' | 'small_parcel' | 'parcel'

/** Inland. */
export const DOMESTIC_COUNTRY = 'DE'

/**
 * Belieferte EU-Länder. Bewusst eine Konstante und kein Feature: Die Liste
 * zu erweitern ist eine Zeile, keine Verwaltungsoberfläche.
 *
 * Die Schweiz fehlt absichtlich — Zoll und Einfuhrumsatzsteuer lohnen den
 * Aufwand nicht. Sie war früher freigeschaltet; siehe PROJ-26.
 */
export const EU_COUNTRIES = ['AT', 'NL', 'BE', 'LU', 'FR', 'IT', 'ES', 'PL', 'DK', 'CZ'] as const

export const SHIPPING_COUNTRIES = [DOMESTIC_COUNTRY, ...EU_COUNTRIES] as const
export type ShippingCountry = (typeof SHIPPING_COUNTRIES)[number]

/**
 * Globaler Schalter. Aus = keine Versandkosten in beiden Zonen, etwa für
 * eine Gratis-Versand-Aktion. Als Umgebungsvariable, damit die Umstellung
 * ohne Deploy möglich ist.
 */
export function isShippingChargeEnabled(): boolean {
  return process.env.NEXT_PUBLIC_SHIPPING_ENABLED !== 'false'
}

/** Ab diesem Warenkorbwert entfällt der Inlandsversand. */
export const DOMESTIC_FREE_SHIPPING_CENTS = 4900

/**
 * Höchstzahl A4-Bögen, die noch als Brief gehen. Ein Maxibrief darf 1000 g
 * und 50 mm — rechnerisch ginge mehr, aber ab einem gewissen Stapel wird es
 * am Schalter zur Diskussion. Konservativ gewählt.
 */
export const LETTER_MAX_A4_SHEETS = 10

/**
 * Stripe-Shipping-Rate-IDs. Anzulegen im Dashboard unter Versand, danach
 * hier eintragen — analog zu den Price-IDs in products.ts.
 *
 * Solange ein Wert fehlt, läuft der Checkout ohne Versandkosten weiter statt
 * abzubrechen: Eine Bestellung ohne Versandkosten ist ein kalkulierbarer
 * Verlust, eine abgebrochene Bestellung ein sicherer.
 */
export const SHIPPING_RATE_IDS: Record<ShippingZone, Partial<Record<ShippingMethod, string>>> = {
  domestic: {
    letter: 'shr_1U3G8n36Wy7c8yXhtlrYa8KW',
    small_parcel: 'shr_1U3G9o36Wy7c8yXhEqBRAEIx',
    parcel: 'shr_1U3GAU36Wy7c8yXhZ9uCd9Is',
  },
  eu: {
    parcel: 'shr_1U3GAy36Wy7c8yXhbw368EMq',
  },
}

/** Anzeigebeträge in Cent. Nur für die Vorschau im Warenkorb — maßgeblich
 *  ist beim Bezahlen immer der in Stripe hinterlegte Betrag. */
export const SHIPPING_PREVIEW_CENTS: Record<ShippingZone, Partial<Record<ShippingMethod, number>>> =
  {
    domestic: { letter: 250, small_parcel: 399, parcel: 599 },
    eu: { parcel: 999 },
  }

export function zoneForCountry(country: string): ShippingZone | null {
  if (country === DOMESTIC_COUNTRY) return 'domestic'
  return (EU_COUNTRIES as readonly string[]).includes(country) ? 'eu' : null
}

/** Rangfolge für „die teuerste zutreffende Art gewinnt". */
const METHOD_RANK: Record<ShippingMethod, number> = {
  letter: 1,
  small_parcel: 2,
  parcel: 3,
}

/**
 * Was der Versand über eine Position wissen muss. Bewusst nicht der volle
 * CartItem-Typ, damit die Berechnung ohne Warenkorb testbar bleibt.
 */
export interface ShippableItem {
  productId: 'download' | 'poster' | 'dtf'
  /** Poster: a4 | a3 | a2. DTF: a4 | a3 | 40x50. */
  format: string
  withFrame?: boolean
  quantity: number
}

/**
 * Versandart für einen Warenkorb im Inland. `null` bedeutet: nichts zu
 * versenden (reiner Download-Warenkorb).
 *
 * Im EU-Ausland wird diese Funktion nicht gebraucht — dort gilt pauschal
 * Paket, unabhängig vom Inhalt.
 */
export function domesticMethodFor(items: ShippableItem[]): ShippingMethod | null {
  const physical = items.filter((i) => i.productId !== 'download')
  if (physical.length === 0) return null

  // A4-Bögen zählen über alle Positionen zusammen: Zwei Positionen mit je
  // sechs Bögen sind zwölf Bögen in einer Sendung, nicht zweimal sechs.
  const a4SheetCount = physical
    .filter((i) => i.productId === 'dtf' && i.format === 'a4')
    .reduce((sum, i) => sum + i.quantity, 0)

  let method: ShippingMethod | null = null
  const raise = (candidate: ShippingMethod) => {
    if (!method || METHOD_RANK[candidate] > METHOD_RANK[method]) method = candidate
  }

  for (const item of physical) {
    if (item.productId === 'dtf') {
      if (item.format === 'a4') {
        raise(a4SheetCount > LETTER_MAX_A4_SHEETS ? 'small_parcel' : 'letter')
      } else if (item.format === 'a3') {
        raise('small_parcel')
      } else {
        // 40 × 50 und alles Größere geht gerollt als Paket.
        raise('parcel')
      }
      continue
    }
    // Poster: gerollt als Kleinpaket, mit Rahmen als Paket.
    raise(item.withFrame ? 'parcel' : 'small_parcel')
  }

  return method
}

export interface ShippingQuote {
  /** null = nichts zu versenden. */
  method: ShippingMethod | null
  zone: ShippingZone
  cents: number
  /** Warum nichts berechnet wird — für die Anzeige im Warenkorb. */
  freeReason: 'threshold' | 'disabled' | 'digital_only' | null
  /** Fehlbetrag bis zum kostenfreien Versand; null wenn keine Schwelle gilt. */
  remainingToFreeCents: number | null
  stripeShippingRateId: string | null
}

/**
 * Versandkosten für einen Warenkorb.
 *
 * @param subtotalCents Warenkorbwert VOR Rabatt. Bewusst vor Rabatt: Sonst
 *        würde ein Gutschein zusätzlich den Versand finanzieren.
 */
export function quoteShipping(
  items: ShippableItem[],
  country: string,
  subtotalCents: number,
): ShippingQuote | null {
  const zone = zoneForCountry(country)
  if (!zone) return null

  const hasPhysical = items.some((i) => i.productId !== 'download')
  if (!hasPhysical) {
    return {
      method: null,
      zone,
      cents: 0,
      freeReason: 'digital_only',
      remainingToFreeCents: null,
      stripeShippingRateId: null,
    }
  }

  // Im EU-Ausland immer Paket — der Inhalt spielt keine Rolle.
  const method: ShippingMethod = zone === 'eu' ? 'parcel' : (domesticMethodFor(items) ?? 'parcel')

  if (!isShippingChargeEnabled()) {
    return {
      method,
      zone,
      cents: 0,
      freeReason: 'disabled',
      remainingToFreeCents: null,
      stripeShippingRateId: null,
    }
  }

  // Freibetrag gilt nur im Inland. Im EU-Ausland würde eine Schwelle
  // bedeuten, dass ab dem Grenzwert die vollen Portokosten bei uns liegen.
  if (zone === 'domestic') {
    if (subtotalCents >= DOMESTIC_FREE_SHIPPING_CENTS) {
      return {
        method,
        zone,
        cents: 0,
        freeReason: 'threshold',
        remainingToFreeCents: 0,
        stripeShippingRateId: null,
      }
    }
  }

  return {
    method,
    zone,
    cents: SHIPPING_PREVIEW_CENTS[zone][method] ?? 0,
    freeReason: null,
    remainingToFreeCents:
      zone === 'domestic' ? Math.max(0, DOMESTIC_FREE_SHIPPING_CENTS - subtotalCents) : null,
    stripeShippingRateId: SHIPPING_RATE_IDS[zone][method] || null,
  }
}
