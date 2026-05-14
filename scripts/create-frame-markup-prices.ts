/**
 * PROJ-48 — Create Stripe Prices for the frame-markup add-on.
 *
 * Run once after PROJ-48 deploy:
 *   npx tsx scripts/create-frame-markup-prices.ts
 *
 * Creates one Stripe Product "Frame Markup (schwarz)" and three Prices
 * (A4 / A3 / A2). Prints the new Price-IDs. Copy them into
 * src/lib/products.ts → FRAME_MARKUP_PRICE_IDS.
 *
 * Idempotent: re-running detects the existing product (lookup_key
 * 'frame_markup_black') and re-uses it. It does NOT delete or recreate
 * existing prices — if you want to change a price value, deactivate the
 * old one in the Stripe dashboard first, then re-run.
 *
 * NOTE: Stripe Prices are immutable. To change a value, you must
 * deactivate the old one (active=false) and create a new one. This
 * script will not auto-detect or rotate values for you.
 */
import * as dotenv from 'dotenv'
import path from 'path'
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })
dotenv.config({ path: path.resolve(process.cwd(), '.env') })

import Stripe from 'stripe'

const FRAME_MARKUP_LOOKUP_KEY = 'frame_markup_black'

interface FormatPrice {
  format: 'a4' | 'a3' | 'a2'
  unitAmount: number // cents
}

const PRICES: FormatPrice[] = [
  { format: 'a4', unitAmount: 1000 }, // €10
  { format: 'a3', unitAmount: 1500 }, // €15
  { format: 'a2', unitAmount: 2000 }, // €20
]

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-03-25.dahlia',
  typescript: true,
})

async function findOrCreateProduct(): Promise<Stripe.Product> {
  // Find existing by lookup_key on metadata. (Products don't have
  // lookup_key natively — we use a metadata convention instead.)
  const existing = await stripe.products.search({
    query: `metadata['kind']:'${FRAME_MARKUP_LOOKUP_KEY}' AND active:'true'`,
    limit: 1,
  })
  if (existing.data[0]) {
    console.log(`[product] reusing existing: ${existing.data[0].id}`)
    return existing.data[0]
  }
  const created = await stripe.products.create({
    name: 'Frame Markup (schwarz)',
    description: 'PROJ-48 Frame-Addon — wird nur in Kombination mit einem Poster-Line-Item verkauft',
    metadata: {
      kind: FRAME_MARKUP_LOOKUP_KEY,
      project: 'PROJ-48',
    },
  })
  console.log(`[product] created: ${created.id}`)
  return created
}

async function findOrCreatePrice(product: Stripe.Product, fp: FormatPrice): Promise<Stripe.Price> {
  const lookupKey = `frame_markup_black_${fp.format}`
  const existing = await stripe.prices.list({
    product: product.id,
    active: true,
    lookup_keys: [lookupKey],
    limit: 1,
  })
  if (existing.data[0]) {
    const live = existing.data[0]
    const liveAmount = live.unit_amount ?? 0
    if (liveAmount !== fp.unitAmount) {
      console.warn(
        `[price] ${lookupKey} exists with €${liveAmount / 100} (wanted €${fp.unitAmount / 100}).`,
      )
      console.warn(`        → keeping the existing one. To change the value, deactivate it in Stripe and rerun.`)
    } else {
      console.log(`[price] reusing existing: ${live.id} (${lookupKey}, €${liveAmount / 100})`)
    }
    return live
  }
  const created = await stripe.prices.create({
    product: product.id,
    currency: 'eur',
    unit_amount: fp.unitAmount,
    lookup_key: lookupKey,
    nickname: `Frame Markup ${fp.format.toUpperCase()}`,
    metadata: {
      kind: FRAME_MARKUP_LOOKUP_KEY,
      format: fp.format,
      project: 'PROJ-48',
    },
  })
  console.log(`[price] created: ${created.id} (${lookupKey}, €${fp.unitAmount / 100})`)
  return created
}

async function main() {
  if (!process.env.STRIPE_SECRET_KEY) {
    console.error('STRIPE_SECRET_KEY is not set in .env.local')
    process.exit(1)
  }

  const product = await findOrCreateProduct()

  const results: Record<string, string> = {}
  for (const fp of PRICES) {
    const price = await findOrCreatePrice(product, fp)
    results[fp.format] = price.id
  }

  console.log()
  console.log('─────────────────────────────────────────────────────────')
  console.log('Paste into src/lib/products.ts → FRAME_MARKUP_PRICE_IDS:')
  console.log('─────────────────────────────────────────────────────────')
  console.log(`export const FRAME_MARKUP_PRICE_IDS: Partial<Record<PrintFormat, string>> = {`)
  console.log(`  a4: '${results.a4}',`)
  console.log(`  a3: '${results.a3}',`)
  console.log(`  a2: '${results.a2}',`)
  console.log(`}`)
  console.log()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
