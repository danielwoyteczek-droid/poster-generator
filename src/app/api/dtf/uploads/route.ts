import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase-admin'
import { rateLimitDb, getClientIp } from '@/lib/rate-limit'
import {
  getUploadOwner,
  ownerColumns,
  ownerStoragePrefix,
} from '@/lib/dtf-guest-session'
import {
  DTF_BUCKET,
  DTF_MAX_UPLOAD_BYTES,
  DTF_ALLOWED_MIME_TYPES,
  DTF_PREVIEW_MIME,
  DTF_UPLOAD_URL_TTL_SECONDS,
  DTF_READ_URL_TTL_SECONDS,
} from '@/lib/dtf-constants'

export const runtime = 'nodejs'

/**
 * PROJ-55 Phase 1 — Motiv-Ablage des DTF-Editors.
 *
 * POST: Upload anmelden. Die Datei läuft NICHT durch diese Route.
 * Serverless-Funktionen nehmen nur rund 4,5 MB Body an; bei bis zu 50 MB
 * großen Druckdaten ist das kein gangbarer Weg. Stattdessen legt die Route
 * die Zeile an und gibt zwei signierte Upload-URLs zurück — eine für das
 * unveränderte Original, eine für die im Browser erzeugte Vorschau. Der
 * Client lädt direkt zu Storage hoch und meldet sich danach bei
 * `/api/dtf/uploads/[id]/complete` zurück.
 *
 * Der Bucket ist privat und hat keine anon-Policy. Ohne die hier
 * ausgestellte Signatur kommt niemand hinein, auch nicht mit dem
 * öffentlichen Anon-Key.
 *
 * GET: Die eigene Motiv-Ablage mit frischen Lese-URLs auf die Vorschauen.
 */

const CreateSchema = z.object({
  filename: z.string().min(1).max(300),
  mimeType: z.enum(DTF_ALLOWED_MIME_TYPES),
  byteSize: z
    .number()
    .int()
    .positive()
    .max(
      DTF_MAX_UPLOAD_BYTES,
      `Datei zu groß — maximal ${Math.round(DTF_MAX_UPLOAD_BYTES / 1024 / 1024)} MB.`,
    ),
})

/** Erlaubt großzügig viele Uploads, fängt aber Bot-Fluten ab. */
const RATE_LIMIT = 40
const RATE_WINDOW_MS = 10 * 60 * 1000

export async function POST(req: NextRequest) {
  const ip = getClientIp(req)
  const limited = await rateLimitDb(`dtf-upload:${ip}`, RATE_LIMIT, RATE_WINDOW_MS)
  if (!limited.ok) {
    return NextResponse.json(
      { error: 'Zu viele Uploads. Bitte kurz warten.' },
      { status: 429, headers: { 'Retry-After': String(limited.retryAfterSeconds) } },
    )
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'JSON-Body erwartet' }, { status: 400 })
  }

  const parsed = CreateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Ungültige Eingabe' },
      { status: 400 },
    )
  }

  // `create: true` legt bei Gästen die Sitzung an und setzt das Cookie.
  const owner = await getUploadOwner({ create: true })
  if (!owner) {
    return NextResponse.json({ error: 'Sitzung konnte nicht angelegt werden' }, { status: 500 })
  }

  const admin = createAdminClient()
  const id = crypto.randomUUID()
  const prefix = `${ownerStoragePrefix(owner)}/${id}`
  const originalExt = parsed.data.mimeType === 'image/png' ? 'png' : 'jpg'
  const originalPath = `${prefix}/original.${originalExt}`
  const previewPath = `${prefix}/preview.jpg`

  const { error: insertErr } = await admin.from('dtf_uploads').insert({
    id,
    ...ownerColumns(owner),
    original_path: originalPath,
    mime_type: parsed.data.mimeType,
    byte_size: parsed.data.byteSize,
    original_filename: parsed.data.filename.slice(0, 300),
    status: 'pending',
  })

  if (insertErr) {
    console.error('[dtf/uploads] insert failed:', insertErr)
    return NextResponse.json({ error: 'Upload konnte nicht angelegt werden' }, { status: 500 })
  }

  const [originalSigned, previewSigned] = await Promise.all([
    admin.storage.from(DTF_BUCKET).createSignedUploadUrl(originalPath),
    admin.storage.from(DTF_BUCKET).createSignedUploadUrl(previewPath),
  ])

  if (originalSigned.error || previewSigned.error || !originalSigned.data || !previewSigned.data) {
    // Zeile wieder entfernen, damit keine Karteileiche entsteht, für die es
    // nie eine Datei geben wird.
    await admin.from('dtf_uploads').delete().eq('id', id)
    console.error(
      '[dtf/uploads] signing failed:',
      originalSigned.error?.message ?? previewSigned.error?.message,
    )
    return NextResponse.json({ error: 'Upload-URL konnte nicht erstellt werden' }, { status: 500 })
  }

  return NextResponse.json({
    id,
    original: {
      path: originalPath,
      uploadUrl: originalSigned.data.signedUrl,
      token: originalSigned.data.token,
    },
    preview: {
      path: previewPath,
      uploadUrl: previewSigned.data.signedUrl,
      token: previewSigned.data.token,
      mimeType: DTF_PREVIEW_MIME,
    },
    expiresInSeconds: DTF_UPLOAD_URL_TTL_SECONDS,
  })
}

export async function GET() {
  // Kein `create` — eine reine Leseabfrage soll keine Gast-Sitzung erzeugen.
  const owner = await getUploadOwner()
  if (!owner) return NextResponse.json({ uploads: [] })

  const admin = createAdminClient()
  const query = admin
    .from('dtf_uploads')
    .select(
      'id, original_path, preview_path, mime_type, byte_size, width_px, height_px, original_filename, status, created_at',
    )
    .eq('status', 'ready')
    .order('created_at', { ascending: false })
    .limit(200)

  const { data, error } =
    owner.kind === 'user'
      ? await query.eq('user_id', owner.userId)
      : await query.eq('guest_session_id', owner.guestSessionId)

  if (error) {
    console.error('[dtf/uploads] list failed:', error)
    return NextResponse.json({ error: 'Ablage konnte nicht geladen werden' }, { status: 500 })
  }

  const rows = data ?? []
  const previewPaths = rows.map((r) => r.preview_path).filter((p): p is string => !!p)

  // Eine Signatur pro Aufruf statt pro Datei: createSignedUrls nimmt die
  // ganze Liste auf einmal.
  const signedByPath = new Map<string, string>()
  if (previewPaths.length > 0) {
    const { data: signed } = await admin.storage
      .from(DTF_BUCKET)
      .createSignedUrls(previewPaths, DTF_READ_URL_TTL_SECONDS)
    for (const entry of signed ?? []) {
      if (entry.path && entry.signedUrl) signedByPath.set(entry.path, entry.signedUrl)
    }
  }

  return NextResponse.json({
    uploads: rows.map((r) => ({
      id: r.id,
      filename: r.original_filename,
      mimeType: r.mime_type,
      byteSize: r.byte_size,
      widthPx: r.width_px,
      heightPx: r.height_px,
      previewUrl: r.preview_path ? (signedByPath.get(r.preview_path) ?? null) : null,
      createdAt: r.created_at,
    })),
  })
}
