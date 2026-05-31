import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase-admin'

// PROJ-53: CRUD für eine einzelne Listing-Definition.

const PatchSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  template_key: z.enum(['stadtkarte', 'herz', 'sternenkarte']).optional(),
  base_preset_id: z.string().uuid().optional(),
  palette_ids: z.array(z.string().min(1)).optional(),
  mockup_set_ids: z.array(z.string().uuid()).optional(),
  status: z.enum(['draft', 'published']).optional(),
  location_name: z.string().max(200).nullable().optional(),
  location_lat: z.number().min(-90).max(90).nullable().optional(),
  location_lng: z.number().min(-180).max(180).nullable().optional(),
  location_zoom: z.number().min(0).max(22).nullable().optional(),
})

export async function GET(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: 'Forbidden' }, { status: auth.status })

  const { id } = await context.params
  const admin = createAdminClient()

  const { data: def, error } = await admin
    .from('etsy_listing_defs')
    .select('*')
    .eq('id', id)
    .single()
  if (error || !def) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data: variants } = await admin
    .from('etsy_listing_variants')
    .select('id, palette_id, cloned_preset_id, created_at')
    .eq('listing_def_id', id)

  return NextResponse.json({ def, variants: variants ?? [] })
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
    .from('etsy_listing_defs')
    .update(parsed.data)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ def: data })
}

export async function DELETE(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: 'Forbidden' }, { status: auth.status })

  const { id } = await context.params
  const admin = createAdminClient()

  // etsy_listing_variants hängen per ON DELETE CASCADE dran; die erzeugten
  // Preset-Klone bleiben bewusst bestehen (haben evtl. schon Renders/Storage).
  const { error } = await admin.from('etsy_listing_defs').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return new NextResponse(null, { status: 204 })
}
