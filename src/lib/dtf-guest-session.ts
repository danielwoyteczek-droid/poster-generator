import { cookies } from 'next/headers'
import { createClient } from './supabase-server'

/**
 * PROJ-55: Besitzer-Identität für DTF-Uploads.
 *
 * Der DTF-Editor ist ohne Anmeldung nutzbar, es müssen also auch Gäste
 * Dateien ablegen können. Damit ein Gast ausschließlich an seine eigenen
 * Uploads kommt, braucht er eine Identität, die der Server prüfen kann.
 *
 * Der bestehende Foto-Upload löst das über eine im localStorage erzeugte
 * UUID, die der Client bei jedem Aufruf mitschickt. Das ist keine
 * Identität, sondern eine Behauptung: Wer eine fremde UUID kennt, kann
 * sich als dieser Gast ausgeben. Zusammen mit den (inzwischen entfernten)
 * offenen anon-Policies auf `user-photos` war damit jeder Gast-Upload für
 * jeden anderen Gast lesbar.
 *
 * Hier deshalb ein httpOnly-Cookie, das ausschließlich der Server setzt.
 * Der Client kann es weder auslesen noch fälschen, und es wird nie aus dem
 * Request-Body übernommen — `guestSessionId` ist bewusst kein Parameter
 * irgendeiner Route.
 *
 * Rechtliches: technisch notwendiges Funktions-Cookie ohne Tracking-Zweck,
 * daher nicht einwilligungspflichtig. Es enthält nur eine zufällige UUID.
 */

const COOKIE_NAME = 'dtf_gid'
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30 // 30 Tage, wie die Aufräum-Frist

export type UploadOwner =
  | { kind: 'user'; userId: string }
  | { kind: 'guest'; guestSessionId: string }

/**
 * Besitzer des aktuellen Requests. Angemeldete Nutzer haben Vorrang: Wer
 * eingeloggt ist, bekommt seine Uploads am Konto, auch wenn noch ein
 * Gast-Cookie aus einer früheren Sitzung herumliegt.
 *
 * `create=false` liefert `null`, wenn es weder Konto noch Cookie gibt —
 * für lesende Routen, die keine leere Sitzung anlegen sollen.
 */
export async function getUploadOwner(
  opts: { create?: boolean } = {},
): Promise<UploadOwner | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) return { kind: 'user', userId: user.id }

  const jar = await cookies()
  const existing = jar.get(COOKIE_NAME)?.value

  if (existing && isUuid(existing)) {
    return { kind: 'guest', guestSessionId: existing }
  }

  if (!opts.create) return null

  const fresh = crypto.randomUUID()
  jar.set(COOKIE_NAME, fresh, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: COOKIE_MAX_AGE_SECONDS,
  })
  return { kind: 'guest', guestSessionId: fresh }
}

/**
 * Übersetzt den Besitzer in die beiden Spalten von `dtf_uploads`. Die
 * Tabelle erzwingt per CHECK, dass genau eine davon gesetzt ist.
 */
export function ownerColumns(owner: UploadOwner): {
  user_id: string | null
  guest_session_id: string | null
} {
  return owner.kind === 'user'
    ? { user_id: owner.userId, guest_session_id: null }
    : { user_id: null, guest_session_id: owner.guestSessionId }
}

/**
 * Präfix im Storage-Bucket. Angemeldete unter ihrer User-ID, Gäste unter
 * `guest/<sitzung>`. Die Trennung macht Fehlzuordnungen beim Aufräumen und
 * beim manuellen Nachsehen sofort sichtbar.
 */
export function ownerStoragePrefix(owner: UploadOwner): string {
  return owner.kind === 'user' ? `u/${owner.userId}` : `guest/${owner.guestSessionId}`
}

/**
 * Gehört eine `dtf_uploads`-Zeile dem aktuellen Besitzer? Wird vor jedem
 * Ausliefern einer signierten URL und vor jedem Löschen geprüft.
 */
export function ownsRow(
  owner: UploadOwner,
  row: { user_id: string | null; guest_session_id: string | null },
): boolean {
  return owner.kind === 'user'
    ? row.user_id === owner.userId
    : row.guest_session_id === owner.guestSessionId
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
}
