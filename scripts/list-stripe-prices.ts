/**
 * One-off diagnostic: print every Stripe Price referenced in products.ts,
 * including its unit_amount, currency and full metadata. Run with:
 *   npx tsx scripts/list-stripe-prices.ts
 *
 * No mutations — pure read. Helpful when you can't remember where you set
 * the `compare_at_cents` metadata on which Price.
 */
import * as dotenv from 'dotenv'
import path from 'path'
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })
dotenv.config({ path: path.resolve(process.cwd(), '.env') })

import Stripe from 'stripe'
import { PRODUCTS } from '../src/lib/products'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-03-25.dahlia',
  typescript: true,
})

async function main() {
  const seen = new Set<string>()
  for (const product of PRODUCTS) {
    for (const [format, priceId] of Object.entries(product.stripePriceIds)) {
      if (!priceId || seen.has(priceId)) continue
      seen.add(priceId)
      try {
        const price = await stripe.prices.retrieve(priceId)
        const unit = price.unit_amount != null
          ? `${(price.unit_amount / 100).toFixed(2)} ${price.currency.toUpperCase()}`
          : '—'
        const livemode = price.livemode ? 'LIVE' : 'TEST'
        const metaKeys = Object.keys(price.metadata ?? {})
        const meta = metaKeys.length > 0
          ? JSON.stringify(price.metadata)
          : '(empty)'
        console.log(
          `${product.id.padEnd(8)} | ${format.padEnd(3)} | ${priceId} | ${livemode} | ${unit.padStart(12)} | metadata=${meta}`,
        )
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        console.log(`${product.id.padEnd(8)} | ${format.padEnd(3)} | ${priceId} | ERROR: ${msg}`)
      }
    }
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
