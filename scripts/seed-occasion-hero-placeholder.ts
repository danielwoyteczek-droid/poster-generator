#!/usr/bin/env tsx
/**
 * Patch every DE occasionPage draft that has no heroImage yet with the
 * existing landing-hero asset (public/hero-desktop.webp). Lets the user
 * preview the rendered occasion-page before sourcing a final marketing
 * image per occasion.
 *
 * Idempotent: docs that already have a heroImage are skipped, the asset
 * upload reuses a deterministic filename so it dedupes on re-run.
 *
 * Usage:
 *   npm run seed:occasion-hero
 */

import { config } from 'dotenv'
import path from 'node:path'
import fs from 'node:fs'
import { createClient } from '@sanity/client'

config({ path: path.resolve(process.cwd(), '.env.local') })
config({ path: path.resolve(process.cwd(), '.env') })

function required(name: string): string {
  const v = process.env[name]
  if (!v) throw new Error(`Missing env var ${name}`)
  return v
}

const sanity = createClient({
  projectId: required('NEXT_PUBLIC_SANITY_PROJECT_ID'),
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET ?? 'production',
  apiVersion: '2024-10-01',
  token: required('SANITY_API_WRITE_TOKEN'),
  useCdn: false,
})

const PLACEHOLDER_FILENAME = 'occasion-hero-placeholder.webp'
const PLACEHOLDER_SOURCE = path.resolve(process.cwd(), 'public/hero-desktop.webp')

async function ensurePlaceholderAsset(): Promise<string> {
  // Sanity asset query: same filename → same asset (no re-upload needed).
  const existing = await sanity.fetch<{ _id: string } | null>(
    `*[_type == "sanity.imageAsset" && originalFilename == $filename][0]{_id}`,
    { filename: PLACEHOLDER_FILENAME },
  )
  if (existing?._id) {
    console.log(`✓ Placeholder asset already in Sanity: ${existing._id}`)
    return existing._id
  }

  if (!fs.existsSync(PLACEHOLDER_SOURCE)) {
    throw new Error(`Source image missing: ${PLACEHOLDER_SOURCE}`)
  }
  console.log(`↑ Uploading ${PLACEHOLDER_FILENAME} to Sanity...`)
  const buffer = fs.readFileSync(PLACEHOLDER_SOURCE)
  const asset = await sanity.assets.upload('image', buffer, {
    filename: PLACEHOLDER_FILENAME,
    contentType: 'image/webp',
  })
  console.log(`✓ Uploaded asset: ${asset._id}`)
  return asset._id
}

async function main() {
  const assetId = await ensurePlaceholderAsset()
  console.log('')

  // Find all DE occasionPage docs (drafts + published) that lack a heroImage.
  // We patch by exact _id rather than via a GROQ-mass-update so each patch is
  // visible and revertable.
  const docs = await sanity.fetch<Array<{ _id: string; occasion: string; pageTitle: string; hasHero: boolean }>>(
    `*[_type == "occasionPage" && language == "de"]{
      _id,
      occasion,
      pageTitle,
      "hasHero": defined(heroImage.asset)
    } | order(occasion asc)`,
  )

  console.log(`Found ${docs.length} DE occasionPage documents`)
  console.log('')

  let patched = 0
  let skipped = 0

  for (const doc of docs) {
    if (doc.hasHero) {
      console.log(`-  Skipped  ${doc.occasion.padEnd(12)} (already has heroImage)`)
      skipped++
      continue
    }
    await sanity
      .patch(doc._id)
      .set({
        heroImage: {
          _type: 'image',
          asset: { _type: 'reference', _ref: assetId },
          alt: `Platzhalter — ${doc.pageTitle}`,
        },
      })
      .commit()
    console.log(`✓ Patched   ${doc.occasion.padEnd(12)} (${doc._id})`)
    patched++
  }

  console.log('')
  console.log(`Done: ${patched} patched, ${skipped} skipped`)
  if (patched > 0) {
    console.log('')
    console.log('Open Sanity Studio and publish each draft to make pages live:')
    console.log('  https://petite-moment.com/studio')
  }
}

main().catch((err) => {
  console.error('Patch failed:', err)
  process.exit(1)
})
