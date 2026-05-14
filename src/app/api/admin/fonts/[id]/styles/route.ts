import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase-admin'
import { FONTS_BUCKET, styleRowToStyle } from '@/lib/fonts-server'
import { validateFontFile, buildFontStoragePath } from '@/lib/font-validation'

/**
 * POST /api/admin/fonts/[id]/styles
 *
 * Adds a single new style (weight + style + file) to an existing font.
 * Used by the Edit-Dialog when the admin clicks "Schnitt hinzufügen" after
 * the font has already been created.
 */
export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: 'Forbidden' }, { status: auth.status })

  const { id } = await context.params

  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json({ error: 'Multipart-Form erwartet' }, { status: 400 })
  }

  const file = formData.get('file')
  const weightRaw = formData.get('weight')
  const styleRaw = formData.get('style')

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Datei fehlt' }, { status: 400 })
  }
  const weight = typeof weightRaw === 'string' ? Number(weightRaw) : NaN
  if (!Number.isInteger(weight) || weight < 100 || weight > 900 || weight % 100 !== 0) {
    return NextResponse.json({ error: 'weight ungültig (100–900, Schritte von 100)' }, { status: 400 })
  }
  if (styleRaw !== 'normal' && styleRaw !== 'italic') {
    return NextResponse.json({ error: "style muss 'normal' oder 'italic' sein" }, { status: 400 })
  }

  const v = await validateFontFile(file)
  if (!v.ok || !v.extension) {
    return NextResponse.json({ error: v.error ?? 'Datei ungültig' }, { status: 400 })
  }

  const admin = createAdminClient()

  // Verify parent font exists
  const { data: parent, error: parentErr } = await admin
    .from('fonts')
    .select('id')
    .eq('id', id)
    .maybeSingle()
  if (parentErr || !parent) return NextResponse.json({ error: 'Font nicht gefunden' }, { status: 404 })

  const storagePath = buildFontStoragePath(id, weight, styleRaw, v.extension)
  const bytes = new Uint8Array(await file.arrayBuffer())
  const { error: upErr } = await admin.storage
    .from(FONTS_BUCKET)
    .upload(storagePath, bytes, {
      contentType: file.type || 'application/octet-stream',
      upsert: false,
    })
  if (upErr) {
    return NextResponse.json({ error: `Storage-Upload fehlgeschlagen: ${upErr.message}` }, { status: 500 })
  }

  const { data: inserted, error: insertErr } = await admin
    .from('font_styles')
    .insert({
      font_id: id,
      weight,
      style: styleRaw,
      storage_path: storagePath,
      file_size_bytes: file.size,
    })
    .select()
    .single()

  if (insertErr) {
    // Roll back storage upload to avoid orphan
    await admin.storage.from(FONTS_BUCKET).remove([storagePath])
    const isDuplicate = insertErr.code === '23505'
    return NextResponse.json(
      {
        error: isDuplicate
          ? `Schnitt ${weight}/${styleRaw} existiert bereits für diese Font`
          : insertErr.message,
      },
      { status: isDuplicate ? 409 : 500 },
    )
  }

  return NextResponse.json({ style: styleRowToStyle(admin, inserted) }, { status: 201 })
}
