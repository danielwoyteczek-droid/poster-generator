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

  const entries = await Promise.all(
    Array.from(ids).map(async (id) => [id, await fetchPrice(id)] as const),
  )
  const byId = Object.fromEntries(entries)

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
