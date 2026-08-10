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

// PATCH: alle Felder optional. provider ist absichtlich NICHT enthalten —
// laut PROJ-52-Spec ist Provider-Wechsel verboten (Datenintegrität gegenüber
// abhängigen Renders). Wer wechseln will, muss löschen + neu anlegen.
const PatchSchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/).optional(),
  name: z.string().trim().min(1).max(200).optional(),
  description: z.string().max(1000).nullable().optional(),
  is_active: z.boolean().optional(),
  // Dynamic-Mockups-Felder (nur sinnvoll wenn provider='dynamic_mockups')
  desktop_template_uuid: z.string().uuid().optional(),
  desktop_smart_object_uuid: z.string().uuid().optional(),
  mobile_template_uuid: z.string().uuid().optional(),
  mobile_smart_object_uuid: z.string().uuid().optional(),
  desktop_thumbnail_url: z.string().url().nullable().optional(),
  mobile_thumbnail_url: z.string().url().nullable().optional(),
  // Local-Provider-Felder (nur sinnvoll wenn provider='local')
  local_portrait_overlay_url: z.string().url().nullable().optional(),
  local_portrait_slot: SlotSchema.nullable().optional(),
  local_landscape_overlay_url: z.string().url().nullable().optional(),
  local_landscape_slot: SlotSchema.nullable().optional(),
})

export async function GET(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: 'Forbidden' }, { status: auth.status })

  const { id } = await context.params
  const admin = createAdminClient()
  const { data, error } = await admin.from('mockup_sets').select('*').eq('id', id).single()
  if (error || !data) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ mockup_set: data })
}

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: 'Forbidden' }, { status: auth.status })

  const { id } = await context.params
  const body = await req.json().catch(() => null)

  // Provider-Wechsel verbieten — Spec-Anforderung. Werfen wir vor Zod-Parse,
  // damit die Fehlermeldung klar ist.
  if (body && typeof body === 'object' && 'provider' in body) {
    return NextResponse.json(
      { error: 'Provider-Wechsel ist nicht erlaubt. Bitte das Mockup-Set löschen und neu anlegen.' },
      { status: 400 },
    )
  }

  const parsed = PatchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid body', details: parsed.error.flatten() }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('mockup_sets')
    .update(parsed.data)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ mockup_set: data })
}

export async function DELETE(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: 'Forbidden' }, { status: auth.status })

  const { id } = await context.params
  const admin = createAdminClient()

  // Schutz: keine Löschung wenn noch Presets das Set referenzieren
  const { data: refs } = await admin
    .from('presets')
    .select('id, name')
    .contains('mockup_set_ids', [id])
    .limit(5)

  if (refs && refs.length > 0) {
    return NextResponse.json(
      { error: `Mockup-Set wird noch von ${refs.length} Preset(s) referenziert (z. B. „${refs[0].name}"). Erst entfernen, dann löschen.` },
      { status: 409 },
    )
  }

  const { error } = await admin.from('mockup_sets').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
