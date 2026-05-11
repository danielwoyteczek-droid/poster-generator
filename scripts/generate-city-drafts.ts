#!/usr/bin/env tsx
/**
 * PROJ-42: Bulk-generate city-body-drafts and upsert to Sanity.
 *
 * Same logic as /api/admin/cities/:id/body-draft, but as a CLI tool so the
 * operator can run it for many cities at once without juggling admin
 * cookies. Reuses ANTHROPIC_API_KEY + SANITY_API_WRITE_TOKEN +
 * SUPABASE_SECRET_KEY from .env.local.
 *
 * Usage:
 *   npm run drafts:cities -- --locale de
 *   npm run drafts:cities -- --locale de --country DE --overwrite
 *   npm run drafts:cities -- --locale de --slug-bases hamburg,koeln
 *
 * Flags:
 *   --locale <code>           required; one of de|en|fr|it|es
 *   --country <ISO>           optional; filter cities by country_code
 *   --slug-bases <a,b,c>      optional; only generate for listed slug_bases
 *   --overwrite               optional; replace existing cityPage docs
 *   --model <claude-id>       optional; default claude-sonnet-4-6
 *
 * Idempotent: without --overwrite, skips cities that already have a Sanity
 * cityPage-Doc (deterministic doc-id: cityPage-<locale>-<slug_base>).
 */

import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { createClient as createSanityClient } from '@sanity/client'
import Anthropic from '@anthropic-ai/sdk'
import { config as loadEnv } from 'dotenv'
import crypto from 'node:crypto'

loadEnv({ path: '.env.local' })

const LOCALES = ['de', 'en', 'fr', 'it', 'es'] as const
type Locale = (typeof LOCALES)[number]

const LOCALE_NAMES: Record<Locale, string> = {
  de: 'Deutsch',
  en: 'English',
  fr: 'Français',
  it: 'Italiano',
  es: 'Español',
}

const LOCALE_SLUG_PREFIX: Record<Locale, string> = {
  de: 'stadtkarte',
  en: 'city-map',
  fr: 'carte-de',
  it: 'mappa-citta',
  es: 'mapa-ciudad',
}

interface CitySeed {
  id: string
  slug_base: string
  name: string
  country_code: string
  region: string | null
  population: number | null
}

interface ClaudeBodyDraft {
  pageTitle: string
  pageSubline: string
  metaTitle: string
  metaDescription: string
  bodySections: Array<{ heading: string; body: string }>
}

const SYSTEM_PROMPT = `Du bist ein erfahrener Marketing-Texter, der SEO-optimierte Stadt-Landingpages fuer einen Karten-Poster-Shop schreibt. Stadt-Spezifika (Wahrzeichen, Stadtteile, lokale Identitaet) muessen konkret und faktisch korrekt sein — keine generischen Floskeln. Schreibe in der vom User vorgegebenen Sprache, niemals in Deutsch wenn eine andere Locale verlangt wurde.

Antworte AUSSCHLIESSLICH mit einem JSON-Objekt im folgenden Format (keine Erklaerung, kein Markdown-Code-Fence):
{
  "pageTitle": "H1, max 80 Zeichen, Keyword + Stadt",
  "pageSubline": "Sub-Headline, 1-2 Saetze (max 200 Zeichen)",
  "metaTitle": "SEO-Title, max 60 Zeichen",
  "metaDescription": "SEO-Description mit konkretem Versprechen (Format/Versand/CTA), max 160 Zeichen",
  "bodySections": [
    { "heading": "H2 z. B. 'Wahrzeichen' / 'Geschichte' / 'Stadtviertel'", "body": "1-2 Absaetze, ~80-120 Woerter" },
    ... (insgesamt 2-3 Sektionen, total ~200-300 Woerter)
  ]
}`

function buildUserPrompt(city: CitySeed, locale: Locale): string {
  const populationStr =
    city.population && city.population > 0
      ? `~${city.population.toLocaleString('de-DE')} Einwohner`
      : 'unbekannte Einwohnerzahl'
  const regionStr = city.region ? `, ${city.region}` : ''
  return `Schreibe die Inhalte fuer eine Stadt-Landingpage zu ${city.name} (${city.country_code}${regionStr}, ${populationStr}) in der Sprache: ${LOCALE_NAMES[locale]}.

Kontext: Die Seite bewirbt personalisierte Stadtkarten-Poster fuer ${city.name}. Nutzer sehen 3 Style-Varianten der Karte und einen CTA in den Editor. Body soll emotional abholen, konkrete Stadt-Spezifika nennen (Wahrzeichen, Stadtviertel, lokale Identitaet) und 200-300 Woerter total umfassen.

Pflicht: Faktisch korrekte Wahrzeichen-/Stadtteile-Namen. Keine generischen Stadt-Phrasen. Keyword "Stadtkarte ${city.name}" (DE) bzw. die jeweilige Locale-Variante muss in pageTitle und metaTitle vorkommen.`
}

