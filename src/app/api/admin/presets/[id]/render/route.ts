import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase-admin'

const PostSchema = z.object({
  mockup_set_ids: z.array(z.string().uuid()).optional(),
  // PROJ-39: optional format scope. When omitted → all three formats are
  // queued (default + backwards-compat for callers that don't know about
  // PROJ-39). When set → only that format flips to 'pending'.
  format: z.enum(['a4', 'a3', 'a2', 'all']).optional(),
})

/**
 * Setzt das Preset auf render_status='pending' und (optional) ändert
 * die Mockup-Sets, die der Worker beim Rendern verwenden soll.
 *
 * PROJ-39: pro Format kann gezielt re-rendert werden via `?format=a4|a3|a2`.
 * Ohne Format-Filter werden alle drei Hochkant-Formate auf pending gesetzt.
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

  const target = parsed.data.format ?? 'all'
  const formats: Array<'a4' | 'a3' | 'a2'> = target === 'all' ? ['a4', 'a3', 'a2'] : [target]

  const updates: Record<string, unknown> = {
    // Legacy single-format columns reset only when ALL formats are queued —
    // otherwise leaving them untouched keeps the legacy compat fallback
    // serving the previous render until the targeted format finishes.
    ...(target === 'all' && {
      render_status: 'pending',
      render_error: null,
      render_started_at: null,
      render_completed_at: null,
      render_worker_id: null,
    }),
  }
  for (const f of formats) {
    updates[`render_status_${f}`] = 'pending'
    updates[`render_error_${f}`] = null
    updates[`render_started_at_${f}`] = null
    updates[`render_completed_at_${f}`] = null
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
    .select('id, name, render_status, render_status_a4, render_status_a3, render_status_a2, mockup_set_ids')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json({ preset: data })
}
