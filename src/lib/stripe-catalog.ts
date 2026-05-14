import { unstable_cache } from 'next/cache'
import { stripe } from './stripe'
import { PRODUCTS, FRAME_MARKUP_PRICE_IDS, type ProductId } from './products'
import type { PrintFormat } from './print-formats'

export interface CatalogPrice {
  stripePriceId: string
  unitAmount: number  // cents
  currency: string
  compareAtCents?: number
}

export type ProductPriceTable = Partial<Record<PrintFormat, CatalogPrice>>

export interface ProductCatalog {
  products: Record<ProductId, ProductPriceTable>
  /**
   * Frame-Markup-Aufpreise pro Format. Werden zusätzlich zum Poster-Price
   * berechnet, wenn der Customer `Mit schwarzem Rahmen` aktiviert.
   * Solange Marketing die Stripe-Prices nicht angelegt hat, ist dieses
   * Objekt leer und das Frontend blendet die Frame-Option aus.
   */
  frameMarkup: ProductPriceTable
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

  const products: Record<ProductId, ProductPriceTable> = { download: {}, poster: {} }
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

  return { products, frameMarkup }
}

// Cache for 5 minutes, revalidate tag allows manual purge later.
export const getProductCatalog = unstable_cache(
  buildCatalog,
  ['stripe-product-catalog-v3'],
  { revalidate: 300, tags: ['stripe-catalog'] },
)
