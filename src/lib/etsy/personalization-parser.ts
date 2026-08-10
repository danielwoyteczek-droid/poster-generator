/**
 * PROJ-49: Personalization-Parser.
 *
 * Etsy lets the buyer fill in a single free-text personalization field per
 * line-item. We can guide them with a multi-line prompt in the listing's
 * "personalization instructions" text, but we cannot enforce structure.
 *
 * Each Listing-Group declares a schema (also fallback-able to per-Preset
 * schema). The parser:
 *
 *   1. Splits input into lines.
 *   2. For each line, matches `<label>: <value>` (also `=` and `-` separators).
 *   3. Normalises the label (lowercase, strip diacritics, drop spaces).
 *   4. Matches against the schema key + label + fallbacks (also tried
 *      normalised).
 *   5. Returns { ok: true, parsed } when all required fields are present
 *      and regex-validated; otherwise { ok: false, missing, errors }.
 *
 * Robustness notes (lessons from realistic buyer typos):
 *   - Buyers use `=`, `-`, `→`, smart quotes, `:` with no space.
 *   - Buyers write keys in EN even when listing is DE ("Title", "City").
 *   - Buyers paste extra trailing whitespace from mobile autocomplete.
 *   - Buyers drop the key entirely and write only values one per line —
 *     we accept POSITIONAL fallback when no labelled line matches.
 *
 * The parser is deterministic and pure — no DB, no network. Tests cover
 * 15+ buyer-input variants in personalization-parser.test.ts.
 */

import { z } from 'zod'

export const PersonalizationFieldSchema = z.object({
  key: z.string().min(1).max(64),
  label: z.string().min(1).max(120),
  labelEn: z.string().min(1).max(120).optional(),
  required: z.boolean().default(false),
  fallbacks: z.array(z.string().min(1).max(64)).max(20).default([]),
  regex: z.string().max(500).optional(),
  regexFlags: z.string().max(10).optional(),
  // When buyer omits all labels, fields are matched by position in this
  // order. `positional` defaults to true; set to false for fields the
  // buyer is unlikely to type unprompted (e.g. coordinates).
  positional: z.boolean().default(true),
})

export const PersonalizationSchemaSchema = z.array(PersonalizationFieldSchema).max(20)

export type PersonalizationField = z.infer<typeof PersonalizationFieldSchema>
export type PersonalizationSchema = z.infer<typeof PersonalizationSchemaSchema>

export interface ParseSuccess {
  ok: true
  parsed: Record<string, string>
  /** Fields matched, with the raw label that the buyer typed. */
  matchedAs: Record<string, { label: string; mode: 'labelled' | 'positional' }>
  unmatchedLines: string[]
}

export interface ParseFailure {
  ok: false
  missing: string[]
  invalid: Array<{ key: string; value: string; reason: string }>
  parsed: Record<string, string>
  unmatchedLines: string[]
}

export type ParseResult = ParseSuccess | ParseFailure

/**
 * Aggressively normalize a label for matching:
 *   - lowercase
 *   - strip diacritics
 *   - strip punctuation
 *   - collapse whitespace
 */
function normalize(s: string): string {
  return s
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .trim()
}

const KV_SEPARATORS = [
  ':',
  '=',
  // Em-dash + en-dash + ASCII dash
  '—',
  '–',
  // We explicitly do NOT include '-' because addresses and dates use it.
  // Buyers who use ' - ' as separator are handled below via pattern match.
]

function splitLineToKeyValue(line: string): { label: string; value: string } | null {
  // Try ` - ` (with surrounding whitespace) as separator, but ONLY when there's
  // a space on each side — avoids splitting "Berlin-Wedding" or "1990-05-12".
  const dashMatch = line.match(/^(.+?)\s-\s(.+)$/)
  if (dashMatch && dashMatch[1] && dashMatch[2]) {
    return { label: dashMatch[1], value: dashMatch[2] }
  }
  for (const sep of KV_SEPARATORS) {
    const idx = line.indexOf(sep)
    if (idx > 0 && idx < line.length - 1) {
      return {
        label: line.slice(0, idx),
        value: line.slice(idx + sep.length),
      }
    }
  }
  return null
}

