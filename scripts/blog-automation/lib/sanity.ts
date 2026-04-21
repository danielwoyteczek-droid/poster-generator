import { createClient } from '@sanity/client'
import { env } from './env'

export const sanity = createClient({
  projectId: env.sanityProjectId,
  dataset: env.sanityDataset,
  apiVersion: '2024-10-01',
  token: env.sanityWriteToken,
  useCdn: false,
})

export interface BlogTopicDoc {
  _id: string
  topic: string
  targetKeyword: string
  category?: string
  status: 'planned' | 'drafted' | 'published' | 'skipped'
  priority?: number
  notes?: string
  generatedPost?: { _ref: string }
}

export async function pickNextTopic(): Promise<BlogTopicDoc | null> {
  const result = await sanity.fetch<BlogTopicDoc | null>(
    `*[_type == "blogTopic" && status == "planned"] | order(priority asc, _createdAt asc)[0]`,
  )
  return result
}

export async function markTopicDrafted(topicId: string, postId: string) {
  await sanity
    .patch(topicId)
    .set({ status: 'drafted', generatedPost: { _ref: postId, _type: 'reference' } })
    .commit()
}

export async function markTopicError(topicId: string, message: string) {
  await sanity.patch(topicId).set({ lastError: message }).commit()
}

export async function existingTitles(): Promise<string[]> {
  const titles = await sanity.fetch<string[]>(`*[_type == "blogPost"].title`)
  return titles ?? []
}

interface CreateDraftInput {
  title: string
  slug: string
  excerpt: string
  tags: string[]
  bodyPortableText: unknown[]
}

export async function createBlogDraft(input: CreateDraftInput): Promise<string> {
  // drafts.* prefix marks the doc as a Sanity draft
  const draftId = `drafts.${crypto.randomUUID()}`
  const doc = {
    _id: draftId,
    _type: 'blogPost',
    title: input.title,
    slug: { _type: 'slug', current: input.slug },
    excerpt: input.excerpt,
    tags: input.tags,
    publishedAt: new Date().toISOString(),
    body: input.bodyPortableText,
  }
  const result = await sanity.create(doc)
  return result._id
}
