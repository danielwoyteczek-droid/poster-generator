import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase-admin'
import { listMockups, DynamicMockupsApiError } from '@/lib/dynamic-mockups-client'

/**
 * GET — Listet alle Mockups aus Dynamic Mockups, markiert die bereits importierten.
 * POST — Importiert ausgewählte Mockups als mockup_sets-Rows.
 */
export async function GET(_req: NextRequest) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: 'Forbidden' }, { status: auth.status })

  try {
    const mockups = await listMockups()
    const admin = createAdminClient()
    const { data: existing } = await admin.from('mockup_sets').select('desktop_template_uuid')
    const existingUuids = new Set((existing ?? []).map((e) => e.desktop_template_uuid))

    return NextResponse.json({
      mockups: mockups.map((m) => ({
        uuid: m.uuid,
        name: m.name,
        thumbnail: m.thumbnail,
        smart_objects: m.smart_objects,
        already_imported: existingUuids.has(m.uuid),
      })),
    })
  } catch (err) {
    const msg = err instanceof DynamicMockupsApiError ? err.message : (err as Error).message
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

const PostSchema = z.object({
  imports: z.array(z.object({
    mockup_uuid: z.string().uuid(),
    smart_object_uuid: z.string().uuid(), // primärer Slot (für Single-Preset-Rendering)
    all_smart_object_uuids: z.array(z.string().uuid()).optional(), // alle Slots in der PSD-Reihenfolge
    name: z.string().trim().min(1).max(200),
    slug: z.string().regex(/^[a-z0-9-]+$/),
  })).min(1),
})

export async function POST(req: NextRequest) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: 'Forbidden' }, { status: auth.status })

  const body = await req.json().catch(() => null)
  const parsed = PostSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid body' }, { status: 400 })

  const admin = createAdminClient()
  const inserts = parsed.data.imports.map((i) => {
    const slots = i.all_smart_object_uuids && i.all_smart_object_uuids.length > 0
      ? i.all_smart_object_uuids
      : [i.smart_object_uuid]
    return {
      name: i.name,
      slug: i.slug,
      desktop_template_uuid: i.mockup_uuid,
      desktop_smart_object_uuid: i.smart_object_uuid,
      desktop_slot_uuids: slots,
      mobile_template_uuid: i.mockup_uuid,
      mobile_smart_object_uuid: i.smart_object_uuid,
      mobile_slot_uuids: slots,
      is_active: true,
    }
  })

  const { data, error } = await admin.from('mockup_sets').insert(inserts).select('id, slug, name')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ created_count: data?.length ?? 0, created: data ?? [] })
}
