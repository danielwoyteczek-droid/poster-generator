import Anthropic from '@anthropic-ai/sdk'
import { env } from './env'
import { SYSTEM_PROMPT, userPrompt } from './prompts'
import { recordSpend } from './budget'

const client = new Anthropic({ apiKey: env.anthropicApiKey })

export interface GeneratedArticle {
  title: string
  slug: string
  excerpt: string
  tags: string[]
  body_markdown: string
}

function extractJson(text: string): unknown {
  // Try to find the first JSON object in the response
  const match = text.match(/\{[\s\S]*\}/)
  if (!match) throw new Error('Claude response did not contain JSON')
  return JSON.parse(match[0])
}

function validateArticle(data: unknown): GeneratedArticle {
  if (!data || typeof data !== 'object') throw new Error('Article JSON is not an object')
  const obj = data as Record<string, unknown>
  const required = ['title', 'slug', 'excerpt', 'tags', 'body_markdown']
  for (const field of required) {
    if (!(field in obj)) throw new Error(`Missing field: ${field}`)
  }
  if (!Array.isArray(obj.tags)) throw new Error('tags must be an array')
  return {
    title: String(obj.title),
    slug: String(obj.slug),
    excerpt: String(obj.excerpt),
    tags: (obj.tags as unknown[]).map(String),
    body_markdown: String(obj.body_markdown),
  }
}

export async function generateArticle(input: {
  topic: string
  targetKeyword: string
  category?: string
  notes?: string
  existingTitles: string[]
  model?: string
}): Promise<GeneratedArticle> {
  const model = input.model ?? env.defaultModel
  const response = await client.messages.create({
    model,
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: userPrompt({
          topic: input.topic,
          targetKeyword: input.targetKeyword,
          category: input.category,
          notes: input.notes,
          existingTitles: input.existingTitles,
        }),
      },
    ],
  })

  await recordSpend({
    timestamp: new Date().toISOString(),
    topic: input.topic,
    model,
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
  })

  const textBlock = response.content.find((b) => b.type === 'text')
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('Claude response had no text content')
  }
  const parsed = extractJson(textBlock.text)
  return validateArticle(parsed)
}
