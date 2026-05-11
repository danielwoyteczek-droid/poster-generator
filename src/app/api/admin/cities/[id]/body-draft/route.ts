import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import Anthropic from '@anthropic-ai/sdk'
import { requireAdmin } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase-admin'
import { sanityPreviewClient } from '@/sanity/client'
import { suggestCitySlug } from '@/lib/city-routing'
import { locales, type Locale } from '@/i18n/config'

/**
 * PROJ-42: Admin AI Body-Draft Generator.
 *
 * POST /api/admin/cities/:id/body-draft
 *
 * Body:
 *   { locale: 'de'|'en'|'fr'|'it'|'es'
 *     overwrite?: boolean   // default false; wenn das Sanity-Doc bereits
 *                           // existiert, wird ohne overwrite=true 409 zurueckgegeben
 *     model?: string        // optional Claude-Modell-Override
 *   }
 *
 * Wirkung:
 *   1. Liest Stadt aus DB.
 *   2. Ruft Claude (Sonnet) mit Prompt-Template (Wahrzeichen, Geschichte,
 *      Stadtviertel) in der angefragten Locale auf.
 *   3. Parsed JSON-Antwort.
 *   4. Upsertet ein Sanity-cityPage-Doc mit den generierten Feldern,
 *      `aiDraftStatus = 'draft'`. Slug = suggestCitySlug() falls neu.
 *
 * Kein internes Budget-Tracking — wir verlassen uns auf den Anthropic-
 * Account-Spend-Cap (per User-Entscheidung 2026-05-10).
 *
 * Voraussetzungen (env):
 *   - ANTHROPIC_API_KEY
 *   - SANITY_API_WRITE_TOKEN (bereits fuer sanityPreviewClient genutzt)
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const BodySchema = z.object({
  locale: z.enum(locales),
  overwrite: z.boolean().optional(),
  model: z.string().optional(),
})

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

function buildUserPrompt(input: {
  cityName: string
  cityCountry: string
  cityRegion: string | null
  cityPopulation: number | null
  locale: Locale
}): string {
  const localeNames: Record<Locale, string> = {
    de: 'Deutsch',
    en: 'English',
    fr: 'Français',
    it: 'Italiano',
    es: 'Español',
  }
  const populationStr =
    input.cityPopulation && input.cityPopulation > 0
      ? `~${input.cityPopulation.toLocaleString('de-DE')} Einwohner`
      : 'unbekannte Einwohnerzahl'
  const regionStr = input.cityRegion ? `, ${input.cityRegion}` : ''
  return `Schreibe die Inhalte fuer eine Stadt-Landingpage zu ${input.cityName} (${input.cityCountry}${regionStr}, ${populationStr}) in der Sprache: ${localeNames[input.locale]}.

Kontext: Die Seite bewirbt personalisierte Stadtkarten-Poster fuer ${input.cityName}. Nutzer sehen 3 Style-Varianten der Karte und einen CTA in den Editor. Body soll emotional abholen, konkrete Stadt-Spezifika nennen (Wahrzeichen, Stadtviertel, lokale Identitaet) und 200-300 Woerter total umfassen.

Pflicht: Faktisch korrekte Wahrzeichen-/Stadtteile-Namen. Keine generischen Stadt-Phrasen. Keyword "Stadtkarte ${input.cityName}" (DE) bzw. die jeweilige Locale-Variante muss in pageTitle und metaTitle vorkommen.`
}

function extractJson(text: string): unknown {
  const match = text.match(/\{[\s\S]*\}/)
  if (!match) throw new Error('Claude-Antwort enthielt kein JSON-Objekt')
  return JSON.parse(match[0])
}

function validateDraft(data: unknown): ClaudeBodyDraft {
  if (!data || typeof data !== 'object') {
    throw new Error('Claude-Antwort ist kein Objekt')
  }
  const obj = data as Record<string, unknown>
  const requiredStrings = ['pageTitle', 'pageSubline', 'metaTitle', 'metaDescription'] as const
  for (const f of requiredStrings) {
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

/**
 * Wandelt einen Markdown/Plain-Text-Body in ein einfaches Sanity Portable
 * Text Array um (1 Block pro Absatz). Reicht fuer Claude-Output, der
 * meist plain-Text mit Doppel-Newline-Trennung produziert.
 */
