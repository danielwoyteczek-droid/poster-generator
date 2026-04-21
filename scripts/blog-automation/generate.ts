#!/usr/bin/env tsx
/**
 * Generate a single blog article from a topic and save it as a Sanity draft.
 *
 * Usage:
 *   npm run blog:generate -- --topic "Hochzeitstag 5 Jahre" --keyword "hochzeitstag 5 jahre geschenk"
 *   npm run blog:generate -- --from-queue        (picks next planned topic from Sanity)
 */

import { parseArgs } from 'node:util'
import { generateArticle } from './lib/claude'
import { checkQuality } from './lib/quality'
import { markdownToPortableText } from './lib/markdown'
import {
  createBlogDraft,
  existingTitles,
  markTopicDrafted,
  markTopicError,
  pickNextTopic,
} from './lib/sanity'
import { checkBudget, getMonthlySpend, recordSpend } from './lib/budget'
import { notifyBudgetExceeded, notifyDraftReady } from './lib/notify'
import { env } from './lib/env'

const MAX_ATTEMPTS = 2

async function main() {
  const { values } = parseArgs({
    options: {
      topic: { type: 'string' },
      keyword: { type: 'string' },
      category: { type: 'string' },
      notes: { type: 'string' },
      'from-queue': { type: 'boolean', default: false },
      model: { type: 'string' },
    },
  })

  const budget = await checkBudget()
  if (!budget.ok) {
    console.error(`Budget exceeded: $${budget.spent.toFixed(2)} / $${budget.cap.toFixed(2)}`)
    await notifyBudgetExceeded(budget.spent, budget.cap)
    process.exit(2)
  }

  let topicId: string | undefined
  let topic: string
  let targetKeyword: string
  let category: string | undefined
  let notes: string | undefined

  if (values['from-queue']) {
    const next = await pickNextTopic()
    if (!next) {
      console.log('No planned topics in queue. Nothing to do.')
      return
    }
    topicId = next._id
    topic = next.topic
    targetKeyword = next.targetKeyword
    category = next.category
    notes = next.notes
    console.log(`Picked from queue: "${topic}" (priority ${next.priority ?? '—'})`)
  } else {
    if (!values.topic || !values.keyword) {
      console.error('Missing --topic or --keyword. Use --from-queue or provide both flags.')
      process.exit(1)
    }
    topic = values.topic
    targetKeyword = values.keyword
    category = values.category
    notes = values.notes
  }

  const existing = await existingTitles()

  let lastError: Error | null = null
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      console.log(`Attempt ${attempt}: generating article…`)
      const article = await generateArticle({
        topic,
        targetKeyword,
        category,
        notes,
        existingTitles: existing,
        model: values.model,
      })

      const quality = checkQuality(article)
      if (!quality.ok) {
        const msg = `Quality check failed:\n  - ${quality.issues.join('\n  - ')}`
        console.warn(msg)
        lastError = new Error(msg)
        if (attempt === MAX_ATTEMPTS) break
        continue
      }

      const duplicate = existing.some((t) => t.trim().toLowerCase() === article.title.trim().toLowerCase())
      if (duplicate) {
        const msg = `Duplicate title detected: "${article.title}". Skipping.`
        console.warn(msg)
        lastError = new Error(msg)
        if (attempt === MAX_ATTEMPTS) break
        continue
      }

      const body = markdownToPortableText(article.body_markdown)
      const postId = await createBlogDraft({
        title: article.title,
        slug: article.slug,
        excerpt: article.excerpt,
        tags: article.tags,
        bodyPortableText: body,
      })
      console.log(`Draft created: ${postId}`)

      if (topicId) {
        await markTopicDrafted(topicId, postId.replace(/^drafts\./, ''))
      }

      const monthlySpend = await getMonthlySpend()
      await notifyDraftReady({
        title: article.title,
        excerpt: article.excerpt,
        costUsd: 0,
        monthlySpend,
        monthlyCap: env.monthlyBudgetUsd,
      })
      console.log('Notification sent.')
      return
    } catch (err) {
      const e = err instanceof Error ? err : new Error(String(err))
      console.error(`Attempt ${attempt} failed: ${e.message}`)
      lastError = e
    }
  }

  if (topicId && lastError) {
    await markTopicError(topicId, lastError.message)
  }
  console.error('All attempts failed.')
  process.exit(1)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
