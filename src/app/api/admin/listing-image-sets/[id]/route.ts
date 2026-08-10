import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase-admin'

const SLUG_RE = /^[a-z0-9][a-z0-9-]*$/

const PatchSchema = z.object({
  slug: z.string().regex(SLUG_RE).optional(),
  name: z.string().trim().min(1).max(200).optional(),
  description: z.string().max(1000).nullable().optional(),
  poster_type: z.enum(['map', 'star-map', 'photo']).nullable().optional(),
  is_active: z.boolean().optional(),
})

/**
 * GET    — Set inkl. aller Items (geordnet) für Detail-/Editor-Ansicht.
 * PATCH  — Set-Metadaten ändern.
 * DELETE — Set löschen (Items kaskadieren per FK).
 */
export async function GET(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: 'Forbidden' }, { status: auth.status })

  const { id } = await context.params
  const admin = createAdminClient()

  const { data: set, error: setErr } = await admin
    .from('listing_image_sets')
    .select('*')
    .eq('id', id)
    .single()
  if (setErr || !set) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data: items, error: itemsErr } = await admin
    .from('listing_image_set_items')
    .select('id, listing_image_set_id, mockup_set_id, annotation_portrait_url, annotation_landscape_url, label, display_name, display_order, palette_mode, created_at, updated_at')
    .eq('listing_image_set_id', id)
    .order('display_order')
  if (itemsErr) return NextResponse.json({ error: itemsErr.message }, { status: 500 })

  return NextResponse.json({ listing_image_set: set, items: items ?? [] })
}

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
  const { data, error } = await admin
    .from('listing_image_sets')
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ listing_image_set: data })
}

export async function DELETE(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: 'Forbidden' }, { status: auth.status })

  const { id } = await context.params
  const admin = createAdminClient()

  // Schutz: keine Löschung wenn etsy_listing_defs darauf zeigen (PROJ-54/53-FK
  // wird in Phase 3 hinzugefügt; bis dahin reicht der Check über die Spalte,
  // falls sie schon existiert).
  const { data: refs } = await admin
    .from('etsy_listing_defs')
    .select('id, name')
    .eq('listing_image_set_id', id)
    .limit(3)
  if (refs && refs.length > 0) {
    return NextResponse.json(
      { error: `Listing-Image-Set wird noch von ${refs.length} Etsy-Listing-Definition(en) verwendet (z. B. „${refs[0].name}"). Erst entfernen, dann löschen.` },
      { status: 409 },
    )
  }

  const { error } = await admin.from('listing_image_sets').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
