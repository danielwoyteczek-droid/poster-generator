import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase-admin'

// PROJ-53: Liste + Anlage von Etsy-Listing-Definitionen (Master-Design + Looks).

const CreateSchema = z.object({
  name: z.string().trim().min(1).max(200),
  template_key: z.enum(['stadtkarte', 'herz', 'sternenkarte']),
  base_preset_id: z.string().uuid(),
  palette_ids: z.array(z.string().min(1)).default([]),
  mockup_set_ids: z.array(z.string().uuid()).default([]),
  status: z.enum(['draft', 'published']).optional(),
  // Ort überschreibt die Preset-Koordinaten (nur Kartenausschnitt)
  location_name: z.string().max(200).nullable().optional(),
  location_lat: z.number().min(-90).max(90).nullable().optional(),
  location_lng: z.number().min(-180).max(180).nullable().optional(),
  location_zoom: z.number().min(0).max(22).nullable().optional(),
  // PROJ-54: optionale Verknüpfung zu einem Listing-Image-Set
  listing_image_set_id: z.string().uuid().nullable().optional(),
  // PROJ-54 Phase A: Haupt-Palette für palette_mode='main'-Items
  main_palette_id: z.string().min(1).nullable().optional(),
})

export async function GET() {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: 'Forbidden' }, { status: auth.status })

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('etsy_listing_defs')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ defs: data ?? [] })
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: 'Forbidden' }, { status: auth.status })

  const body = await req.json().catch(() => null)
  const parsed = CreateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid body', details: parsed.error.flatten() }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('etsy_listing_defs')
    .insert(parsed.data)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ def: data }, { status: 201 })
}
