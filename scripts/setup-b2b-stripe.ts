/**
 * PROJ-50 — Stripe-Setup fuer B2B-Subscription-Tiers + Overage.
 *
 * Run einmal nach PROJ-50-Deploy:
 *   npx tsx scripts/setup-b2b-stripe.ts
 *
 * Erstellt:
 *   - 3 Subscription-Products (B2B Starter / Pro / Business), je 3 recurring
 *     monthly Prices in EUR/USD/GBP
 *   - 1 Metered-Product (B2B Overage), 3 metered Prices in EUR/USD/GBP
 *
 * Idempotent: re-running ueberspringt existierende Products (Lookup ueber
 * metadata.kind), wirft KEINE neuen Prices, wenn die Preise schon angelegt
 * sind. Wenn du Preise aendern willst: deaktiviere die alten Prices manuell
 * im Stripe-Dashboard (active=false), dann erneut laufen lassen.
 *
 * Stripe-Limitation: Prices sind immutable. Preis-Aenderung = neuer Price +
 * Deaktivierung des alten.
 *
 * Live-Mode-Sicherheitscheck: Script prompted vor dem Erstellen, wenn der
 * Key mit 'sk_live_' beginnt. CI/CD kann mit B2B_SETUP_AUTO_CONFIRM=yes den
 * Prompt umgehen.
 */
import * as dotenv from 'dotenv'
import path from 'path'
import readline from 'readline'
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })
dotenv.config({ path: path.resolve(process.cwd(), '.env') })

import Stripe from 'stripe'
import { PAID_TIERS, CURRENCIES, type Currency, type PaidTier } from '@/lib/b2b-subscription'

// ---------------------------------------------------------------------
// Preis-Definition (in Minor-Units, also Cents)
// ---------------------------------------------------------------------

const TIER_EUR_CENTS: Record<PaidTier, number> = {
  starter: 900,     // 9.00 EUR
  pro: 2900,        // 29.00 EUR
  business: 7900,   // 79.00 EUR
}

// USD ~ EUR * 1.10, GBP ~ EUR * 0.85. Stripe akzeptiert beliebige Cents;
// runden auf "psychologische" Werte (z.B. 9.99) waere besser, koennte aber
// im Dashboard nachgepflegt werden.
const CURRENCY_FACTOR: Record<Currency, number> = {
  eur: 1.0,
  usd: 1.10,
  gbp: 0.85,
}

function tierPriceCents(tier: PaidTier, currency: Currency): number {
  return Math.round(TIER_EUR_CENTS[tier] * CURRENCY_FACTOR[currency])
}

// Overage: 20 Cent pro Einheit, in EUR. USD/GBP umgerechnet.
const OVERAGE_EUR_CENTS = 20
function overagePriceCents(currency: Currency): number {
  return Math.round(OVERAGE_EUR_CENTS * CURRENCY_FACTOR[currency])
}

// Metadata-Lookup-Keys (Konvention analog zu PROJ-48-Frame-Markup).
const TIER_LOOKUP_KEY = (tier: PaidTier) => `b2b_tier_${tier}`
const OVERAGE_LOOKUP_KEY = 'b2b_overage'

// ---------------------------------------------------------------------
// Stripe-Client + Live-Mode-Detection
// ---------------------------------------------------------------------

const secretKey = process.env.STRIPE_SECRET_KEY
if (!secretKey) {
  console.error('[setup-b2b] STRIPE_SECRET_KEY fehlt in .env.local.')
  process.exit(1)
}

const isLiveMode = secretKey.startsWith('sk_live_')
const stripe = new Stripe(secretKey, {
  apiVersion: '2026-03-25.dahlia',
  typescript: true,
})

