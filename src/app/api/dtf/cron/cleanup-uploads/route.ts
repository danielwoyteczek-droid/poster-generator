import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'
import { DTF_BUCKET, DTF_RETENTION_DAYS } from '@/lib/dtf-constants'

export const runtime = 'nodejs'
export const maxDuration = 60

/**
 * PROJ-55: Aufräumen abgelaufener DTF-Uploads.
 *
 * Kundendateien in Druckauflösung sind groß (bis 50 MB). Ohne Aufräumen
 * sammeln sich Dateien aus abgebrochenen Entwürfen unbegrenzt an — teuer,
 * und ein Bestand personenbezogener Bilddaten ohne Löschkonzept.
 *
 * Gelöscht wird nur, was NICHT zu einer bezahlten Bestellung gehört
 * (`is_ordered = false`). Bestellte Dateien bleiben für Nachdruck und
 * Reklamation erhalten.
 *
 * Zwei Fristen:
 *   - 30 Tage für fertige, nie bestellte Uploads
 *   - 24 Stunden für 'pending'-Zeilen, bei denen der Client den Upload nie
 *     abgeschlossen hat (Verbindungsabbruch, Tab geschlossen)
 *
 * Authentifizierung über Shared Secret im Authorization-Header, analog zum
 * Etsy-Cron aus PROJ-49.
 *
 * Reihenfolge ist Absicht: Erst die DB-Zeilen entfernen (die Funktion
 * liefert dabei die Pfade zurück), dann die Storage-Objekte. Andersherum
 * könnte ein Abbruch Zeilen hinterlassen, die auf gelöschte Dateien zeigen
 * — der Editor zeigte dann Motive, die es nicht mehr gibt. So bleiben im
 * schlimmsten Fall verwaiste Objekte übrig, die beim nächsten Lauf nicht
 * stören.
 */

function verifyCronAuth(request: Request): boolean {
  const expected = process.env.DTF_CLEANUP_CRON_SECRET?.trim()
  if (!expected) return false
  const got = request.headers.get('authorization')?.trim()
  return got === `Bearer ${expected}`
}

export async function POST(request: Request) {
  if (!verifyCronAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()

  const { data, error } = await admin.rpc('dtf_uploads_collect_expired', {
    p_days: DTF_RETENTION_DAYS,
    p_pending_hours: 24,
    p_limit: 500,
  })

  if (error) {
    console.error('[dtf/cleanup] collect failed:', error)
    return NextResponse.json({ error: 'Aufräumen fehlgeschlagen' }, { status: 500 })
  }

  const rows = (data ?? []) as Array<{
    id: string
    original_path: string
    preview_path: string | null
  }>

  if (rows.length === 0) {
    return NextResponse.json({ ok: true, removedRows: 0, removedObjects: 0 })
  }

  const paths = rows.flatMap((r) =>
    [r.original_path, r.preview_path].filter((p): p is string => !!p),
  )

  let removedObjects = 0
  const { error: removeErr } = await admin.storage.from(DTF_BUCKET).remove(paths)
  if (removeErr) {
    // Nicht hart machen: Die Zeilen sind bereits weg, ein erneuter Lauf
    // würde sie nicht noch einmal finden. Verwaiste Objekte sind ein
    // Kostenproblem, kein Korrektheitsproblem — aber sie gehören ins Log.
    console.warn('[dtf/cleanup] storage remove failed:', removeErr.message, {
      pathCount: paths.length,
    })
  } else {
    removedObjects = paths.length
  }

  return NextResponse.json({
    ok: true,
    removedRows: rows.length,
    removedObjects,
    // Signalisiert dem Aufrufer, dass das Limit erreicht wurde und ein
    // weiterer Lauf sinnvoll ist.
    more: rows.length === 500,
  })
}
