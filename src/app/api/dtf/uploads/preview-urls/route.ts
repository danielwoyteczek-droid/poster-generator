import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase-admin'
import { rateLimitDb, getClientIp } from '@/lib/rate-limit'
import { getUploadOwner } from '@/lib/dtf-guest-session'
import { DTF_BUCKET, DTF_READ_URL_TTL_SECONDS } from '@/lib/dtf-constants'

export const runtime = 'nodejs'

/**
 * PROJ-55: Frische Vorschau-URLs für eine Liste von Uploads.
 *
 * Warum das nötig ist: Die Bogenbeschreibung im Warenkorb wird persistiert
 * und überlebt einen Reload. Eine URL darin überlebt ihn nicht — eine
 * `blob:`-URL stirbt mit der Seite, eine signierte läuft nach
 * `DTF_READ_URL_TTL_SECONDS` ab. Die Vorschau zeigte danach leere Kästen,
 * und zwar auch im Freigabe-Dialog, auf dessen Anblick der Kunde die
 * verbindliche Druckfreigabe erteilt.
 *
 * Deshalb steht in der Bogenbeschreibung nur noch die `uploadId`, und die
 * URL entsteht beim Anzeigen. Das ist zugleich die einzige Fassung, die
 * nicht veralten kann.
 *
 * `GET /api/dtf/uploads` täte dasselbe, gibt aber die ganze Ablage zurück
 * (bis 200 Einträge samt Metadaten), um an drei URLs zu kommen. Diese Route
 * beantwortet genau die gestellte Frage.
 *
 * Besitzprüfung wie überall im DTF-Weg: angemeldete Nutzer über `user_id`,
 * Gäste über die Sitzung aus dem httpOnly-Cookie. Fremde IDs kommen schlicht
 * nicht in der Antwort vor — kein 403, weil der Aufrufer aus einer
 * Teilantwort nichts über fremde Uploads lernen soll.
 */

const BodySchema = z.object({
  // Ein Bogen fasst DTF_MAX_ELEMENTS_PER_SHEET Motive; der Warenkorb kann
  // mehrere Bögen zeigen. 200 deckt das mit Luft ab.
  ids: z.array(z.string().uuid()).min(1).max(200),
})

const RATE_LIMIT = 120
const RATE_WINDOW_MS = 10 * 60 * 1000

export async function POST(req: NextRequest) {
  const ip = getClientIp(req)
  const limited = await rateLimitDb(`dtf-preview-urls:${ip}`, RATE_LIMIT, RATE_WINDOW_MS)
  if (!limited.ok) {
    return NextResponse.json(
      { error: 'Zu viele Anfragen. Bitte kurz warten.' },
      { status: 429, headers: { 'Retry-After': String(limited.retryAfterSeconds) } },
    )
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'JSON-Body erwartet' }, { status: 400 })
  }

  const parsed = BodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ') },
      { status: 400 },
    )
  }

  // Kein `create` — eine reine Leseabfrage soll keine Gast-Sitzung erzeugen.
  const owner = await getUploadOwner()
  if (!owner) return NextResponse.json({ urls: {} })

  const admin = createAdminClient()
  const query = admin
    .from('dtf_uploads')
    .select('id, preview_path')
    .in('id', parsed.data.ids)
    .eq('status', 'ready')
    .limit(parsed.data.ids.length)

  const { data, error } =
    owner.kind === 'user'
      ? await query.eq('user_id', owner.userId)
      : await query.eq('guest_session_id', owner.guestSessionId)

  if (error) {
    console.error('[dtf/uploads/preview-urls] lookup failed:', error)
    return NextResponse.json({ error: 'Vorschau konnte nicht geladen werden' }, { status: 500 })
  }

  const rows = (data ?? []).filter((r): r is { id: string; preview_path: string } => !!r.preview_path)
  if (rows.length === 0) return NextResponse.json({ urls: {} })

  // Eine Signatur pro Aufruf statt pro Datei.
  const { data: signed } = await admin.storage
    .from(DTF_BUCKET)
    .createSignedUrls(
      rows.map((r) => r.preview_path),
      DTF_READ_URL_TTL_SECONDS,
    )

  const urlByPath = new Map<string, string>()
  for (const entry of signed ?? []) {
    if (entry.path && entry.signedUrl) urlByPath.set(entry.path, entry.signedUrl)
  }

  const urls: Record<string, string> = {}
  for (const row of rows) {
    const url = urlByPath.get(row.preview_path)
    if (url) urls[row.id] = url
  }

  return NextResponse.json({ urls })
}
