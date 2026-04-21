#!/usr/bin/env tsx
/**
 * Publish a Sanity blog draft by ID.
 *
 * Usage:
 *   npm run blog:publish -- --id <draftId>
 */

import { parseArgs } from 'node:util'
import { sanity } from './lib/sanity'

async function main() {
  const { values } = parseArgs({
    options: { id: { type: 'string' } },
  })
  if (!values.id) {
    console.error('Missing --id')
    process.exit(1)
  }

  const draftId = values.id.startsWith('drafts.') ? values.id : `drafts.${values.id}`
  const publishedId = draftId.replace(/^drafts\./, '')

  const draft = await sanity.getDocument(draftId)
  if (!draft) {
    console.error(`Draft not found: ${draftId}`)
    process.exit(1)
  }

  const publishedDoc = { ...draft, _id: publishedId }
  await sanity.createOrReplace(publishedDoc)
  await sanity.delete(draftId)
  console.log(`Published: ${publishedId}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
