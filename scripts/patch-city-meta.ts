#!/usr/bin/env tsx
/**
 * PROJ-42: One-shot patch of cityPage.metaDescription with the brand-template.
 *
 * Targets each DE cityPage-Doc (deterministic id: cityPage-de-<slug_base>)
 * and sets only the metaDescription field. Leaves pageTitle, pageSubline,
 * bodySections, slug, etc. untouched.
 *
 * Usage:
 *   npm run patch:city-meta
 */

import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { createClient as createSanityClient } from '@sanity/client'
import { config as loadEnv } from 'dotenv'

loadEnv({ path: '.env.local' })

function required(name: string): string {
  const v = process.env[name]
  if (!v || v.length === 0) {
    console.error(`Missing env var: ${name}`)
    process.exit(1)
  }
  return v
}

function buildMetaDescription(cityName: string): string {
  return `Personalisierte Stadtkarte "${cityName}" – wähle Stil, Farbe & Ausschnitt. A4 bis A2, Premiumdruck, versandkostenfrei. Digitaler Download. Jetzt gestalten.`
}

async function main() {
  const supabase = createSupabaseClient(
    required('NEXT_PUBLIC_SUPABASE_URL'),
    required('SUPABASE_SECRET_KEY'),
    { auth: { persistSession: false, autoRefreshToken: false } },
  )
  const sanity = createSanityClient({
    projectId: required('NEXT_PUBLIC_SANITY_PROJECT_ID'),
    dataset: process.env.NEXT_PUBLIC_SANITY_DATASET ?? 'production',
    apiVersion: '2024-10-01',
    token: required('SANITY_API_WRITE_TOKEN'),
    useCdn: false,
  })

  const { data: cities, error } = await supabase
    .from('cities')
    .select('slug_base, name')
    .eq('country_code', 'DE')
    .order('population', { ascending: false, nullsFirst: false })
  if (error) {
    console.error(`cities query failed: ${error.message}`)
    process.exit(1)
  }
  if (!cities || cities.length === 0) {
    console.error('no cities matched')
    process.exit(1)
  }

  console.log(`Patching metaDescription on ${cities.length} cityPage docs (locale=de)…\n`)

  let okCount = 0
  let missingCount = 0
  let failCount = 0

  for (const c of cities) {
    const docId = `cityPage-de-${c.slug_base}`
    const meta = buildMetaDescription(c.name)
    const len = [...meta].length // count Unicode codepoints, not UTF-16 units

    process.stdout.write(`  ${c.name.padEnd(20)} ${len} chars  `)

    try {
      const existing = await sanity.fetch<{ _id: string } | null>(
        `*[_id == $id][0]{ _id }`,
        { id: docId },
      )
      if (!existing) {
        console.log('SKIP (doc missing)')
        missingCount++
        continue
      }
      await sanity.patch(docId).set({ metaDescription: meta }).commit()
      console.log(len > 160 ? `✓ (warn: ${len - 160} over limit)` : '✓')
      okCount++
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.log(`FAIL: ${msg}`)
      failCount++
    }
  }

  console.log(`\nOK: ${okCount}  Skip: ${missingCount}  Fail: ${failCount}`)
}

main().catch((err) => {
  console.error('fatal:', err instanceof Error ? err.message : err)
  process.exit(1)
})
