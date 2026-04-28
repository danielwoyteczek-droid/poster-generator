import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase-admin'

const PostSchema = z.object({
  mockup_set_ids: z.array(z.string().uuid()).optional(),
})

/**
 * Setzt das Preset auf render_status='pending' und (optional) ändert
 * die Mockup-Sets, die der Worker beim Rendern verwenden soll.
 *
 * Worker pickt das Preset im nächsten Poll-Zyklus auf.
 */
export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: 'Forbidden' }, { status: auth.status })

  const { id } = await context.params
  const body = await req.json().catch(() => ({}))
  const parsed = PostSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid body' }, { status: 400 })

  const updates: Record<string, unknown> = {
    render_status: 'pending',
    render_error: null,
    render_started_at: null,
    render_completed_at: null,
    render_worker_id: null,
  }
  if (parsed.data.mockup_set_ids !== undefined) {
    updates.mockup_set_ids = parsed.data.mockup_set_ids
  }

  const admin = createAdminClient()

  // Worker lädt Preset via öffentlicher /api/presets/[id]-Route, die nur
  // published Presets serviert. Drafts würden 404 → leerer Default-Render.
  const { data: existing } = await admin
    .from('presets')
    .select('status')
    .eq('id', id)
    .single()
  if (existing?.status !== 'published') {
    return NextResponse.json(
      { error: 'Preset muss veröffentlicht sein, bevor es gerendert werden kann.' },
      { status: 400 },
    )
  }

  const { data, error } = await admin
    .from('presets')
    .update(updates)
    .eq('id', id)
    .select('id, name, render_status, mockup_set_ids')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json({ preset: data })
}
