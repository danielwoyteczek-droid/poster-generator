#!/usr/bin/env tsx
/**
 * One-shot: scan all cityPage docs for paper-weight mentions in
 * bodySections (z.B. "200g", "200 g", "200-Gramm") and dump the
 * matching paragraphs. Used to validate scope BEFORE writing a patch.
 */

import { createClient as createSanityClient } from '@sanity/client'
import { config as loadEnv } from 'dotenv'

loadEnv({ path: '.env.local' })

const sanity = createSanityClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET ?? 'production',
  apiVersion: '2024-10-01',
  token: process.env.SANITY_API_WRITE_TOKEN!,
  useCdn: false,
})

interface CityPageDoc {
  _id: string
  cityId: string
  language: string
  bodySections?: Array<{
    heading?: string
    body?: Array<{
      _type: string
      children?: Array<{ text?: string }>
    }>
  }>
}

// Match common paper-weight patterns + other liability-trigger terms.
// Scanned together so a single run flags ALL haftbare Claims at once.
const PAPER_RE = /\b\d{2,3}\s*(?:g\b|gr\b|gsm\b|gramm\b|g\/m²|g\/m2)|\bFSC\b|\bPEFC\b|klimaneutral|CO2-?neutral|CO₂-?neutral|Bio-?Tinte|\b2-3\s*Werktage?\b|\b2-4\s*Werktage?\b|\b3-5\s*Werktage?\b/gi

async function main() {
  const docs = await sanity.fetch<CityPageDoc[]>(
    `*[_type == "cityPage"]{ _id, cityId, language, bodySections[]{ heading, body } }`,
  )

  let totalMatches = 0
  for (const doc of docs) {
    const matches: { heading: string; paragraph: string; match: string }[] = []
    for (const sec of doc.bodySections ?? []) {
      for (const block of sec.body ?? []) {
        const text = (block.children ?? []).map((c) => c.text ?? '').join('')
        const found = text.match(PAPER_RE)
        if (found && found.length > 0) {
          matches.push({
            heading: sec.heading ?? '(no heading)',
            paragraph: text.length > 200 ? text.slice(0, 200) + '…' : text,
            match: found.join(', '),
          })
        }
      }
    }
    if (matches.length > 0) {
      console.log(`\n=== ${doc._id} (${doc.cityId} / ${doc.language}) ===`)
      for (const m of matches) {
        console.log(`  • [${m.heading}] matched: ${m.match}`)
        console.log(`    paragraph: ${m.paragraph}`)
      }
      totalMatches += matches.length
    }
  }

  console.log(`\n--- Summary ---`)
  console.log(`Docs scanned: ${docs.length}`)
  console.log(`Total matches: ${totalMatches}`)
}

main().catch((err) => {
  console.error('fatal:', err instanceof Error ? err.message : err)
  process.exit(1)
})
