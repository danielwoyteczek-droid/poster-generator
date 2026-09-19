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
 *
 * Jeder angenommene Aufruf landet in `amazon_ingest_runs`, auch einer ohne
 * neue Position — nur so ist in der Queue sichtbar, ob der Abholer
 * überhaupt noch läuft. Fehler einzelner Positionen gehen zusätzlich mit
 * ihrer Positionsnummer an Sentry, weil sie sonst nur im Protokoll des
 * Abholers auf UMOI-SERVER stünden.
 */

import { NextResponse } from 'next/server'
import { timingSafeEqual } from 'node:crypto'
import * as Sentry from '@sentry/nextjs'
import { IngestBodySchema, runIngest, type IngestBody, type IngestSummary } from '@/lib/amazon/ingest'
import { createAdminClient } from '@/lib/supabase-admin'

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
  reportErrors(summary)
  await logRun(parsed.data, summary)
  return NextResponse.json(summary, { status: 200 })
}

function reportErrors(summary: IngestSummary) {
  // Nur Positionsbezug und Meldung — keine Käufereingaben nach Sentry.
  for (const e of summary.errors) {
    Sentry.captureMessage(`Amazon-Eingang: ${e.message}`, {
      level: 'error',
      tags: { feature: 'PROJ-31', amazon_order_item_id: e.order_item_id ?? 'unbekannt' },
    })
  }
}

/** Ein Protokollfehler darf die Antwort an den Abholer nicht kippen. */
async function logRun(body: IngestBody, summary: IngestSummary) {
  try {
    const { error } = await createAdminClient().from('amazon_ingest_runs').insert({
      collector_version: body.collector_version != null ? String(body.collector_version) : null,
      items_received: body.items.length,
      items_accepted: summary.accepted,
      items_duplicate: summary.skipped_duplicate,
      items_failed: summary.failed,
      errors: summary.errors,
    })
    if (error) throw new Error(error.message)
  } catch (e) {
    Sentry.captureException(e, { tags: { feature: 'PROJ-31', step: 'ingest_run_log' } })
  }
}
