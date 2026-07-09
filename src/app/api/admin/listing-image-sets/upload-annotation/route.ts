import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase-admin'
import {
  validateOverlayBuffer,
  OverlayValidationError,
} from '@/lib/local-mockup-processor'

export const runtime = 'nodejs'

/**
 * PROJ-54: Upload eines Annotation-PNGs für ein Listing-Image-Set-Item.
 * Im Gegensatz zum Magenta-Overlay (siehe ../mockup-sets/upload-overlay)
 * findet KEINE Magenta-Detection statt — das PNG wird 1:1 in Storage gelegt
 * und beim Compositing als oberste Ebene auf das Mockup gelegt.
 *
 * Multipart-Felder:
 *   - file:               PNG mit transparentem Hintergrund (≤ 5 MB)
 *   - listing_image_set_id: UUID des Sets (für Storage-Pfad)
 *   - item_label:         label des Items (z. B. "01-hero")
 *   - orientation:        'portrait' | 'landscape'
 *
 * Antwort:
 *   { url: string }
 */

const LABEL_RE = /^[a-z0-9][a-z0-9-]*$/
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const BUCKET = 'mockup-overlays'

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
  const setId = formData.get('listing_image_set_id')
  const itemLabel = formData.get('item_label')
  const orientation = formData.get('orientation')

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Feld "file" fehlt oder ist keine Datei' }, { status: 400 })
  }
  if (typeof setId !== 'string' || !UUID_RE.test(setId)) {
    return NextResponse.json({ error: 'Feld "listing_image_set_id" fehlt oder ist keine UUID' }, { status: 400 })
  }
  if (typeof itemLabel !== 'string' || !LABEL_RE.test(itemLabel)) {
    return NextResponse.json({ error: 'Feld "item_label" fehlt oder ist ungültig' }, { status: 400 })
  }
  if (orientation !== 'portrait' && orientation !== 'landscape') {
    return NextResponse.json({ error: 'Feld "orientation" muss "portrait" oder "landscape" sein' }, { status: 400 })
  }

  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  try {
    await validateOverlayBuffer(buffer)
  } catch (err) {
    if (err instanceof OverlayValidationError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: 400 })
    }
    throw err
  }

  const admin = createAdminClient()
  const storagePath = `listing-image-sets/${setId}/${itemLabel}-${orientation}.png`

  const { error: uploadErr } = await admin.storage
    .from(BUCKET)
    .upload(storagePath, buffer, {
      contentType: 'image/png',
      upsert: true,
      cacheControl: '3600',
    })
  if (uploadErr) {
    return NextResponse.json({ error: `Storage-Upload fehlgeschlagen: ${uploadErr.message}` }, { status: 500 })
  }

  const { data: urlData } = admin.storage.from(BUCKET).getPublicUrl(storagePath)
  const url = `${urlData.publicUrl}?v=${Date.now()}`

  return NextResponse.json({ url })
}
