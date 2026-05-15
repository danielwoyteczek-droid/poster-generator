/**
 * One-off: print everything about a given Stripe coupon, so we can see
 * whether applies_to.products is actually set and what's on it.
 * Usage: npx tsx scripts/inspect-coupon.ts <couponId>
 */
import * as dotenv from 'dotenv'
import path from 'path'
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })
dotenv.config({ path: path.resolve(process.cwd(), '.env') })

import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-03-25.dahlia',
})

async function main() {
  const couponId = process.argv[2] ?? 'zjONoHjC'
  const coupon = await stripe.coupons.retrieve(couponId)
  console.log(JSON.stringify(coupon, null, 2))
}
main().catch((err) => { console.error(err); process.exit(1) })
