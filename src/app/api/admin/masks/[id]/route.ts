import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase-admin'

const PatchSchema = z.object({
  is_public: z.boolean().optional(),
  decoration_svg_url: z.string().url().nullable().optional(),
})

/**
 * Update visibility flag and/or decoration URL of a custom mask.
 * Decoration upload itself goes through POST /decoration — this PATCH only
 * accepts a pre-existing URL (or null) so the admin can clear without re-uploading.
 */
export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: 'Forbidden' }, { status: auth.status })

  const { id } = await context.params

  const body = await req.json().catch(() => null)
  const parsed = PatchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Ungültige Eingabe', issues: parsed.error.issues }, { status: 400 })
  }

  // Reject empty patches so callers don't trigger an updated_at bump for nothing.
  if (parsed.data.is_public === undefined && parsed.data.decoration_svg_url === undefined) {
    return NextResponse.json({ error: 'Keine Felder zum Aktualisieren' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('custom_masks')
    .update(parsed.data)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 })
  return NextResponse.json({ mask: data })
}

/**
 * Delete a custom mask. Blocks when at least one preset references this mask
 * via `config_json.maskKey`, returning 409 with the list of referencing presets.
 * Pass `?force=true` to override (admin-confirmed delete).
 */
export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: 'Forbidden' }, { status: auth.status })

  const { id } = await context.params
  const force = req.nextUrl.searchParams.get('force') === 'true'
  const admin = createAdminClient()

  const { data: mask } = await admin
    .from('custom_masks')
    .select('id, mask_key, decoration_svg_url')
    .eq('id', id)
    .single()
  if (!mask) return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 })

  if (!force) {
    // jsonb_extract_path_text equivalent — Supabase JS uses ->> via filter syntax.
    const { data: refs } = await admin
      .from('presets')
      .select('id, name, status')
      .eq('config_json->>maskKey', mask.mask_key)
      .limit(50)
    if (refs && refs.length > 0) {
      return NextResponse.json(
        {
          error: 'Maske wird in Presets verwendet',
          referencingPresets: refs,
        },
        { status: 409 },
      )
    }
  }

  // Best-effort cleanup of associated storage files.
  await admin.storage.from('masks').remove([`${id}/mask.svg`]).catch(() => {})
  if (mask.decoration_svg_url) {
    await admin.storage.from('decorations').remove([`${id}/decoration.svg`]).catch(() => {})
  }

  const { error } = await admin.from('custom_masks').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return new NextResponse(null, { status: 204 })
}
