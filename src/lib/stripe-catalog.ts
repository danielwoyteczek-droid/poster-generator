import { unstable_cache } from 'next/cache'
import { stripe } from './stripe'
import { PRODUCTS, type ProductId } from './products'
import type { PrintFormat } from './print-formats'

export interface CatalogPrice {
  stripePriceId: string
  unitAmount: number  // cents
  currency: string
  compareAtCents?: number
}

export type ProductCatalog = Record<ProductId, Partial<Record<PrintFormat, CatalogPrice>>>

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

  const catalog: ProductCatalog = { download: {}, poster: {}, frame: {} }
  for (const product of PRODUCTS) {
    for (const [format, priceId] of Object.entries(product.stripePriceIds)) {
      if (!priceId) continue
      const fetched = byId[priceId]
      if (fetched) {
        catalog[product.id][format as PrintFormat] = fetched
      }
    }
  }
  return catalog
}

// Cache for 5 minutes, revalidate tag allows manual purge later.
export const getProductCatalog = unstable_cache(
  buildCatalog,
  ['stripe-product-catalog'],
  { revalidate: 300, tags: ['stripe-catalog'] },
)
