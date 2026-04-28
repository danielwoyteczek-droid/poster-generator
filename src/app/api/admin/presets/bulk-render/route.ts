import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase-admin'

const PostSchema = z.object({
  // Entweder explizite IDs ODER Filter (z. B. "alle stale", "alle failed")
  ids: z.array(z.string().uuid()).optional(),
  filter: z.enum(['stale', 'failed', 'all_done']).optional(),
}).refine((d) => d.ids !== undefined || d.filter !== undefined, {
  message: 'ids oder filter muss gesetzt sein',
})

/**
 * Bulk-Trigger: setzt mehrere Presets gleichzeitig auf render_status='pending'.
 * Bestehende `rendering`-Rows werden NICHT angefasst (kein Doppel-Claim).
 */
export async function POST(req: NextRequest) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: 'Forbidden' }, { status: auth.status })

  const body = await req.json().catch(() => null)
  const parsed = PostSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid body' }, { status: 400 })

  const admin = createAdminClient()
  const updates = {
    render_status: 'pending' as const,
    render_error: null,
    render_started_at: null,
    render_completed_at: null,
    render_worker_id: null,
  }

  let query = admin.from('presets').update(updates)

  if (parsed.data.ids) {
    query = query.in('id', parsed.data.ids).neq('render_status', 'rendering')
  } else if (parsed.data.filter === 'stale') {
    query = query.eq('render_status', 'stale')
  } else if (parsed.data.filter === 'failed') {
    query = query.eq('render_status', 'failed')
  } else if (parsed.data.filter === 'all_done') {
    query = query.eq('render_status', 'done')
  }

  const { data, error } = await query.select('id')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ count: data?.length ?? 0, ids: data?.map((r) => r.id) ?? [] })
}
