import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase-admin'
import { TargetLocalesSchema } from '@/lib/preset-locales'

const BULK_LIMIT = 200

const BulkBodySchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(BULK_LIMIT),
  action: z.enum(['set', 'add', 'remove']),
  locales: TargetLocalesSchema.min(1),
})

export async function POST(req: NextRequest) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: 'Forbidden' }, { status: auth.status })

  const body = await req.json().catch(() => null)
  const parsed = BulkBodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid body', details: parsed.error.flatten() }, { status: 400 })
  }

  const { ids, action, locales } = parsed.data
  const admin = createAdminClient()

  if (action === 'set') {
    const { data, error } = await admin
      .from('presets')
      .update({ target_locales: locales, updated_at: new Date().toISOString() })
      .in('id', ids)
      .select('id, target_locales')

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ updated: data?.length ?? 0, presets: data ?? [] })
  }

  // add / remove require per-row merge — fetch current values, compute new array, write back
  const { data: currentRows, error: fetchError } = await admin
    .from('presets')
    .select('id, target_locales')
    .in('id', ids)

  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 })
  if (!currentRows || currentRows.length === 0) {
    return NextResponse.json({ updated: 0, presets: [] })
  }

  const updatedAt = new Date().toISOString()
  const updates = currentRows.map((row) => {
    const existing = (row.target_locales ?? []) as string[]
    const next =
      action === 'add'
        ? Array.from(new Set([...existing, ...locales]))
        : existing.filter((loc) => !locales.includes(loc as never))
    return { id: row.id, target_locales: next, updated_at: updatedAt }
  })

  const results = await Promise.all(
    updates.map((u) =>
      admin
        .from('presets')
        .update({ target_locales: u.target_locales, updated_at: u.updated_at })
        .eq('id', u.id)
        .select('id, target_locales')
        .single(),
    ),
  )

  const failed = results.find((r) => r.error)
  if (failed?.error) {
    return NextResponse.json({ error: failed.error.message }, { status: 500 })
  }

  const presets = results.map((r) => r.data).filter((d): d is NonNullable<typeof d> => d != null)
  return NextResponse.json({ updated: presets.length, presets })
}