async function confirmLiveMode(): Promise<void> {
  if (!isLiveMode) return
  if (process.env.B2B_SETUP_AUTO_CONFIRM === 'yes') {
    console.log('[setup-b2b] LIVE-MODE, auto-confirmed via B2B_SETUP_AUTO_CONFIRM=yes')
    return
  }
  console.log('')
  console.log('  ╔═══════════════════════════════════════════════════════════╗')
  console.log('  ║  WARNUNG: LIVE-MODE                                       ║')
  console.log('  ║  Du laeufst gegen den Stripe-Live-Account.                ║')
  console.log('  ║  Erstellte Products koennen NICHT geloescht werden        ║')
  console.log('  ║  (nur deaktiviert).                                       ║')
  console.log('  ║                                                           ║')
  console.log('  ║  Empfohlen: zuerst in Test-Mode (sk_test_...) validieren. ║')
  console.log('  ╚═══════════════════════════════════════════════════════════╝')
  console.log('')

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  const answer = await new Promise<string>((resolve) => {
    rl.question('Type "YES" to continue in Live-Mode: ', resolve)
  })
  rl.close()
  if (answer.trim() !== 'YES') {
    console.log('[setup-b2b] abgebrochen.')
    process.exit(0)
  }
}

// ---------------------------------------------------------------------
// Idempotent Product Lookup
// ---------------------------------------------------------------------

async function findOrCreateProduct(opts: {
  lookupKey: string
  name: string
  description: string
}): Promise<Stripe.Product> {
  const existing = await stripe.products.search({
    query: `metadata['kind']:'${opts.lookupKey}' AND active:'true'`,
    limit: 1,
  })
  if (existing.data[0]) {
    console.log(`[product] reusing existing: ${existing.data[0].id} (${opts.lookupKey})`)
    return existing.data[0]
  }
  const created = await stripe.products.create({
    name: opts.name,
    description: opts.description,
    metadata: { kind: opts.lookupKey },
  })
  console.log(`[product] created: ${created.id} (${opts.lookupKey})`)
  return created
}

/**
 * Findet oder erstellt den Billing Meter, der die Overage-Usage-Events
 * aggregiert. Die Overage-Prices muessen seit Stripe-API 2025-03-31.basil
 * an einen Meter gebunden sein.
 *
 * event_name + payload-Keys muessen exakt zum Webhook-Handler-Call passen:
 *   stripe.billing.meterEvents.create({
 *     event_name: 'b2b_export_overage',
 *     payload: { stripe_customer_id: ..., value: '1' },
 *   })
 */
async function findOrCreateMeter(): Promise<Stripe.Billing.Meter> {
  const list = await stripe.billing.meters.list({ status: 'active', limit: 100 })
  const existing = list.data.find((m) => m.event_name === 'b2b_export_overage')
  if (existing) {
    console.log(`[meter] reusing existing: ${existing.id} (${existing.event_name})`)
    return existing
  }
  const created = await stripe.billing.meters.create({
    display_name: 'B2B Export Overage',
    event_name: 'b2b_export_overage',
    default_aggregation: { formula: 'sum' },
    customer_mapping: {
      event_payload_key: 'stripe_customer_id',
      type: 'by_id',
    },
    value_settings: {
      event_payload_key: 'value',
    },
  })
  console.log(`[meter] created: ${created.id} (${created.event_name})`)
  return created
}

async function findOrCreatePrice(opts: {
  product: string
  currency: Currency
  unitAmount: number
  recurring: Stripe.PriceCreateParams.Recurring
  lookupKey: string
}): Promise<Stripe.Price> {
  // Stripe-Prices haben native lookup_key — nutzen wir hier statt Metadata.
  const existing = await stripe.prices.list({
    product: opts.product,
    active: true,
    lookup_keys: [opts.lookupKey],
    limit: 1,
  })
  if (existing.data[0]) {
    console.log(`[price] reusing existing: ${existing.data[0].id} (${opts.lookupKey})`)
    return existing.data[0]
  }
  const created = await stripe.prices.create({
    product: opts.product,
    currency: opts.currency,
    unit_amount: opts.unitAmount,
    recurring: opts.recurring,
    lookup_key: opts.lookupKey,
    nickname: opts.lookupKey,
  })
  console.log(`[price] created: ${created.id} (${opts.lookupKey})`)
  return created
}

// ---------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------

