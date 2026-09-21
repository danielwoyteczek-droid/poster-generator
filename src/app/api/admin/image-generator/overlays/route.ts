import crypto from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import sharp from 'sharp'
import { requireAdmin } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase-admin'
import { OverlayValidationError, validateOverlayBuffer } from '@/lib/local-mockup-processor'
import { errorResponse } from '@/lib/image-generator/route-utils'

export const runtime = 'nodejs'

const BUCKET = 'mockup-overlays'
const OVERLAY_COLUMNS = 'id, name, orientation, image_url, width, height, created_at'

/** PROJ-56: Overlay-Bibliothek auflisten. */
export async function GET() {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: 'Forbidden' }, { status: auth.status })

  const { data, error } = await createAdminClient()
    .from('image_overlays')
    .select(OVERLAY_COLUMNS)
    .order('created_at', { ascending: false })
    .limit(500)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ overlays: data ?? [] })
}

/**
 * PROJ-56: Overlay hochladen (multipart: file, name, orientation).
 * PNG ≤ 5 MB, 800–4000 px — wie Mockup-Overlays. Es wird beim Erzeugen auf die
 * Canvas-Größe des Mockups skaliert.
 */
export async function POST(req: NextRequest) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: 'Forbidden' }, { status: auth.status })

  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json({ error: 'Multipart-Form erwartet' }, { status: 400 })
  }

  const file = formData.get('file')
  const nameRaw = formData.get('name')
  const orientation = formData.get('orientation')

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Feld "file" fehlt oder ist keine Datei' }, { status: 400 })
  }
  const name = typeof nameRaw === 'string' ? nameRaw.trim() : ''
  if (name.length < 1 || name.length > 120) {
    return NextResponse.json({ error: 'Name fehlt oder ist länger als 120 Zeichen' }, { status: 400 })
  }
  if (orientation !== 'portrait' && orientation !== 'landscape') {
    return NextResponse.json({ error: 'Feld "orientation" muss "portrait" oder "landscape" sein' }, { status: 400 })
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  try {
    await validateOverlayBuffer(buffer)
  } catch (err) {
    if (err instanceof OverlayValidationError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: 400 })
    }
    return errorResponse(err)
  }

  const meta = await sharp(buffer).metadata()
  if (!meta.hasAlpha) {
    return NextResponse.json(
      { error: 'Das PNG hat keine Transparenz – es würde das Mockup komplett verdecken' },
      { status: 400 },
    )
  }

  const admin = createAdminClient()
  const id = crypto.randomUUID()
  const storagePath = `image-overlays/${id}.png`
  const { error: upErr } = await admin.storage
    .from(BUCKET)
    .upload(storagePath, buffer, { contentType: 'image/png', upsert: false, cacheControl: '3600' })
  if (upErr) {
    return NextResponse.json({ error: `Storage-Upload fehlgeschlagen: ${upErr.message}` }, { status: 500 })
  }
  const { data: urlData } = admin.storage.from(BUCKET).getPublicUrl(storagePath)

  const { data, error } = await admin
    .from('image_overlays')
    .insert({
      id,
      name,
      orientation,
      storage_path: storagePath,
      image_url: urlData.publicUrl,
      width: meta.width ?? 0,
      height: meta.height ?? 0,
    })
    .select(OVERLAY_COLUMNS)
    .single()
  if (error || !data) {
    await admin.storage.from(BUCKET).remove([storagePath]).catch(() => {})
    return NextResponse.json({ error: error?.message ?? 'Speichern fehlgeschlagen' }, { status: 500 })
  }
  return NextResponse.json({ overlay: data }, { status: 201 })
}
