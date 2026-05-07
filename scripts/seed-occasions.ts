#!/usr/bin/env tsx
/**
 * Seed the eight legacy occasion codes as `occasion`-Docs in Sanity.
 *
 * Idempotent: re-running won't duplicate. Each occasion is identified by
 * its `code.current` slug, so the script first queries existing docs and
 * skips any code that's already present.
 *
 * Run once after deploying the new `occasion` schema:
 *   npm run seed:occasions
 *
 * Requires SANITY_API_WRITE_TOKEN + NEXT_PUBLIC_SANITY_PROJECT_ID +
 * NEXT_PUBLIC_SANITY_DATASET in .env.local (same env vars the
 * blog-automation seed uses).
 */

import { createClient } from '@sanity/client'
import { config } from 'dotenv'
import path from 'node:path'

// Load env files in the same order Next.js does.
config({ path: path.resolve(process.cwd(), '.env.local') })
config({ path: path.resolve(process.cwd(), '.env') })

function required(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`Missing required env var: ${name}`)
  return value.trim()
}

const sanity = createClient({
  projectId: required('NEXT_PUBLIC_SANITY_PROJECT_ID'),
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET ?? 'production',
  apiVersion: '2024-10-01',
  token: required('SANITY_API_WRITE_TOKEN'),
  useCdn: false,
})

interface OccasionSeed {
  code: string
  title: string // German default
  displayOrder: number
  localizedTitles: Array<{ locale: 'de' | 'en' | 'fr' | 'it' | 'es'; title: string }>
}

const SEEDS: OccasionSeed[] = [
  {
    code: 'muttertag',
    title: 'Muttertag',
    displayOrder: 10,
    localizedTitles: [
      { locale: 'de', title: 'Muttertag' },
      { locale: 'en', title: "Mother's Day" },
      { locale: 'fr', title: 'Fête des mères' },
      { locale: 'it', title: 'Festa della mamma' },
      { locale: 'es', title: 'Día de la madre' },
    ],
  },
  {
    code: 'geburt',
    title: 'Geburt',
    displayOrder: 20,
    localizedTitles: [
      { locale: 'de', title: 'Geburt' },
      { locale: 'en', title: 'Birth' },
      { locale: 'fr', title: 'Naissance' },
      { locale: 'it', title: 'Nascita' },
      { locale: 'es', title: 'Nacimiento' },
    ],
  },
  {
    code: 'hochzeit',
    title: 'Hochzeit',
    displayOrder: 30,
    localizedTitles: [
      { locale: 'de', title: 'Hochzeit' },
      { locale: 'en', title: 'Wedding' },
      { locale: 'fr', title: 'Mariage' },
      { locale: 'it', title: 'Matrimonio' },
      { locale: 'es', title: 'Boda' },
    ],
  },
  {
    code: 'jahrestag',
    title: 'Jahrestag',
    displayOrder: 40,
    localizedTitles: [
      { locale: 'de', title: 'Jahrestag' },
      { locale: 'en', title: 'Anniversary' },
      { locale: 'fr', title: 'Anniversaire' },
      { locale: 'it', title: 'Anniversario' },
      { locale: 'es', title: 'Aniversario' },
    ],
  },
  {
    code: 'heimat',
    title: 'Heimat',
    displayOrder: 50,
    localizedTitles: [
      { locale: 'de', title: 'Heimat' },
      { locale: 'en', title: 'Hometown' },
      { locale: 'fr', title: 'Région natale' },
      { locale: 'it', title: 'Città natale' },
      { locale: 'es', title: 'Ciudad natal' },
    ],
  },
  {
    code: 'reise',
    title: 'Reise',
    displayOrder: 60,
    localizedTitles: [
      { locale: 'de', title: 'Reise' },
      { locale: 'en', title: 'Travel' },
      { locale: 'fr', title: 'Voyage' },
      { locale: 'it', title: 'Viaggio' },
      { locale: 'es', title: 'Viaje' },
    ],
  },
  {
    code: 'geschenk',
    title: 'Geschenk',
    displayOrder: 70,
    localizedTitles: [
      { locale: 'de', title: 'Geschenk' },
      { locale: 'en', title: 'Gift' },
      { locale: 'fr', title: 'Cadeau' },
      { locale: 'it', title: 'Regalo' },
      { locale: 'es', title: 'Regalo' },
    ],
  },
  {
    code: 'weihnachten',
    title: 'Weihnachten',
    displayOrder: 80,
    localizedTitles: [
      { locale: 'de', title: 'Weihnachten' },
      { locale: 'en', title: 'Christmas' },
      { locale: 'fr', title: 'Noël' },
      { locale: 'it', title: 'Natale' },
      { locale: 'es', title: 'Navidad' },
    ],
  },
]

async function main() {
  console.log(`Seeding ${SEEDS.length} occasion docs to Sanity (${sanity.config().dataset})…`)

  // Fetch existing codes once to skip any already there.
  const existing = await sanity.fetch<string[]>(`*[_type == "occasion"].code.current`)
  const existingSet = new Set(existing)
  console.log(`Existing occasion docs: ${existing.length} (${existing.join(', ') || 'none'})`)

  let created = 0
  let skipped = 0
  for (const seed of SEEDS) {
    if (existingSet.has(seed.code)) {
      console.log(`  ⏭  ${seed.code} — already exists, skipping`)
      skipped += 1
      continue
    }
    const doc = {
      _type: 'occasion',
      code: { _type: 'slug', current: seed.code },
      title: seed.title,
      displayOrder: seed.displayOrder,
      localizedTitles: seed.localizedTitles.map((lt) => ({
        _key: `${seed.code}-${lt.locale}`,
        _type: 'object',
        locale: lt.locale,
        title: lt.title,
      })),
    }
    const result = await sanity.create(doc)
    console.log(`  ✅ ${seed.code} → ${result._id}`)
    created += 1
  }

  console.log(`\nDone. Created: ${created}, Skipped: ${skipped}.`)
}

main().catch((err) => {
  console.error('Seed failed:', err)
  process.exit(1)
})