function extractJson(text: string): unknown {
  const match = text.match(/\{[\s\S]*\}/)
  if (!match) throw new Error('Claude-Antwort enthielt kein JSON-Objekt')
  return JSON.parse(match[0])
}

function validateDraft(data: unknown): ClaudeBodyDraft {
  if (!data || typeof data !== 'object') throw new Error('Claude-Antwort ist kein Objekt')
  const obj = data as Record<string, unknown>
  for (const f of ['pageTitle', 'pageSubline', 'metaTitle', 'metaDescription'] as const) {
    if (typeof obj[f] !== 'string') throw new Error(`Pflichtfeld fehlt oder ist kein String: ${f}`)
  }
  if (!Array.isArray(obj.bodySections) || obj.bodySections.length < 1 || obj.bodySections.length > 4) {
    throw new Error('bodySections muss ein Array mit 1-4 Eintraegen sein')
  }
  const sections = (obj.bodySections as unknown[]).map((s, i) => {
    if (!s || typeof s !== 'object') throw new Error(`bodySections[${i}] ist kein Objekt`)
    const sec = s as Record<string, unknown>
    if (typeof sec.heading !== 'string' || typeof sec.body !== 'string') {
      throw new Error(`bodySections[${i}] braucht heading + body als Strings`)
    }
    return { heading: sec.heading, body: sec.body }
  })
  return {
    pageTitle: String(obj.pageTitle).slice(0, 120),
    pageSubline: String(obj.pageSubline).slice(0, 280),
    metaTitle: String(obj.metaTitle).slice(0, 60),
    metaDescription: String(obj.metaDescription).slice(0, 160),
    bodySections: sections,
  }
}

function toPortableText(plain: string, keyPrefix: string): unknown[] {
  const paragraphs = plain.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean)
  return paragraphs.map((p, i) => ({
    _type: 'block',
    _key: `${keyPrefix}-p${i}`,
    style: 'normal',
    markDefs: [],
    children: [
      {
        _type: 'span',
        _key: `${keyPrefix}-p${i}-s`,
        text: p,
        marks: [] as string[],
      },
    ],
  }))
}

function parseArgs(argv: string[]) {
  const args: Record<string, string | boolean> = {}
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (!a.startsWith('--')) continue
    const key = a.slice(2)
    const next = argv[i + 1]
    if (!next || next.startsWith('--')) {
      args[key] = true
    } else {
      args[key] = next
      i++
    }
  }
  return args
}

function required(name: string): string {
  const v = process.env[name]
  if (!v || v.length === 0) {
    console.error(`[generate-city-drafts] Missing env var: ${name}`)
    process.exit(1)
  }
  return v
}