function findFieldForLabel(
  fields: PersonalizationField[],
  labelRaw: string,
): PersonalizationField | null {
  const target = normalize(labelRaw)
  if (!target) return null
  for (const field of fields) {
    const candidates: string[] = [
      field.key,
      field.label,
      ...(field.labelEn ? [field.labelEn] : []),
      ...field.fallbacks,
    ]
    if (candidates.some((c) => normalize(c) === target)) return field
  }
  return null
}

function validateValue(field: PersonalizationField, value: string): string | null {
  if (!field.regex) return null
  try {
    const re = new RegExp(field.regex, field.regexFlags ?? '')
    if (!re.test(value)) {
      return `Wert "${value.slice(0, 40)}" passt nicht zum erwarteten Muster (${field.regex}).`
    }
  } catch {
    // Invalid regex or flags in schema — treat as no validation to avoid
    // blocking imports because of a schema typo.
    return null
  }
  return null
}

export function parsePersonalization(
  rawInput: string | null | undefined,
  schema: PersonalizationSchema,
): ParseResult {
  // Replace fancy quotes and trim each line; ignore empty lines.
  const sanitized = (rawInput ?? '')
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
  const lines = sanitized
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0)

  const parsed: Record<string, string> = {}
  const matchedAs: Record<string, { label: string; mode: 'labelled' | 'positional' }> = {}
  const unlabelled: string[] = []
  const unmatchedLines: string[] = []

  // Phase 1: labelled lines win.
  for (const line of lines) {
    const kv = splitLineToKeyValue(line)
    if (!kv) {
      unlabelled.push(line)
      continue
    }
    const field = findFieldForLabel(schema, kv.label)
    if (!field) {
      unmatchedLines.push(line)
      continue
    }
    if (parsed[field.key] !== undefined) {
      // Buyer typed the same field twice — keep the first occurrence.
      unmatchedLines.push(line)
      continue
    }
    parsed[field.key] = kv.value.trim()
    matchedAs[field.key] = { label: kv.label.trim(), mode: 'labelled' }
  }

  // Phase 2: positional fallback for fields still missing.
  if (unlabelled.length > 0) {
    const positionalFields = schema.filter(
      (f) => f.positional !== false && parsed[f.key] === undefined,
    )
    for (let i = 0; i < Math.min(unlabelled.length, positionalFields.length); i++) {
      const value = unlabelled[i].trim()
      if (!value) continue
      parsed[positionalFields[i].key] = value
      matchedAs[positionalFields[i].key] = { label: '', mode: 'positional' }
    }
    // Any unlabelled lines beyond the positional capacity become unmatched.
    for (let i = positionalFields.length; i < unlabelled.length; i++) {
      unmatchedLines.push(unlabelled[i])
    }
  }

  // Phase 3: validate required + regex.
  const missing: string[] = []
  const invalid: Array<{ key: string; value: string; reason: string }> = []
  for (const field of schema) {
    const value = parsed[field.key]
    if (value === undefined || value.length === 0) {
      if (field.required) missing.push(field.key)
      continue
    }
    const err = validateValue(field, value)
    if (err) invalid.push({ key: field.key, value, reason: err })
  }

  if (missing.length === 0 && invalid.length === 0) {
    return { ok: true, parsed, matchedAs, unmatchedLines }
  }
  return { ok: false, parsed, missing, invalid, unmatchedLines }
}

/**
 * Renders the schema as a multi-line buyer-facing instruction text that
 * can be pasted into the Etsy listing's "personalization instructions"
 * field. Buyer sees this when typing — guides them to match the parser.
 */
export function renderInstructions(schema: PersonalizationSchema): string {
  const lines: string[] = ['Bitte fülle pro Zeile aus:']
  for (const field of schema) {
    const suffix = field.required ? '' : ' (optional)'
    lines.push(`${field.label}: ${field.required ? '' : '...'}${suffix}`)
  }
  return lines.join('\n')
}
