import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase-admin'
import { FONTS_BUCKET } from '@/lib/fonts-server'

/**
 * DELETE /api/admin/fonts/[id]/styles/[styleId]
 *
 * Removes a single style from a font. Refuses to remove the last style of
 * a published font (would leave the picker entry broken). Cleans up the
 * Storage file as well.
 */
export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ id: string; styleId: string }> },
) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: 'Forbidden' }, { status: auth.status })

  const { id, styleId } = await context.params
  const admin = createAdminClient()

  // Verify the style exists and belongs to this font
  const { data: style, error: styleErr } = await admin
    .from('font_styles')
    .select('id, storage_path, font_id')
    .eq('id', styleId)
    .eq('font_id', id)
    .maybeSingle()
  if (styleErr || !style) return NextResponse.json({ error: 'Schnitt nicht gefunden' }, { status: 404 })

  // Count siblings — refuse if this is the last one for a published font.
  const { data: parent } = await admin
    .from('fonts')
    .select('id, status')
    .eq('id', id)
    .maybeSingle()

  if (parent?.status === 'published') {
    const { count } = await admin
      .from('font_styles')
      .select('id', { count: 'exact', head: true })
      .eq('font_id', id)
    if ((count ?? 0) <= 1) {
      return NextResponse.json(
        { error: 'Letzten Schnitt einer veröffentlichten Font nicht löschen — vorher Font zurückziehen oder weiteren Schnitt hinzufügen' },
        { status: 409 },
      )
    }
  }

  const { error: dbErr } = await admin.from('font_styles').delete().eq('id', styleId)
  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 })

  // Best-effort storage cleanup
  let warning: string | null = null
  if (style.storage_path) {
    const { error: rmErr } = await admin.storage.from(FONTS_BUCKET).remove([style.storage_path])
    if (rmErr) warning = `Storage-Cleanup fehlgeschlagen: ${rmErr.message}`
  }
  return NextResponse.json({ ok: true, warning })
}