async function main() {
  const args = parseArgs(process.argv.slice(2))

  const locale = args.locale as Locale | undefined
  if (!locale || !LOCALES.includes(locale)) {
    console.error(`[generate-city-drafts] --locale required, one of ${LOCALES.join('|')}`)
    process.exit(1)
  }

  const country = typeof args.country === 'string' ? args.country : null
  const slugBases =
    typeof args['slug-bases'] === 'string'
      ? (args['slug-bases'] as string).split(',').map((s) => s.trim()).filter(Boolean)
      : null
  const overwrite = args.overwrite === true
  const model = (typeof args.model === 'string' ? args.model : 'claude-sonnet-4-6')

  const supabaseUrl = required('NEXT_PUBLIC_SUPABASE_URL')
  const supabaseKey = required('SUPABASE_SECRET_KEY')
  const anthropicKey = required('ANTHROPIC_API_KEY')
  const sanityProjectId = required('NEXT_PUBLIC_SANITY_PROJECT_ID')
  const sanityDataset = process.env.NEXT_PUBLIC_SANITY_DATASET ?? 'production'
  const sanityToken = required('SANITY_API_WRITE_TOKEN')

  const supabase = createSupabaseClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const sanity = createSanityClient({
    projectId: sanityProjectId,
    dataset: sanityDataset,
    apiVersion: '2024-10-01',
    token: sanityToken,
    useCdn: false,
  })
  const anthropic = new Anthropic({ apiKey: anthropicKey })

  // 1. Resolve cities.
  let query = supabase.from('cities').select('id, slug_base, name, country_code, region, population')
  if (country) query = query.eq('country_code', country)
  if (slugBases && slugBases.length > 0) query = query.in('slug_base', slugBases)
  const { data: cities, error } = await query
  if (error) {
    console.error(`[generate-city-drafts] cities query failed: ${error.message}`)
    process.exit(1)
  }
  if (!cities || cities.length === 0) {
    console.error('[generate-city-drafts] no matching cities')
    process.exit(1)
  }

  console.log(`[generate-city-drafts] Locale=${locale} | ${cities.length} cities | model=${model} | overwrite=${overwrite}`)

  let okCount = 0
  let skipCount = 0
  let failCount = 0
  let totalIn = 0
  let totalOut = 0

  for (const c of cities as CitySeed[]) {
    const docId = `cityPage-${locale}-${c.slug_base}`
    process.stdout.write(`  → ${c.name} (${c.slug_base})… `)

    // 2. Existing doc?
    const existing = await sanity.fetch<{ _id: string } | null>(
      `*[_id == $id][0]{ _id }`,
      { id: docId },
    )
    if (existing && !overwrite) {
      console.log('skip (exists)')
      skipCount++
      continue
    }

    // 3. Claude.
    let draft: ClaudeBodyDraft
    let usage: { input_tokens: number; output_tokens: number } | null = null
    try {
      const response = await anthropic.messages.create({
        model,
        max_tokens: 2048,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: buildUserPrompt(c, locale) }],
      })
      usage = response.usage
      const textBlock = response.content.find((b) => b.type === 'text')
      if (!textBlock || textBlock.type !== 'text') throw new Error('no text block in response')
      const parsed = extractJson(textBlock.text)
      draft = validateDraft(parsed)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.log(`FAIL (claude): ${msg}`)
      failCount++
      continue
    }

    // 4. Sanity write.
    const suggestedSlug = `${LOCALE_SLUG_PREFIX[locale]}-${c.slug_base}`
    const docPayload = {
      _id: docId,
      _type: 'cityPage' as const,
      language: locale,
      cityId: c.slug_base,
      slug: { _type: 'slug' as const, current: suggestedSlug },
      pageTitle: draft.pageTitle,
      pageSubline: draft.pageSubline,
      bodySections: draft.bodySections.map((s, idx) => ({
        _key: `${docId}-s${idx}`,
        _type: 'object' as const,
        heading: s.heading,
        body: toPortableText(s.body, `${docId}-s${idx}`),
      })),
      metaTitle: draft.metaTitle,
      metaDescription: draft.metaDescription,
      aiDraftStatus: 'draft' as const,
    }

    try {
      if (existing) {
        await sanity.createOrReplace(docPayload)
      } else {
        await sanity.create(docPayload)
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.log(`FAIL (sanity): ${msg}`)
      failCount++
      continue
    }

    okCount++
    if (usage) {
      totalIn += usage.input_tokens
      totalOut += usage.output_tokens
    }
    console.log(`✓ slug=${suggestedSlug} | tokens=${usage?.input_tokens}/${usage?.output_tokens}`)

    // Small pacing delay so we don't hammer the Anthropic API.
    await new Promise((r) => setTimeout(r, 250))
  }

  console.log('\n--- Summary ---')
  console.log(`OK:    ${okCount}`)
  console.log(`Skip:  ${skipCount}`)
  console.log(`Fail:  ${failCount}`)
  console.log(`Tokens total: ${totalIn} in / ${totalOut} out`)
  // Claude Sonnet 4.6 pricing: $3/M input, $15/M output.
  const cost = (totalIn / 1_000_000) * 3 + (totalOut / 1_000_000) * 15
  console.log(`Est. cost: $${cost.toFixed(4)} USD (assumes Sonnet 4.6 pricing)`)
  console.log(`\nNote: aiDraftStatus="draft" — review the docs in Sanity Studio before publishing.`)
}

main().catch((err) => {
  const msg = err instanceof Error ? err.message : String(err)
  console.error(`[generate-city-drafts] fatal: ${msg}`)
  process.exit(1)
})
