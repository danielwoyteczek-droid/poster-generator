/**
 * Print the Stripe Product names behind each Price in PRODUCTS + the
 * frame-markup product. Useful to spot legacy/confusing product names
 * that surface on the Stripe Checkout page.
 */
import * as dotenv from 'dotenv'
import path from 'path'
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })
import Stripe from 'stripe'
import { PRODUCTS, FRAME_MARKUP_PRICE_IDS } from '../src/lib/products'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-03-25.dahlia',
})

async function main() {
  const ids: Array<{ label: string; priceId: string }> = []
  for (const p of PRODUCTS) {
    for (const [fmt, id] of Object.entries(p.stripePriceIds)) {
      if (id) ids.push({ label: `${p.id}/${fmt}`, priceId: id })
    }
  }
  for (const [fmt, id] of Object.entries(FRAME_MARKUP_PRICE_IDS)) {
    if (id) ids.push({ label: `frame_markup/${fmt}`, priceId: id })
  }

  const seen = new Set<string>()
  for (const { label, priceId } of ids) {
    if (seen.has(priceId)) continue
    seen.add(priceId)
    const price = await stripe.prices.retrieve(priceId, { expand: ['product'] })
    const product = price.product as Stripe.Product
    console.log(
      `${label.padEnd(20)} | price=${priceId} | unit=${(price.unit_amount ?? 0) / 100} EUR | product='${product.name}' (${product.id})`,
    )
  }
}

main().catch((err) => { console.error(err); process.exit(1) })
