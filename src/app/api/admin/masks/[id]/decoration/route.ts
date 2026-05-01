import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase-admin'

const BUCKET = 'decorations'

/**
 * Upload (or replace) the decoration SVG for a custom mask.
 * Multipart form: `decoration_svg` (File). Stored at `${id}/decoration.svg`.
 * Setting `decoration_svg_url` on the mask row to the public URL.
 */
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: 'Forbidden' }, { status: auth.status })

  const { id } = await context.params

  const formData = await req.formData()
  const file = formData.get('decoration_svg')
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Decoration-SVG fehlt' }, { status: 400 })
  }
  if (!file.type.includes('svg')) {
    return NextResponse.json({ error: 'Datei muss SVG sein' }, { status: 400 })
  }

  const admin = createAdminClient()

  const { data: mask } = await admin.from('custom_masks').select('id').eq('id', id).single()
  if (!mask) return NextResponse.json({ error: 'Maske nicht gefunden' }, { status: 404 })

  const svgText = await file.text()
  // Lightweight validation — full path-extraction isn't required here, but a
  // viewBox is mandatory so the editor can align the decoration with the poster.
  if (!/<svg[^>]*viewBox/i.test(svgText)) {
    return NextResponse.json({ error: 'SVG hat keine viewBox' }, { status: 400 })
  }

  const path = `${id}/decoration.svg`
  const { error: upErr } = await admin.storage
    .from(BUCKET)
    .upload(path, new TextEncoder().encode(svgText), {
      contentType: 'image/svg+xml',
      upsert: true,
    })
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 })

  const { data: urlData } = admin.storage.from(BUCKET).getPublicUrl(path)
  const decoration_svg_url = urlData.publicUrl

  const { data, error } = await admin
    .from('custom_masks')
    .update({ decoration_svg_url })
    .eq('id', id)
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ mask: data })
}

/**
 * Remove the decoration: delete the SVG from storage and clear
 * `decoration_svg_url` on the mask row.
 */
export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: 'Forbidden' }, { status: auth.status })

  const { id } = await context.params
  const admin = createAdminClient()

  const { data: mask } = await admin.from('custom_masks').select('id, decoration_svg_url').eq('id', id).single()
  if (!mask) return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 })

  if (mask.decoration_svg_url) {
    await admin.storage.from(BUCKET).remove([`${id}/decoration.svg`]).catch(() => {})
  }

  const { data, error } = await admin
    .from('custom_masks')
    .update({ decoration_svg_url: null })
    .eq('id', id)
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ mask: data })
}
