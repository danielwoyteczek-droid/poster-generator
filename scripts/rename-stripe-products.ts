/**
 * One-off: rename Stripe Products to clean up legacy names that surface
 * on the Stripe Checkout page. Stripe Products are mutable; Prices are
 * not. We're touching `name` only — no price/lookup_key changes.
 *
 * Usage:
 *   npx tsx scripts/rename-stripe-products.ts          # dry-run (default)
 *   npx tsx scripts/rename-stripe-products.ts --apply  # actually rename
 */
import * as dotenv from 'dotenv'
import path from 'path'
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

import Stripe from 'stripe'

const RENAMES: Array<{ id: string; newName: string; note: string }> = [
  {
    id: 'prod_UNSPddA6X2AyzH',
    newName: 'Poster A4',
    note: 'Legacy-Name "Poster + Rahmen Schwarz A3" wirkt auf Stripe-Checkout falsch',
  },
]

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-03-25.dahlia',
})

async function main() {
  const apply = process.argv.includes('--apply')
  console.log(apply ? '── APPLY MODE ──' : '── DRY-RUN (pass --apply to commit) ──')
  console.log()

  for (const r of RENAMES) {
    const before = await stripe.products.retrieve(r.id)
    console.log(`Product ${r.id}`)
    console.log(`  current: "${before.name}"`)
    console.log(`  new:     "${r.newName}"`)
    console.log(`  note:    ${r.note}`)
    if (apply) {
      const after = await stripe.products.update(r.id, { name: r.newName })
      console.log(`  → updated, now: "${after.name}"`)
    }
    console.log()
  }
}

main().catch((err) => { console.error(err); process.exit(1) })
