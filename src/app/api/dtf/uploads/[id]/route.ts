import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase-admin'
import { getUploadOwner, ownsRow } from '@/lib/dtf-guest-session'
import { DTF_BUCKET } from '@/lib/dtf-constants'

export const runtime = 'nodejs'

/**
 * PROJ-55 Phase 1 — einzelner Upload.
 *
 * PATCH: Abschluss melden. Der Client hat Original und Vorschau direkt zu
 * Storage geladen und meldet die Pixelmaße des ORIGINALS zurück — sie sind
 * die Grundlage der dpi-Warnung im Editor. Der Server prüft, dass beide
 * Objekte tatsächlich existieren, bevor er auf 'ready' setzt; sonst hätten
 * wir Zeilen, die auf nichts zeigen.
 *
 * DELETE: Motiv aus der Ablage entfernen, samt Storage-Objekten.
 *
 * Beides prüft den Besitz gegen Konto bzw. Gast-Cookie. `is_ordered`-Zeilen
 * lassen sich nicht löschen — sie hängen an einer bezahlten Bestellung und
 * werden für Nachdruck und Reklamation gebraucht.
 */

const CompleteSchema = z.object({
  widthPx: z.number().int().positive().max(60000),
  heightPx: z.number().int().positive().max(60000),
})

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: 'Ungültige ID' }, { status: 400 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'JSON-Body erwartet' }, { status: 400 })
  }

  const parsed = CompleteSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Ungültige Eingabe' },
      { status: 400 },
    )
  }

  const owner = await getUploadOwner()
  if (!owner) return NextResponse.json({ error: 'Keine Sitzung' }, { status: 401 })

  const admin = createAdminClient()
  const { data: row, error: readErr } = await admin
    .from('dtf_uploads')
    .select('id, user_id, guest_session_id, original_path, status')
    .eq('id', id)
    .maybeSingle()

  if (readErr || !row) {
    return NextResponse.json({ error: 'Upload nicht gefunden' }, { status: 404 })
  }
  if (!ownsRow(owner, row)) {
    // Bewusst 404 statt 403: Ein fremder Aufrufer soll nicht erfahren, ob
    // es die ID überhaupt gibt.
    return NextResponse.json({ error: 'Upload nicht gefunden' }, { status: 404 })
  }

  // Beide Objekte müssen wirklich in Storage liegen. Ohne diese Prüfung
  // könnte ein abgebrochener Upload als 'ready' markiert werden und der
  // Editor zeigte ein Motiv, das beim Drucken fehlt.
  const prefix = row.original_path.split('/').slice(0, -1).join('/')
  const { data: listed, error: listErr } = await admin.storage.from(DTF_BUCKET).list(prefix)
  if (listErr) {
    console.error('[dtf/uploads] storage list failed:', listErr)
    return NextResponse.json({ error: 'Upload konnte nicht geprüft werden' }, { status: 500 })
  }

  const names = new Set((listed ?? []).map((o) => o.name))
  const originalName = row.original_path.split('/').pop()!
  const previewPath = `${prefix}/preview.jpg`

  if (!originalName || !names.has(originalName)) {
    await admin.from('dtf_uploads').update({ status: 'failed' }).eq('id', id)
    return NextResponse.json({ error: 'Originaldatei fehlt in der Ablage' }, { status: 409 })
  }
  if (!names.has('preview.jpg')) {
    await admin.from('dtf_uploads').update({ status: 'failed' }).eq('id', id)
    return NextResponse.json({ error: 'Vorschau fehlt in der Ablage' }, { status: 409 })
  }

  const { error: updateErr } = await admin
    .from('dtf_uploads')
    .update({
      preview_path: previewPath,
      width_px: parsed.data.widthPx,
      height_px: parsed.data.heightPx,
      status: 'ready',
    })
    .eq('id', id)

  if (updateErr) {
    console.error('[dtf/uploads] complete failed:', updateErr)
    return NextResponse.json({ error: 'Upload konnte nicht abgeschlossen werden' }, { status: 500 })
  }

  return NextResponse.json({ id, status: 'ready' })
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: 'Ungültige ID' }, { status: 400 })
  }

  const owner = await getUploadOwner()
  if (!owner) return NextResponse.json({ error: 'Keine Sitzung' }, { status: 401 })

  const admin = createAdminClient()
  const { data: row } = await admin
    .from('dtf_uploads')
    .select('id, user_id, guest_session_id, original_path, preview_path, is_ordered')
    .eq('id', id)
    .maybeSingle()

  if (!row || !ownsRow(owner, row)) {
    return NextResponse.json({ error: 'Upload nicht gefunden' }, { status: 404 })
  }
  if (row.is_ordered) {
    return NextResponse.json(
      { error: 'Motiv gehört zu einer Bestellung und kann nicht gelöscht werden' },
      { status: 409 },
    )
  }

  const paths = [row.original_path, row.preview_path].filter((p): p is string => !!p)
  if (paths.length > 0) {
    const { error: removeErr } = await admin.storage.from(DTF_BUCKET).remove(paths)
    // Storage-Fehler nicht hart machen: Die Zeile soll trotzdem weg, sonst
    // bleibt das Motiv für den Kunden sichtbar. Verwaiste Objekte fängt der
    // Aufräum-Lauf.
    if (removeErr) console.warn('[dtf/uploads] storage remove failed:', removeErr.message)
  }

  const { error: delErr } = await admin.from('dtf_uploads').delete().eq('id', id)
  if (delErr) {
    console.error('[dtf/uploads] delete failed:', delErr)
    return NextResponse.json({ error: 'Motiv konnte nicht gelöscht werden' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
