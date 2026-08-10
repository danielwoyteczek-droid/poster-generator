import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase-admin'

const LABEL_RE = /^[a-z0-9][a-z0-9-]*$/

const PaletteModeSchema = z.enum(['main', 'all', 'compare'])

const CreateItemSchema = z.object({
  mockup_set_id: z.string().uuid(),
  label: z.string().regex(LABEL_RE, 'Nur Kleinbuchstaben/Zahlen/Bindestriche').max(60),
  display_name: z.string().trim().min(1).max(200),
  display_order: z.number().int().optional(),
  annotation_portrait_url: z.string().url().nullable().optional(),
  annotation_landscape_url: z.string().url().nullable().optional(),
  palette_mode: PaletteModeSchema.optional(),
})

/**
 * POST — neues Item zu einem Listing-Image-Set hinzufügen.
 * display_order: wenn nicht angegeben, wird (max+10) gewählt damit Reorder
 * Platz hat.
 */
export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: 'Forbidden' }, { status: auth.status })

  const { id: setId } = await context.params
  const body = await req.json().catch(() => null)
  const parsed = CreateItemSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid body', details: parsed.error.flatten() }, { status: 400 })
  }

  const admin = createAdminClient()

  let displayOrder = parsed.data.display_order
  if (displayOrder === undefined) {
    const { data: existing } = await admin
      .from('listing_image_set_items')
      .select('display_order')
      .eq('listing_image_set_id', setId)
      .order('display_order', { ascending: false })
      .limit(1)
    const maxOrder = existing && existing.length > 0 ? (existing[0].display_order as number) : 0
    displayOrder = maxOrder + 10
  }

  const { data, error } = await admin
    .from('listing_image_set_items')
    .insert({
      listing_image_set_id: setId,
      mockup_set_id: parsed.data.mockup_set_id,
      label: parsed.data.label,
      display_name: parsed.data.display_name,
      display_order: displayOrder,
      annotation_portrait_url: parsed.data.annotation_portrait_url ?? null,
      annotation_landscape_url: parsed.data.annotation_landscape_url ?? null,
      ...(parsed.data.palette_mode && { palette_mode: parsed.data.palette_mode }),
    })
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ item: data }, { status: 201 })
}
