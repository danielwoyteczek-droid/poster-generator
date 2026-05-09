import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase-admin'

const PostSchema = z.object({
  // Entweder explizite IDs ODER Filter
  ids: z.array(z.string().uuid()).optional(),
  // PROJ-39: 'backfill' = alle Presets mit fehlenden A3/A2-Renders
  // (status_a3 oder status_a2 != 'done'). Andere Filter wirken pro Format.
  filter: z.enum(['stale', 'failed', 'all_done', 'backfill']).optional(),
  // PROJ-39: Format-Scope — 'all' (default) markiert alle drei Formate als
  // pending; einzelne Formate markieren nur dieses Format.
  format: z.enum(['a4', 'a3', 'a2', 'all']).optional(),
}).refine((d) => d.ids !== undefined || d.filter !== undefined, {
  message: 'ids oder filter muss gesetzt sein',
})

/**
 * Bulk-Trigger: setzt mehrere Presets gleichzeitig auf render_status='pending'.
 * Bestehende `rendering`-Rows werden NICHT angefasst (kein Doppel-Claim).
 *
 * PROJ-39: pro Format selektierbar. `filter='backfill'` findet alle Presets,
 * deren A3 oder A2 noch nicht 'done' ist — der primäre Use-Case nach dem
 * PROJ-39-Deploy, um die historischen A4-only-Presets nachzurendern.
 */
export async function POST(req: NextRequest) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: 'Forbidden' }, { status: auth.status })

  const body = await req.json().catch(() => null)
  const parsed = PostSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid body' }, { status: 400 })

  const admin = createAdminClient()
  const target = parsed.data.format ?? 'all'
  const formats: Array<'a4' | 'a3' | 'a2'> = target === 'all' ? ['a4', 'a3', 'a2'] : [target]

  // Build the update payload for the requested format scope. Legacy single-
  // format columns are reset only when `format='all'` so per-format re-renders
  // don't lose the "old preview as fallback" benefit during transition.
  const updates: Record<string, unknown> = {
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

  // Build query — explicit IDs take precedence over filters.
  let query = admin.from('presets').update(updates)

  if (parsed.data.ids) {
    query = query.in('id', parsed.data.ids)
    // Don't trample an actively-rendering format. Filter on the legacy
    // render_status only; per-format conflicts are rare and the worker's
    // claim-CAS handles them anyway.
    query = query.neq('render_status', 'rendering')
  } else if (parsed.data.filter === 'backfill') {
    // PROJ-39: any preset where A3 or A2 hasn't reached 'done' yet — exact
    // mirror of what the customer will perceive as "missing format pill".
    query = query.or('render_status_a3.neq.done,render_status_a2.neq.done')
  } else if (parsed.data.filter === 'stale') {
    // For format-specific stale: filter on the chosen format's column.
    if (target === 'all') query = query.eq('render_status', 'stale')
    else query = query.eq(`render_status_${target}`, 'stale')
  } else if (parsed.data.filter === 'failed') {
    if (target === 'all') query = query.eq('render_status', 'failed')
    else query = query.eq(`render_status_${target}`, 'failed')
  } else if (parsed.data.filter === 'all_done') {
    if (target === 'all') query = query.eq('render_status', 'done')
    else query = query.eq(`render_status_${target}`, 'done')
  }

  const { data, error } = await query.select('id').limit(500)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ count: data?.length ?? 0, ids: data?.map((r) => r.id) ?? [] })
}
