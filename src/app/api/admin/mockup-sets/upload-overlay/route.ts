import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase-admin'
import {
  validateOverlayBuffer,
  detectMagentaSlotAndStrip,
  applyManualSlot,
  OverlayValidationError,
} from '@/lib/local-mockup-processor'

export const runtime = 'nodejs'

/**
 * PROJ-52: Upload eines lokalen Mockup-Overlays.
 *
 * Multipart-Felder:
 *   - file:          PNG (≤ 5 MB)
 *   - slug:          Mockup-Set-Slug (Pfad-Komponente in Storage)
 *   - orientation:   'portrait' | 'landscape'
 *   - slot_override: optional JSON `{x,y,width,height}` — wenn gesetzt,
 *                    wird die Magenta-Detection übersprungen und das Overlay
 *                    1:1 (mit erwarteter Transparenz im Slot-Bereich) hochgeladen.
 *
 * Antwort:
 *   { url: string, slot: { x,y,width,height,canvasWidth,canvasHeight } }
 *
 * Hinweis: Dieser Endpoint speichert NUR Datei + extrahierte Koordinaten
 * im Storage und liefert sie als JSON zurück. Die Verknüpfung mit dem
 * Mockup-Set-DB-Eintrag erfolgt anschließend durch einen separaten
 * POST/PATCH-Call auf /api/admin/mockup-sets.
 */

const SlotOverrideSchema = z.object({
  x: z.number().int().min(0),
  y: z.number().int().min(0),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
})

const SLUG_RE = /^[a-z0-9-]+$/

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
  const slug = formData.get('slug')
  const orientation = formData.get('orientation')
  const slotOverrideRaw = formData.get('slot_override')

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Feld "file" fehlt oder ist keine Datei' }, { status: 400 })
  }
  if (typeof slug !== 'string' || !SLUG_RE.test(slug)) {
    return NextResponse.json(
      { error: 'Feld "slug" fehlt oder ist ungültig (nur Kleinbuchstaben/Zahlen/Bindestriche)' },
      { status: 400 },
    )
  }
  if (orientation !== 'portrait' && orientation !== 'landscape') {
    return NextResponse.json(
      { error: 'Feld "orientation" muss "portrait" oder "landscape" sein' },
      { status: 400 },
    )
  }

  let slotOverride: z.infer<typeof SlotOverrideSchema> | null = null
  if (typeof slotOverrideRaw === 'string' && slotOverrideRaw.trim().length > 0) {
    let parsed: unknown
    try {
      parsed = JSON.parse(slotOverrideRaw)
    } catch {
      return NextResponse.json({ error: '"slot_override" ist kein gültiges JSON' }, { status: 400 })
    }
    const result = SlotOverrideSchema.safeParse(parsed)
    if (!result.success) {
      return NextResponse.json(
        { error: 'Ungültige slot_override-Form', details: result.error.flatten() },
        { status: 400 },
      )
    }
    slotOverride = result.data
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

  let processed
  try {
    processed = slotOverride
      ? await applyManualSlot(buffer, slotOverride)
      : await detectMagentaSlotAndStrip(buffer)
  } catch (err) {
    if (err instanceof OverlayValidationError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: 400 })
    }
    throw err
  }

  const admin = createAdminClient()
  const storagePath = `${slug}/${orientation}.png`

  const { error: uploadErr } = await admin.storage
    .from(BUCKET)
    .upload(storagePath, processed.processedPng, {
      contentType: 'image/png',
      upsert: true,
      cacheControl: '3600',
    })
  if (uploadErr) {
    return NextResponse.json({ error: `Storage-Upload fehlgeschlagen: ${uploadErr.message}` }, { status: 500 })
  }

  const { data: urlData } = admin.storage.from(BUCKET).getPublicUrl(storagePath)
  // Cache-Bust-Suffix, damit Browser/Worker nach Replace nicht das alte
  // Overlay aus dem CDN ziehen.
  const url = `${urlData.publicUrl}?v=${Date.now()}`

  return NextResponse.json({ url, slot: processed.slot })
}
