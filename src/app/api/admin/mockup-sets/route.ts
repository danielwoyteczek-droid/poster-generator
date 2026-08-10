import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase-admin'

const SlotSchema = z.object({
  x: z.number().int().min(0),
  y: z.number().int().min(0),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  canvasWidth: z.number().int().positive(),
  canvasHeight: z.number().int().positive(),
})

const BaseSchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/, 'Nur Kleinbuchstaben, Zahlen und Bindestriche'),
  name: z.string().trim().min(1).max(200),
  description: z.string().max(1000).nullable().optional(),
  is_active: z.boolean().optional(),
})

const DynamicMockupsSchema = BaseSchema.extend({
  provider: z.literal('dynamic_mockups'),
  desktop_template_uuid: z.string().uuid(),
  desktop_smart_object_uuid: z.string().uuid(),
  mobile_template_uuid: z.string().uuid(),
  mobile_smart_object_uuid: z.string().uuid(),
  desktop_thumbnail_url: z.string().url().nullable().optional(),
  mobile_thumbnail_url: z.string().url().nullable().optional(),
})

const LocalSchema = BaseSchema.extend({
  provider: z.literal('local'),
  local_portrait_overlay_url: z.string().url().nullable().optional(),
  local_portrait_slot: SlotSchema.nullable().optional(),
  local_landscape_overlay_url: z.string().url().nullable().optional(),
  local_landscape_slot: SlotSchema.nullable().optional(),
}).refine(
  (v) =>
    (v.local_portrait_overlay_url != null && v.local_portrait_slot != null) ||
    (v.local_landscape_overlay_url != null && v.local_landscape_slot != null),
  { message: 'Mindestens eine Orientierung (Hochformat oder Querformat) muss Overlay-URL + Slot enthalten' },
).refine(
  (v) => (v.local_portrait_overlay_url == null) === (v.local_portrait_slot == null),
  { message: 'Hochformat: Overlay-URL und Slot müssen zusammen gesetzt sein' },
).refine(
  (v) => (v.local_landscape_overlay_url == null) === (v.local_landscape_slot == null),
  { message: 'Querformat: Overlay-URL und Slot müssen zusammen gesetzt sein' },
)

// preprocess fills missing provider with 'dynamic_mockups' so Bestands-Frontend
// und ältere CSV-Importer (die kein provider-Feld mitschicken) weiterhin
// funktionieren — Default matched DB-seitig auch dynamic_mockups.
const CreateSchema = z.preprocess(
  (raw) => {
    if (raw && typeof raw === 'object' && !('provider' in raw)) {
      return { ...raw, provider: 'dynamic_mockups' }
    }
    return raw
  },
  z.discriminatedUnion('provider', [DynamicMockupsSchema, LocalSchema]),
)

/**
 * GET /api/admin/mockup-sets — Liste aller Mockup-Sets
 * POST                       — neues Mockup-Set anlegen (Provider 'dynamic_mockups' oder 'local')
 */
export async function GET(_req: NextRequest) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: 'Forbidden' }, { status: auth.status })

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('mockup_sets')
    .select(
      'id, slug, name, description, provider, ' +
      'desktop_template_uuid, desktop_smart_object_uuid, desktop_slot_uuids, ' +
      'mobile_template_uuid, mobile_smart_object_uuid, mobile_slot_uuids, ' +
      'desktop_thumbnail_url, mobile_thumbnail_url, ' +
      'local_portrait_overlay_url, local_portrait_slot, ' +
      'local_landscape_overlay_url, local_landscape_slot, ' +
      'is_active, version, created_at, updated_at',
    )
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
    const firstIssue = parsed.error.issues[0]
    const issueMessage = firstIssue?.message ?? 'Ungültiger Body'
    return NextResponse.json({ error: issueMessage, details: parsed.error.flatten() }, { status: 400 })
  }

  const admin = createAdminClient()

  const payload = parsed.data
  const normalizedPayload = (() => {
    if (payload.provider === 'dynamic_mockups') {
      const slotUuid = payload.desktop_smart_object_uuid
      return {
        ...payload,
        desktop_slot_uuids: [slotUuid],
        mobile_slot_uuids: [slotUuid],
      }
    }

    const portraitSlot = payload.local_portrait_slot ? [payload.local_portrait_slot] : []
    const landscapeSlot = payload.local_landscape_slot ? [payload.local_landscape_slot] : []
    return {
      ...payload,
      local_portrait_slot: payload.local_portrait_slot ?? null,
      local_landscape_slot: payload.local_landscape_slot ?? null,
      desktop_slot_uuids: portraitSlot.length > 0 ? [payload.local_portrait_overlay_url ?? ''] : [],
      mobile_slot_uuids: landscapeSlot.length > 0 ? [payload.local_landscape_overlay_url ?? ''] : [],
    }
  })()

  const { data, error } = await admin
    .from('mockup_sets')
    .insert(normalizedPayload)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ mockup_set: data }, { status: 201 })
}
