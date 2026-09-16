import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'
import { rateLimitDb, getClientIp } from '@/lib/rate-limit'

export const runtime = 'nodejs'

/**
 * Signierte URLs und Löschen für den Bucket `user-photos`.
 *
 * Bis zur Migration 20260810100001 hat der Browser das selbst erledigt:
 * `supabase.storage.createSignedUrl()` mit dem Anon-Key, möglich durch eine
 * anon-SELECT-Policy, die nur prüfte, ob der Ordner `anon` heißt. Damit
 * konnte jeder Gast die Fotos aller anderen Gäste lesen und löschen. Die
 * Policies sind entfernt; Signieren und Löschen laufen jetzt hier, mit
 * Besitzprüfung.
 *
 * Einziger Aufrufer ist `src/lib/photo-upload.ts`. Die Editor-Komponenten
 * (Foto-Editor, Map-Editor) rufen unverändert dieselben Lib-Funktionen auf.
 *
 * Restgrenze für Gäste: Ihre Sitzungs-ID liegt im localStorage und wird vom
 * Client mitgeschickt — der Server kann sie nicht kryptografisch prüfen.
 * Wer eine fremde UUID kennt, käme an deren Fotos. Erraten lässt sie sich
 * nicht, und Auflisten ist ohne SELECT-Recht nicht mehr möglich. Für neue
 * DTF-Uploads (PROJ-55) wird stattdessen ein httpOnly-Cookie verwendet, das
 * der Client gar nicht setzen kann.
 */

const BUCKET = 'user-photos'
const SIGNED_URL_TTL_SECONDS = 60 * 60 * 24 * 7
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const BodySchema = z.object({
  storagePath: z.string().min(1).max(500),
  guestSessionId: z.string().regex(UUID_RE).optional(),
  action: z.enum(['sign', 'delete']).default('sign'),
})

/**
 * Darf dieser Aufrufer an diesen Pfad? Angemeldete nur an `<uid>/…`, Gäste
 * nur an `anon/<eigene-sitzung>/…`.
 *
 * Die Prüfung arbeitet auf den Pfadsegmenten, nicht mit `startsWith`: Sonst
 * würde `anon/abc` auch `anon/abcdef/...` freigeben.
 */
function mayAccess(
  storagePath: string,
  userId: string | null,
  guestSessionId: string | undefined,
): boolean {
  const segments = storagePath.split('/')
  if (segments.length < 2) return false
  if (segments.includes('..') || segments.includes('')) return false

  if (userId) return segments[0] === userId
  if (guestSessionId) return segments[0] === 'anon' && segments[1] === guestSessionId
  return false
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req)
  const limited = await rateLimitDb(`photos-sign:${ip}`, 120, 10 * 60 * 1000)
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
      { error: parsed.error.issues[0]?.message ?? 'Ungültige Eingabe' },
      { status: 400 },
    )
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { storagePath, guestSessionId, action } = parsed.data

  if (!mayAccess(storagePath, user?.id ?? null, guestSessionId)) {
    return NextResponse.json({ error: 'Kein Zugriff auf diese Datei' }, { status: 403 })
  }

  const admin = createAdminClient()

  if (action === 'delete') {
    const { error } = await admin.storage.from(BUCKET).remove([storagePath])
    if (error) {
      console.error('[photos/sign] delete failed:', error)
      return NextResponse.json({ error: 'Foto konnte nicht gelöscht werden' }, { status: 500 })
    }
    return NextResponse.json({ ok: true })
  }

  const { data, error } = await admin.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, SIGNED_URL_TTL_SECONDS)

  if (error || !data) {
    console.error('[photos/sign] sign failed:', error)
    return NextResponse.json({ error: 'Foto-URL konnte nicht erstellt werden' }, { status: 500 })
  }

  return NextResponse.json({ signedUrl: data.signedUrl })
}
