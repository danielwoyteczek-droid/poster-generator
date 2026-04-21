import type { GeneratedArticle } from './claude'
import { countHeadingLevel, countInternalLinks, wordCount } from './markdown'

const MIN_WORDS = 350
const MAX_WORDS = 900
const MIN_H2 = 2
const MIN_INTERNAL_LINKS = 1
const MAX_EXCERPT_LEN = 180
const MIN_EXCERPT_LEN = 80

export interface QualityReport {
  ok: boolean
  issues: string[]
}

export function checkQuality(article: GeneratedArticle): QualityReport {
  const issues: string[] = []

  const words = wordCount(article.body_markdown)
  if (words < MIN_WORDS) issues.push(`Zu kurz: ${words} Wörter (Minimum ${MIN_WORDS}).`)
  if (words > MAX_WORDS) issues.push(`Zu lang: ${words} Wörter (Maximum ${MAX_WORDS}).`)

  const h2 = countHeadingLevel(article.body_markdown, 2)
  if (h2 < MIN_H2) issues.push(`Zu wenige H2-Überschriften: ${h2} (Minimum ${MIN_H2}).`)

  const internalLinks = countInternalLinks(article.body_markdown)
  if (internalLinks < MIN_INTERNAL_LINKS) {
    issues.push(`Keine internen Links gefunden (Minimum ${MIN_INTERNAL_LINKS}).`)
  }

  if (!article.title || article.title.length > 120) {
    issues.push(`Titel fehlt oder ist zu lang (max 120 Zeichen).`)
  }

  if (!article.slug || !/^[a-z0-9-]+$/.test(article.slug)) {
    issues.push(`Slug ungültig: "${article.slug}" (nur a-z, 0-9, Bindestrich).`)
  }

  if (!article.excerpt || article.excerpt.length < MIN_EXCERPT_LEN || article.excerpt.length > MAX_EXCERPT_LEN) {
    issues.push(`Excerpt-Länge außerhalb ${MIN_EXCERPT_LEN}-${MAX_EXCERPT_LEN} Zeichen (aktuell ${article.excerpt?.length ?? 0}).`)
  }

  if (!article.tags || article.tags.length < 2) {
    issues.push(`Zu wenige Tags (Minimum 2).`)
  }

  return { ok: issues.length === 0, issues }
}
