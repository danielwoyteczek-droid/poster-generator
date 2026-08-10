import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase-admin'

const LABEL_RE = /^[a-z0-9][a-z0-9-]*$/

const PatchItemSchema = z.object({
  mockup_set_id: z.string().uuid().optional(),
  label: z.string().regex(LABEL_RE).max(60).optional(),
  display_name: z.string().trim().min(1).max(200).optional(),
  display_order: z.number().int().optional(),
  annotation_portrait_url: z.string().url().nullable().optional(),
  annotation_landscape_url: z.string().url().nullable().optional(),
  palette_mode: z.enum(['main', 'all', 'compare']).optional(),
})

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string; itemId: string }> }) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: 'Forbidden' }, { status: auth.status })

  const { id: setId, itemId } = await context.params
  const body = await req.json().catch(() => null)
  const parsed = PatchItemSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid body', details: parsed.error.flatten() }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('listing_image_set_items')
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq('id', itemId)
    .eq('listing_image_set_id', setId)
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ item: data })
}

export async function DELETE(_req: NextRequest, context: { params: Promise<{ id: string; itemId: string }> }) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: 'Forbidden' }, { status: auth.status })

  const { id: setId, itemId } = await context.params
  const admin = createAdminClient()
  const { error } = await admin
    .from('listing_image_set_items')
    .delete()
    .eq('id', itemId)
    .eq('listing_image_set_id', setId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
