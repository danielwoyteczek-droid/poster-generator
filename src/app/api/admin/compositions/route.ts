import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase-admin'
import { TargetLocalesSchema } from '@/lib/preset-locales'

const CreateSchema = z.object({
  name: z.string().trim().min(1).max(200),
  description: z.string().max(1000).nullable().optional(),
  mockup_set_id: z.string().uuid(),
  slot_preset_ids: z.array(z.string().uuid()).min(1),
  target_locales: TargetLocalesSchema.optional(),
})

export async function GET(_req: NextRequest) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: 'Forbidden' }, { status: auth.status })

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('mockup_compositions')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ compositions: data ?? [] })
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

  // Validate: alle slot_preset_ids existieren + sind published
  const { data: presets } = await admin
    .from('presets')
    .select('id, status')
    .in('id', parsed.data.slot_preset_ids)
  const presetMap = Object.fromEntries((presets ?? []).map((p) => [p.id, p]))
  const missing = parsed.data.slot_preset_ids.filter((id) => !presetMap[id])
  if (missing.length > 0) {
    return NextResponse.json({ error: `Presets nicht gefunden: ${missing.join(', ')}` }, { status: 400 })
  }
  const unpublished = parsed.data.slot_preset_ids.filter((id) => presetMap[id]?.status !== 'published')
  if (unpublished.length > 0) {
    return NextResponse.json({ error: `Presets nicht published: ${unpublished.join(', ')}` }, { status: 400 })
  }

  // Validate: mockup_set hat genau N Slots passend zur slot_preset_ids-Länge
  const { data: mockupSet } = await admin
    .from('mockup_sets')
    .select('id, desktop_slot_uuids, mobile_slot_uuids')
    .eq('id', parsed.data.mockup_set_id)
    .single()
  if (!mockupSet) {
    return NextResponse.json({ error: 'Mockup-Set nicht gefunden' }, { status: 400 })
  }
  const slotCount = (mockupSet.desktop_slot_uuids ?? []).length
  if (slotCount !== parsed.data.slot_preset_ids.length) {
    return NextResponse.json(
      { error: `Mockup-Set hat ${slotCount} Slots, aber ${parsed.data.slot_preset_ids.length} Presets übergeben` },
      { status: 400 },
    )
  }

  const { data, error } = await admin
    .from('mockup_compositions')
    .insert({
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      mockup_set_id: parsed.data.mockup_set_id,
      slot_preset_ids: parsed.data.slot_preset_ids,
      target_locales: parsed.data.target_locales ?? [],
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ composition: data }, { status: 201 })
}
