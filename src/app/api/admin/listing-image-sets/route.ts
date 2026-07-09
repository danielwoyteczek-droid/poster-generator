import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase-admin'

const SLUG_RE = /^[a-z0-9][a-z0-9-]*$/

const PosterTypeSchema = z.enum(['map', 'star-map', 'photo']).nullable().optional()

const CreateSchema = z.object({
  slug: z.string().regex(SLUG_RE, 'Nur Kleinbuchstaben, Zahlen und Bindestriche'),
  name: z.string().trim().min(1).max(200),
  description: z.string().max(1000).nullable().optional(),
  poster_type: PosterTypeSchema,
  is_active: z.boolean().optional(),
})

/**
 * PROJ-54: Listing-Image-Sets — Wiederverwendbare Etsy-Bild-Vorlagen.
 * GET  — Liste aller Sets mit Item-Count pro Set.
 * POST — Neues Set anlegen.
 */
export async function GET(_req: NextRequest) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: 'Forbidden' }, { status: auth.status })

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('listing_image_sets')
    .select('id, slug, name, description, poster_type, is_active, created_at, updated_at, listing_image_set_items(count)')
    .order('name')
    .limit(500)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Postgrest gibt count als Array `[{count: N}]` zurück — flatten.
  const sets = (data ?? []).map((s) => {
    const itemsRel = (s as unknown as { listing_image_set_items?: { count: number }[] }).listing_image_set_items
    return {
      ...s,
      items_count: Array.isArray(itemsRel) && itemsRel[0] ? itemsRel[0].count : 0,
      listing_image_set_items: undefined,
    }
  })
  return NextResponse.json({ listing_image_sets: sets })
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
    .from('listing_image_sets')
    .insert(parsed.data)
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ listing_image_set: data }, { status: 201 })
}
