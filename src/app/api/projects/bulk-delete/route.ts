import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase-server'

const BodySchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(100),
})

/**
 * Deletes multiple of the caller's own projects in one round-trip. RLS on
 * `projects` already restricts to `user_id = auth.uid()`, but we add the
 * explicit `eq('user_id', user.id)` as a second-line defence and to make the
 * filter visible at the application layer too.
 *
 * Locked projects (purchased) are intentionally NOT excluded server-side —
 * the UI prevents selecting them, but if a future flow legitimately needs to
 * bulk-delete locked rows, this endpoint can do it without policy changes.
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => null)
  const parsed = BodySchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid body' }, { status: 400 })

  const { data, error } = await supabase
    .from('projects')
    .delete()
    .in('id', parsed.data.ids)
    .eq('user_id', user.id)
    .select('id')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ deleted: data?.length ?? 0, ids: data?.map((r) => r.id) ?? [] })
}
