/**
 * PROJ-31: Eingang fuer die Amazon-Custom-Positionen vom JTL-Abholer.
 *
 * Der Abholer laeuft auf UMOI-SERVER, liest JTL lokal und schickt die
 * Anpassungsdaten hierher. Authentifizierung: gemeinsames Geheimnis in
 * `Authorization: Bearer <AMAZON_INGEST_SECRET>` — dasselbe Muster wie beim
 * Etsy-Cron-Endpunkt.
 *
 * Die eigentliche Arbeit liegt in `@/lib/amazon/ingest`, damit sie testbar
 * bleibt und spaeter auch von einem Admin-Knopf aus aufrufbar ist.
 *
 * Antwortverhalten laut Abholer-Vertrag:
 *   - Fehler einzelner Positionen sind KEIN HTTP-Fehler. Sie landen in
 *     `failed` plus `errors`, der Status bleibt 200. Der Abholer
 *     protokolliert und schickt beim naechsten Lauf erneut.
 *   - 401 und 5xx wiederholt der Abholer dreimal und protokolliert dann.
 *     Deshalb nur dort einsetzen, wo Wiederholen auch sinnvoll ist.
 *   - Ein unlesbarer Rumpf ist 400 — den wiederholt niemand sinnvoll.
 */

import { NextResponse } from 'next/server'
import { timingSafeEqual } from 'node:crypto'
import { IngestBodySchema, runIngest } from '@/lib/amazon/ingest'

export const runtime = 'nodejs'
export const maxDuration = 60

function tokenMatches(provided: string, expected: string): boolean {
  const a = Buffer.from(provided)
  const b = Buffer.from(expected)
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}

export async function POST(request: Request) {
  const expected = process.env.AMAZON_INGEST_SECRET?.trim()
  if (!expected) {
    // Konfigurationsfehler, kein Auth-Fehler. Als 500 kenntlich machen,
    // damit im Protokoll des Abholers nicht "falscher Token" steht.
    return NextResponse.json(
      { ok: false, accepted: 0, skipped_duplicate: 0, failed: 0, errors: ['AMAZON_INGEST_SECRET ist auf dem Server nicht gesetzt'] },
      { status: 500 },
    )
  }

  const header = request.headers.get('authorization')?.trim() ?? ''
  const provided = header.startsWith('Bearer ') ? header.slice(7) : ''
  if (!provided || !tokenMatches(provided, expected)) {
    return NextResponse.json(
      { ok: false, accepted: 0, skipped_duplicate: 0, failed: 0, errors: ['Unauthorized'] },
      { status: 401 },
    )
  }

  let raw: unknown
  try {
    raw = await request.json()
  } catch {
    return NextResponse.json(
      { ok: false, accepted: 0, skipped_duplicate: 0, failed: 0, errors: ['Rumpf ist kein gueltiges JSON'] },
      { status: 400 },
    )
  }

  const parsed = IngestBodySchema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        accepted: 0,
        skipped_duplicate: 0,
        failed: 0,
        errors: parsed.error.issues.map(
          (i) => `${i.path.join('.') || '(Rumpf)'}: ${i.message}`,
        ),
      },
      { status: 400 },
    )
  }

  const summary = await runIngest(parsed.data)
  return NextResponse.json(summary, { status: 200 })
}
