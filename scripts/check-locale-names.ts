#!/usr/bin/env tsx
/** One-shot: verify locale-name-overrides hit in generated city drafts. */

import { createClient } from '@sanity/client'
import { config } from 'dotenv'
config({ path: '.env.local' })

const sanity = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET ?? 'production',
  apiVersion: '2024-10-01',
  token: process.env.SANITY_API_WRITE_TOKEN!,
  useCdn: false,
})

async function main() {
  const checks = [
    { city: 'tokyo', loc: 'de', expect: 'Tokio' },
    { city: 'tokyo', loc: 'en', expect: 'Tokyo' },
    { city: 'rome', loc: 'de', expect: 'Rom' },
    { city: 'rome', loc: 'it', expect: 'Roma' },
    { city: 'cape-town', loc: 'de', expect: 'Kapstadt' },
    { city: 'cape-town', loc: 'fr', expect: 'Cap' },
    { city: 'london', loc: 'fr', expect: 'Londres' },
    { city: 'london', loc: 'it', expect: 'Londra' },
    { city: 'new-york', loc: 'es', expect: 'Nueva York' },
    { city: 'singapore', loc: 'de', expect: 'Singapur' },
    { city: 'marrakech', loc: 'de', expect: 'Marrakesch' },
  ]
  for (const c of checks) {
    const doc = await sanity.fetch<{ pageTitle?: string; metaTitle?: string } | null>(
      `*[_id == $id][0]{ pageTitle, metaTitle }`,
      { id: `cityPage-${c.loc}-${c.city}` },
    )
    if (!doc) {
      console.log(`  ${c.city.padEnd(15)} ${c.loc}: NOT FOUND`)
      continue
    }
    const inTitle = doc.pageTitle?.includes(c.expect) ?? false
    const inMeta = doc.metaTitle?.includes(c.expect) ?? false
    const status = inTitle || inMeta ? '✓' : '✗ MISS'
    console.log(`  ${c.city.padEnd(15)} ${c.loc}: expect "${c.expect}" → ${status} | "${doc.pageTitle?.slice(0, 70)}"`)
  }
}

main().catch((err) => {
  console.error('fatal:', err instanceof Error ? err.message : err)
  process.exit(1)
})
