import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase-admin'
import { TargetLocalesSchema } from '@/lib/preset-locales'
import { OccasionsSchema } from '@/lib/occasions'

const BULK_LIMIT = 200

/**
 * Bulk-Tool fuer Tag-Felder auf Presets. Unterstuetzt zwei Felder:
 *  - target_locales (PROJ-24)
 *  - occasions (PROJ-11 Beispielgalerie)
 *
 * Genau eines der beiden Wert-Arrays (`locales` ODER `occasions`) muss im
 * Body uebergeben werden. Backward-compatible mit dem bestehenden Admin-UI,
 * das nur `locales` kennt.
 */
const BulkBodySchema = z
  .object({
    ids: z.array(z.string().uuid()).min(1).max(BULK_LIMIT),
    action: z.enum(['set', 'add', 'remove']),
    locales: TargetLocalesSchema.min(1).optional(),
    occasions: OccasionsSchema.min(1).optional(),
  })
  .refine(
    (data) => Boolean(data.locales) !== Boolean(data.occasions),
    { message: 'Genau eines von "locales" oder "occasions" muss gesetzt sein' },
  )

type BulkField = 'target_locales' | 'occasions'

export async function POST(req: NextRequest) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: 'Forbidden' }, { status: auth.status })

  const body = await req.json().catch(() => null)
  const parsed = BulkBodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid body', details: parsed.error.flatten() }, { status: 400 })
  }

  const { ids, action } = parsed.data
  const field: BulkField = parsed.data.locales ? 'target_locales' : 'occasions'
  const values = (parsed.data.locales ?? parsed.data.occasions) as string[]

  const admin = createAdminClient()

  if (action === 'set') {
    const { data, error } = await admin
      .from('presets')
      .update({ [field]: values, updated_at: new Date().toISOString() })
      .in('id', ids)
      .select(`id, ${field}`)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ updated: data?.length ?? 0, presets: data ?? [] })
  }

  // add / remove require per-row merge — fetch current values, compute new array, write back
  const { data: currentRows, error: fetchError } = await admin
    .from('presets')
    .select(`id, ${field}`)
    .in('id', ids)

  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 })
  if (!currentRows || currentRows.length === 0) {
    return NextResponse.json({ updated: 0, presets: [] })
  }

  const updatedAt = new Date().toISOString()
  const updates = currentRows.map((row) => {
    const existing = ((row as Record<string, unknown>)[field] ?? []) as string[]
    const next =
      action === 'add'
        ? Array.from(new Set([...existing, ...values]))
        : existing.filter((v) => !values.includes(v))
    return { id: row.id as string, next, updated_at: updatedAt }
  })

  const results = await Promise.all(
    updates.map((u) =>
      admin
        .from('presets')
        .update({ [field]: u.next, updated_at: u.updated_at })
        .eq('id', u.id)
        .select(`id, ${field}`)
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
