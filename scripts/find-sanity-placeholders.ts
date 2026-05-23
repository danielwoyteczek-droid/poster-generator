#!/usr/bin/env tsx
/**
 * Scan all editorial Sanity docs for unreplaced placeholders.
 * Flags: bracketed slots like [dein Name], TODO/TBD/PLACEHOLDER/XXX markers,
 * mustache-style {{var}}, "Lorem ipsum".
 *
 * Run: npx tsx scripts/find-sanity-placeholders.ts
 */

import { createClient as createSanityClient } from '@sanity/client'
import { config as loadEnv } from 'dotenv'

loadEnv({ path: '.env.local' })

const sanity = createSanityClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET ?? 'production',
  apiVersion: '2024-10-01',
  token: process.env.SANITY_API_WRITE_TOKEN,
  useCdn: false,
  perspective: 'published',
})

// Match unreplaced placeholders. Brackets are the dominant pattern in this
// project's draft copy ("[dein Name / euer Team]"), plus the usual suspects.
// Note: dev markers (TODO/TBD/etc.) are case-sensitive caps-only — lowercase
// "todo" is Spanish for "all/everything" and "tbd" appears in normal copy.
const PLACEHOLDER_RE =
  /\[[^\]]{2,80}\]|\{\{[^}]{1,80}\}\}|\b(?:TODO|TBD|FIXME|PLACEHOLDER|XXX)\b|Lorem ipsum/g

// False-positive bracket patterns we want to ignore (links, numeric refs, etc).
const IGNORE_BRACKET = /^\[(?:\d+|https?:\/\/|mailto:|#|\^|x|\s)/i

function isRealMatch(match: string): boolean {
  if (match.startsWith('[')) return !IGNORE_BRACKET.test(match)
  return true
}

// Recursively walk any value and collect string leaves with a path label.
type Leaf = { path: string; text: string }
function collectStrings(node: unknown, path: string, out: Leaf[]): void {
  if (node == null) return
  if (typeof node === 'string') {
    if (node.length > 0) out.push({ path, text: node })
    return
  }
  if (Array.isArray(node)) {
    node.forEach((item, i) => collectStrings(item, `${path}[${i}]`, out))
    return
  }
  if (typeof node === 'object') {
    for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
      // Skip internal Sanity fields and references.
      if (k.startsWith('_') && k !== '_type') continue
      if (k === 'asset') continue
      collectStrings(v, path ? `${path}.${k}` : k, out)
    }
  }
}

const TYPES = [
  'aboutPage',
  'homepage',
  'galleryPage',
  'blogPost',
  'faqItem',
  'legalPage',
  'occasionPage',
  'cityPage',
  'siteSettings',
] as const

async function main() {
  const args = new Set(process.argv.slice(2))
  const verbose = args.has('--verbose') || args.has('-v')

  let grandTotal = 0
  const summary: Record<string, number> = {}

  for (const type of TYPES) {
    const docs = await sanity.fetch<Array<Record<string, unknown>>>(
      `*[_type == $type]{ ..., _id, _type, language, title, slug }`,
      { type },
    )
    if (docs.length === 0) {
      if (verbose) console.log(`(no ${type} docs)`)
      continue
    }

    let typeHits = 0
    for (const doc of docs) {
      const leaves: Leaf[] = []
      collectStrings(doc, '', leaves)

      const matches: Array<{ path: string; match: string; snippet: string }> = []
      for (const leaf of leaves) {
        const found = leaf.text.match(PLACEHOLDER_RE)
        if (!found) continue
        const real = found.filter(isRealMatch)
        if (real.length === 0) continue
        const snippet =
          leaf.text.length > 180 ? leaf.text.slice(0, 180) + '…' : leaf.text
        for (const m of real) {
          matches.push({ path: leaf.path, match: m, snippet })
        }
      }

      if (matches.length > 0) {
        const lang = (doc.language as string) ?? '—'
        const title =
          (doc.title as string) ??
          ((doc.slug as { current?: string })?.current ?? '')
        console.log(
          `\n=== [${doc._type}] ${doc._id} (lang=${lang})${title ? ` — "${title}"` : ''} ===`,
        )
        for (const m of matches) {
          console.log(`  • ${m.path}`)
          console.log(`    match:   ${m.match}`)
          console.log(`    context: ${m.snippet}`)
        }
        typeHits += matches.length
      }
    }

    if (typeHits > 0) summary[type] = typeHits
    grandTotal += typeHits
  }

  console.log('\n--- Summary ---')
  if (grandTotal === 0) {
    console.log('No placeholders found across editorial Sanity content.')
  } else {
    for (const [type, count] of Object.entries(summary)) {
      console.log(`  ${type}: ${count}`)
    }
    console.log(`Total: ${grandTotal}`)
  }
}

main().catch((err) => {
  console.error('fatal:', err instanceof Error ? err.message : err)
  process.exit(1)
})
