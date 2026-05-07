import { cache } from 'react'
import { sanityClient } from '@/sanity/client'
import { OCCASION_CODES, occasionLabels, type OccasionCode } from './occasions'

/**
 * PROJ-29 Iteration 2: Sanity-driven occasion list.
 *
 * Source of truth is the `occasion`-Doc-Type in Sanity. This helper
 * fetches the published list once per request (cached via React's
 * `cache()`) and falls back to the hardcoded list in `occasions.ts`
 * if Sanity is empty or unreachable — so existing code paths keep
 * working even if the seed wasn't run.
 *
 * Server-only — uses the Sanity client. Client components consume the
 * list via `/api/occasions` + `useOccasions()` hook.
 */
export interface OccasionEntry {
  code: string
  title: string
  displayOrder: number
  /** Per-locale title; missing locales fall back to `title` (DE default). */
  localizedTitles: Record<'de' | 'en' | 'fr' | 'it' | 'es', string>
}

const LOCALES = ['de', 'en', 'fr', 'it', 'es'] as const

interface SanityOccasionDoc {
  code: { current: string }
  title: string
  displayOrder?: number
  localizedTitles?: Array<{ locale: string; title: string }>
}

function fallback(): OccasionEntry[] {
  return OCCASION_CODES.map((code, idx) => {
    const labels = occasionLabels[code as OccasionCode]
    const localized: OccasionEntry['localizedTitles'] = {
      de: labels.de,
      en: labels.en,
      fr: labels.fr,
      it: labels.it,
      es: labels.es,
    }
    return {
      code,
      title: labels.de,
      displayOrder: (idx + 1) * 10,
      localizedTitles: localized,
    }
  })
}

function normalize(doc: SanityOccasionDoc): OccasionEntry {
  const code = doc.code?.current
  const fallbackTitle = doc.title ?? code ?? '(ohne Titel)'
  const localized: OccasionEntry['localizedTitles'] = {
    de: fallbackTitle,
    en: fallbackTitle,
    fr: fallbackTitle,
    it: fallbackTitle,
    es: fallbackTitle,
  }
  for (const lt of doc.localizedTitles ?? []) {
    if (LOCALES.includes(lt.locale as (typeof LOCALES)[number])) {
      localized[lt.locale as keyof typeof localized] = lt.title
    }
  }
  return {
    code,
    title: doc.title,
    displayOrder: doc.displayOrder ?? 99,
    localizedTitles: localized,
  }
}

export const getOccasions = cache(async (): Promise<OccasionEntry[]> => {
  try {
    const docs = await sanityClient.fetch<SanityOccasionDoc[]>(
      `*[_type == "occasion" && defined(code.current)] | order(displayOrder asc, title asc) { code, title, displayOrder, localizedTitles }`,
    )
    if (!docs || docs.length === 0) return fallback()
    return docs.map(normalize).filter((o) => Boolean(o.code))
  } catch (err) {
    console.warn('[occasions-server] Sanity fetch failed, using hardcoded fallback:', err)
    return fallback()
  }
})

export async function getOccasionCodes(): Promise<string[]> {
  const list = await getOccasions()
  return list.map((o) => o.code)
}