async function main() {
  console.log(`[setup-b2b] Stripe mode: ${isLiveMode ? 'LIVE' : 'TEST'}`)
  await confirmLiveMode()

  // Sammle alle Resulting Price-IDs fuer den abschliessenden ENV-Block.
  const envBlock: string[] = []

  // 1. Tier-Subscription-Products (Starter, Pro, Business)
  for (const tier of PAID_TIERS) {
    const tierLabel = tier[0].toUpperCase() + tier.slice(1)
    const product = await findOrCreateProduct({
      lookupKey: TIER_LOOKUP_KEY(tier),
      name: `Petite-Moment B2B ${tierLabel}`,
      description: `PROJ-50 B2B-Tier "${tierLabel}". Monatliches Abo mit inkludierten Export-Credits + Commercial License.`,
    })

    for (const currency of CURRENCIES) {
      const unitAmount = tierPriceCents(tier, currency)
      const lookupKey = `b2b_${tier}_${currency}_monthly`
      const price = await findOrCreatePrice({
        product: product.id,
        currency,
        unitAmount,
        recurring: { interval: 'month', usage_type: 'licensed' },
        lookupKey,
      })
      envBlock.push(`STRIPE_PRICE_B2B_${tier.toUpperCase()}_${currency.toUpperCase()}=${price.id}`)
    }
  }

  // 2. Billing Meter fuer Overage-Events (seit Stripe API 2025-03-31.basil
  //    Pflicht fuer metered Prices). event_name muss exakt zum Webhook-Call
  //    in b2b-webhook-handlers.ts passen.
  const meter = await findOrCreateMeter()

  // 3. Overage Metered-Product (eine Product, drei Prices) gebunden an Meter
  const overageProduct = await findOrCreateProduct({
    lookupKey: OVERAGE_LOOKUP_KEY,
    name: 'Petite-Moment B2B Overage',
    description:
      'PROJ-50 Usage-Based-Overage. Wird pro zusaetzlichem Export ueber das Tier-Credit-Limit hinaus belastet. ~20 Cent/Unit, metered, abgerechnet am Periodenende.',
  })

  for (const currency of CURRENCIES) {
    const unitAmount = overagePriceCents(currency)
    const lookupKey = `b2b_overage_${currency}`
    const price = await findOrCreatePrice({
      product: overageProduct.id,
      currency,
      unitAmount,
      recurring: {
        interval: 'month',
        usage_type: 'metered',
        meter: meter.id,
      },
      lookupKey,
    })
    envBlock.push(`STRIPE_PRICE_B2B_OVERAGE_${currency.toUpperCase()}=${price.id}`)
  }

  // 3. ENV-Block ausgeben
  console.log('')
  console.log('═══════════════════════════════════════════════════════════════')
  console.log('  ENV-Block fuer .env.local (Copy-Paste-Ready)')
  console.log('═══════════════════════════════════════════════════════════════')
  console.log('')
  for (const line of envBlock) {
    console.log(line)
  }
  console.log('')
  console.log('═══════════════════════════════════════════════════════════════')
  console.log('  Naechste Schritte:')
  console.log('  1. ENV-Block oben in .env.local einfuegen (ersetzt die')
  console.log('     leeren STRIPE_PRICE_B2B_*-Werte).')
  console.log('  2. Vercel-Production-Env aktualisieren (gleiche Variablen).')
  console.log('  3. Stripe-Dashboard:')
  console.log('     - Settings -> Tax -> "Stripe Tax aktivieren"')
  console.log('     - Settings -> Billing -> Customer Portal aktivieren')
  console.log('       (Billing Meter "b2b_export_overage" hat das Script schon angelegt.)')
  console.log('     - Webhook-Endpoint /api/stripe/webhook um diese Events erweitern:')
  console.log('       customer.subscription.created/updated/deleted')
  console.log('       invoice.payment_succeeded/payment_failed')
  console.log('       customer.subscription.trial_will_end')
  console.log('  4. End-to-End-Test in /qa-Phase.')
  console.log('═══════════════════════════════════════════════════════════════')
}

main().catch((err) => {
  console.error('[setup-b2b] FAILED:', err)
  process.exit(1)
})
