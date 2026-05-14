import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase-admin'
import { getFontById, findFontReferences, FONTS_BUCKET } from '@/lib/fonts-server'

const PatchSchema = z.object({
  family_name: z.string().trim().min(1).max(100).optional(),
  category: z.enum(['serif', 'script', 'sans', 'display']).optional(),
  description: z.string().max(500).nullable().optional(),
  display_order: z.number().int().optional(),
  status: z.enum(['draft', 'published']).optional(),
})

/**
 * GET — single font by id (any status). Used by the admin list refresh
 * and by the force-load path for older customer projects that reference
 * a font which has since been unpublished. Auth-gated to admins only so
 * draft fonts don't leak; the customer-facing force-load instead goes
 * through a separate read-only endpoint if we ever need one (Spec OK).
 */
export async function GET(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: 'Forbidden' }, { status: auth.status })

  const { id } = await context.params
  const admin = createAdminClient()
  const font = await getFontById(admin, id)
  if (!font) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ font })
}

/**
 * PATCH — update metadata or status. Unpublishing a font that is
 * referenced by published presets or saved customer projects is blocked
 * with a 409 so the admin can fix references first.
 */
export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: 'Forbidden' }, { status: auth.status })

  const { id } = await context.params
  const body = await req.json().catch(() => null)
  const parsed = PatchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid body', details: parsed.error.flatten() }, { status: 400 })
  }

  const admin = createAdminClient()
  const existing = await getFontById(admin, id)
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Unpublish check: if the admin wants to set status = 'draft' on a font
  // that's currently published and referenced anywhere, refuse.
  if (parsed.data.status === 'draft' && existing.status === 'published') {
    const refs = await findFontReferences(admin, existing.family_name)
    if (refs.presets.length > 0 || refs.projects.length > 0) {
      return NextResponse.json(
        { error: 'Font wird in Presets/Projekten verwendet', blockedBy: refs },
        { status: 409 },
      )
    }
  }

  // Rename check: family_name is the CSS-`font-family` value stored verbatim
  // in `presets.config_json` and `projects.config_json` textBlocks. Renaming
  // a font that's referenced anywhere would silently break those designs
  // (the picker reset to a system fallback). Refuse the rename so the admin
  // is forced to either (a) reset the referenced designs first or (b) accept
  // that no rename happens.
  if (
    parsed.data.family_name !== undefined &&
    parsed.data.family_name.trim() !== existing.family_name
  ) {
    const refs = await findFontReferences(admin, existing.family_name)
    if (refs.presets.length > 0 || refs.projects.length > 0) {
      return NextResponse.json(
        {
          error: 'Font-Family wird in Presets/Projekten referenziert — Umbenennen würde Bestands-Designs brechen',
          blockedBy: refs,
        },
        { status: 409 },
      )
    }
  }

  // Refuse publishing a font with no styles — would be a broken picker entry.
  if (parsed.data.status === 'published' && existing.styles.length === 0) {
    return NextResponse.json(
      { error: 'Font hat keinen Schnitt — vor dem Veröffentlichen mindestens einen Schnitt hochladen' },
      { status: 400 },
    )
  }

  const updates: Record<string, unknown> = { ...parsed.data, updated_at: new Date().toISOString() }
  if (parsed.data.status === 'published') {
    updates.published_at = new Date().toISOString()
  }

  const { data, error } = await admin.from('fonts').update(updates).eq('id', id).select().single()
  if (error) {
    const isDuplicate = error.code === '23505'
    return NextResponse.json(
      { error: isDuplicate ? 'Family-Name bereits vergeben' : error.message },
      { status: isDuplicate ? 409 : 500 },
    )
  }
  return NextResponse.json({ font: data })
}

/**
 * DELETE — drop a font + all its styles + all storage files.
 * Blocked with 409 if any preset or project still references the family.
 */
export async function DELETE(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: 'Forbidden' }, { status: auth.status })

  const { id } = await context.params
  const admin = createAdminClient()

  const existing = await getFontById(admin, id)
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const refs = await findFontReferences(admin, existing.family_name)
  if (refs.presets.length > 0 || refs.projects.length > 0) {
    return NextResponse.json(
      { error: 'Font wird in Presets/Projekten verwendet', blockedBy: refs },
      { status: 409 },
    )
  }

  // Collect storage paths before the DB delete (CASCADE wipes font_styles).
  const { data: styleRows } = await admin
    .from('font_styles')
    .select('storage_path')
    .eq('font_id', id)
  const paths = (styleRows ?? []).map((r: { storage_path: string }) => r.storage_path)

  const { error: delErr } = await admin.from('fonts').delete().eq('id', id)
  if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 })

  // Best-effort storage cleanup. If this fails the DB rows are gone but
  // some orphan files remain — they cost essentially nothing and can be
  // GC'd manually. We log it via the response so the admin sees the issue.
  let storageWarning: string | null = null
  if (paths.length > 0) {
    const { error: storageErr } = await admin.storage.from(FONTS_BUCKET).remove(paths)
    if (storageErr) storageWarning = `Storage-Cleanup partiell fehlgeschlagen: ${storageErr.message}`
  }

  return NextResponse.json(
    { ok: true, warning: storageWarning },
    { status: 200 },
  )
}