function toPortableText(plain: string): unknown[] {
  const paragraphs = plain.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean)
  return paragraphs.map((p) => ({
    _type: 'block',
    _key: Math.random().toString(36).slice(2, 10),
    style: 'normal',
    markDefs: [],
    children: [
      {
        _type: 'span',
        _key: Math.random().toString(36).slice(2, 10),
        text: p,
        marks: [],
      },
    ],
  }))
}

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: 'Forbidden' }, { status: auth.status })

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: 'ANTHROPIC_API_KEY fehlt — AI-Draft-Tool nicht konfiguriert.' },
      { status: 500 },
    )
  }
  const writeToken = process.env.SANITY_API_WRITE_TOKEN
  if (!writeToken) {
    return NextResponse.json(
      { error: 'SANITY_API_WRITE_TOKEN fehlt — kann nicht in Sanity schreiben.' },
      { status: 500 },
    )
  }

  const { id } = await context.params
  if (!UUID.test(id)) return NextResponse.json({ error: 'Invalid city id' }, { status: 400 })

  const body = await req.json().catch(() => null)
  const parsed = BodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid body', details: parsed.error.flatten() },
      { status: 400 },
    )
  }
  const { locale, overwrite, model } = parsed.data

  // 1. Stadt aus DB laden.
  const admin = createAdminClient()
  const { data: city, error: cityErr } = await admin
    .from('cities')
    .select('id, slug_base, name, country_code, region, population')
    .eq('id', id)
    .single()
  if (cityErr || !city) {
    return NextResponse.json({ error: 'City not found' }, { status: 404 })
  }

  // 2. Existierendes Sanity-Doc pruefen (deterministische ID-Konvention).
  const docId = `cityPage-${locale}-${city.slug_base}`
  const existing = await sanityPreviewClient.fetch<{ _id: string } | null>(
    `*[_id == $id][0]{ _id }`,
    { id: docId },
  )
  if (existing && !overwrite) {
    return NextResponse.json(
      {
        error: 'cityPage-Doc existiert bereits',
        doc_id: docId,
        hint: 'Setze overwrite=true im Body, um den AI-Draft den bestehenden Inhalt ueberschreiben zu lassen. Manuelle Edits gehen dabei verloren.',
      },
      { status: 409 },
    )
  }

  // 3. Claude aufrufen.
  const client = new Anthropic({ apiKey })
  const chosenModel = model ?? 'claude-sonnet-4-6'
  let draft: ClaudeBodyDraft
  let usage: { input_tokens: number; output_tokens: number } | null = null
  try {
    const response = await client.messages.create({
      model: chosenModel,
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: buildUserPrompt({
            cityName: city.name,
            cityCountry: city.country_code,
            cityRegion: city.region,
            cityPopulation: city.population,
            locale,
          }),
        },
      ],
    })
    usage = response.usage
    const textBlock = response.content.find((b) => b.type === 'text')
    if (!textBlock || textBlock.type !== 'text') {
      throw new Error('Claude-Antwort hatte keinen Text-Block')
    }
    const parsedJson = extractJson(textBlock.text)
    draft = validateDraft(parsedJson)
  } catch (err) {
    return NextResponse.json(
      {
        error: 'AI-Generierung fehlgeschlagen',
        detail: err instanceof Error ? err.message : String(err),
      },
      { status: 502 },
    )
  }

  // 4. Slug bestimmen — neu vorgeschlagen, falls Doc nicht existiert.
  const suggestedSlug = suggestCitySlug(locale, city.slug_base)

  // 5. Sanity-Doc per createOrReplace upserten.
  const docPayload = {
    _id: docId,
    _type: 'cityPage' as const,
    language: locale,
    cityId: city.slug_base,
    slug: { _type: 'slug' as const, current: suggestedSlug },
    pageTitle: draft.pageTitle,
    pageSubline: draft.pageSubline,
    bodySections: draft.bodySections.map((s) => ({
      _key: Math.random().toString(36).slice(2, 10),
      _type: 'object' as const,
      heading: s.heading,
      body: toPortableText(s.body),
    })),
    metaTitle: draft.metaTitle,
    metaDescription: draft.metaDescription,
    aiDraftStatus: 'draft' as const,
  }

  try {
    if (existing) {
      // Overwrite path: keep _id, replace fields. Use createOrReplace so the
      // doc is recreated cleanly (no leftover field state).
      await sanityPreviewClient.createOrReplace(docPayload)
    } else {
      await sanityPreviewClient.create(docPayload)
    }
  } catch (err) {
    return NextResponse.json(
      {
        error: 'Sanity-Write fehlgeschlagen',
        detail: err instanceof Error ? err.message : String(err),
      },
      { status: 502 },
    )
  }

  return NextResponse.json({
    ok: true,
    doc_id: docId,
    slug: suggestedSlug,
    locale,
    city: { id: city.id, slug_base: city.slug_base, name: city.name },
    overwrote: !!existing,
    model: chosenModel,
    tokens: usage,
    draft,
    note:
      'Draft wurde in Sanity geschrieben mit aiDraftStatus="draft". '
      + 'Marketing reviewt im Studio + setzt Status auf "reviewed" oder "published".',
  })
}
