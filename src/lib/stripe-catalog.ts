import { unstable_cache } from 'next/cache'
import { stripe } from './stripe'
import {
  PRODUCTS,
  FRAME_MARKUP_PRICE_IDS,
  DTF_SHEET_PRICE_IDS,
  type PosterProductId,
} from './products'
import type { PrintFormat } from './print-formats'
import type { DtfSheetFormat } from './dtf-constants'

export interface CatalogPrice {
  stripePriceId: string
  unitAmount: number  // cents
  currency: string
  compareAtCents?: number
}

export type ProductPriceTable = Partial<Record<PrintFormat, CatalogPrice>>

/** PROJ-55: Preise je Bogenformat — eigener Typ neben den Posterformaten. */
export type DtfPriceTable = Partial<Record<DtfSheetFormat, CatalogPrice>>

/**
 * Produkte, die nach Posterformat abrechnen. DTF ist bewusst ausgenommen —
 * seine Preise hängen an Bogenmaßen und liegen in `dtfSheets`.
 */
export type CatalogProductId = PosterProductId

export interface ProductCatalog {
  products: Record<CatalogProductId, ProductPriceTable>
  /**
   * Frame-Markup-Aufpreise pro Format. Werden zusätzlich zum Poster-Price
   * berechnet, wenn der Customer `Mit schwarzem Rahmen` aktiviert.
   * Solange Marketing die Stripe-Prices nicht angelegt hat, ist dieses
   * Objekt leer und das Frontend blendet die Frame-Option aus.
   */
  frameMarkup: ProductPriceTable
  /**
   * PROJ-55: Preis pro einzelnem DTF-Transferbogen. Leer, solange die
   * Price-IDs in products.ts nicht gepflegt sind — dann blendet der Editor
   * den Kaufknopf aus, statt einen Checkout anzubieten, der scheitert.
   */
  dtfSheets: DtfPriceTable
}

async function fetchPrice(priceId: string): Promise<CatalogPrice> {
  const price = await stripe.prices.retrieve(priceId)
  const compareAtRaw = price.metadata?.compare_at_cents
  const compareAtCents = compareAtRaw ? Number(compareAtRaw) : undefined
  return {
    stripePriceId: priceId,
    unitAmount: price.unit_amount ?? 0,
    currency: price.currency,
    compareAtCents: compareAtCents && !Number.isNaN(compareAtCents) ? compareAtCents : undefined,
  }
}

async function buildCatalog(): Promise<ProductCatalog> {
  const ids = new Set<string>()
  for (const product of PRODUCTS) {
    for (const id of Object.values(product.stripePriceIds)) {
      if (id) ids.add(id)
    }
  }
  for (const id of Object.values(FRAME_MARKUP_PRICE_IDS)) {
    if (id) ids.add(id)
  }
  for (const id of Object.values(DTF_SHEET_PRICE_IDS)) {
    if (id) ids.add(id)
  }

  // allSettled instead of all: a single stale/deleted Stripe price ID must
  // not take down the entire catalog (which would gray out every product
  // across all editors). Failures get logged once with the offending ID so
  // it's obvious which entries in products.ts need to be refreshed.
  const settled = await Promise.all(
    Array.from(ids).map(async (id) => {
      try {
        return { id, price: await fetchPrice(id), error: null as unknown }
      } catch (err) {
        return { id, price: null, error: err }
      }
    }),
  )
  const byId: Record<string, CatalogPrice> = {}
  for (const entry of settled) {
    if (entry.price) {
      byId[entry.id] = entry.price
    } else {
      const msg = entry.error instanceof Error ? entry.error.message : String(entry.error)
      console.warn(`[stripe-catalog] skipping price ${entry.id}: ${msg}`)
    }
  }

  const products: Record<CatalogProductId, ProductPriceTable> = { download: {}, poster: {} }
  for (const product of PRODUCTS) {
    for (const [format, priceId] of Object.entries(product.stripePriceIds)) {
      if (!priceId) continue
      const fetched = byId[priceId]
      if (fetched) {
        products[product.id][format as PrintFormat] = fetched
      }
    }
  }

  const frameMarkup: ProductPriceTable = {}
  for (const [format, priceId] of Object.entries(FRAME_MARKUP_PRICE_IDS)) {
    if (!priceId) continue
    const fetched = byId[priceId]
    if (fetched) {
      frameMarkup[format as PrintFormat] = fetched
    }
  }

  // PROJ-55: DTF-Bogenpreise. Eigene Tabelle, weil DTF nach Bogenformaten
  // rechnet (a4 | a3 | 40x50) und nicht nach den Posterformaten. Preis gilt
  // je EINEM Bogen; die Auflage geht als Menge an Stripe.
  const dtfSheets: DtfPriceTable = {}
  for (const [format, priceId] of Object.entries(DTF_SHEET_PRICE_IDS)) {
    if (!priceId) continue
    const fetched = byId[priceId]
    if (fetched) {
      dtfSheets[format as DtfSheetFormat] = fetched
    }
  }

  return { products, frameMarkup, dtfSheets }
}

// Cache for 5 minutes, revalidate tag allows manual purge later.
export const getProductCatalog = unstable_cache(
  buildCatalog,
  ['stripe-product-catalog-v3'],
  { revalidate: 300, tags: ['stripe-catalog'] },
)
