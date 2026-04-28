import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase-admin'

const CreateSchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/, 'Nur Kleinbuchstaben, Zahlen und Bindestriche'),
  name: z.string().trim().min(1).max(200),
  description: z.string().max(1000).nullable().optional(),
  desktop_template_uuid: z.string().uuid(),
  desktop_smart_object_uuid: z.string().uuid(),
  mobile_template_uuid: z.string().uuid(),
  mobile_smart_object_uuid: z.string().uuid(),
  desktop_thumbnail_url: z.string().url().nullable().optional(),
  mobile_thumbnail_url: z.string().url().nullable().optional(),
  is_active: z.boolean().optional(),
})

/**
 * GET /api/admin/mockup-sets — Liste aller Mockup-Sets
 * POST                       — neues Mockup-Set anlegen
 */
export async function GET(_req: NextRequest) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: 'Forbidden' }, { status: auth.status })

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('mockup_sets')
    .select('id, slug, name, description, desktop_template_uuid, desktop_smart_object_uuid, desktop_slot_uuids, mobile_template_uuid, mobile_smart_object_uuid, mobile_slot_uuids, desktop_thumbnail_url, mobile_thumbnail_url, is_active, version, created_at, updated_at')
    .order('name')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ mockup_sets: data ?? [] })
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
    .from('mockup_sets')
    .insert(parsed.data)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ mockup_set: data }, { status: 201 })
}
