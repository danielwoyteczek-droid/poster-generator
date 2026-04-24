import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase-admin'

const HEX = /^#([A-Fa-f0-9]{3}|[A-Fa-f0-9]{6})$/

const ColorsSchema = z.object({
  background: z.string().regex(HEX),
  land: z.string().regex(HEX),
  water: z.string().regex(HEX),
  road: z.string().regex(HEX),
  building: z.string().regex(HEX),
  border: z.string().regex(HEX),
  label: z.string().regex(HEX),
  labelHalo: z.string().regex(HEX),
})

const PatchSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  description: z.string().max(500).nullable().optional(),
  colors: ColorsSchema.optional(),
  status: z.enum(['draft', 'published']).optional(),
  display_order: z.number().int().optional(),
})

export async function GET(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: 'Forbidden' }, { status: auth.status })

  const { id } = await context.params
  const admin = createAdminClient()
  const { data, error } = await admin.from('map_palettes').select('*').eq('id', id).single()
  if (error || !data) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ palette: data })
}

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: 'Forbidden' }, { status: auth.status })

  const { id } = await context.params
  const body = await req.json().catch(() => null)
  const parsed = PatchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid body', details: parsed.error.flatten() }, { status: 400 })
  }

  const updates: Record<string, unknown> = { ...parsed.data, updated_at: new Date().toISOString() }
  if (parsed.data.status === 'published') updates.published_at = new Date().toISOString()

  const admin = createAdminClient()
  const { data, error } = await admin.from('map_palettes').update(updates).eq('id', id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ palette: data })
}

/**
 * Delete a palette. Refuses if any preset currently references it via
 * config_json.paletteId — the caller must switch affected presets first.
 */
export async function DELETE(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: 'Forbidden' }, { status: auth.status })

  const { id } = await context.params
  const admin = createAdminClient()

  const { data: presetsUsing, error: refError } = await admin
    .from('presets')
    .select('id, name')
    .eq('config_json->>paletteId', id)

  if (refError) return NextResponse.json({ error: refError.message }, { status: 500 })
  if (presetsUsing && presetsUsing.length > 0) {
    return NextResponse.json(
      {
        error: 'Palette ist in Presets referenziert',
        referenced_by: presetsUsing,
      },
      { status: 409 },
    )
  }

  const { error } = await admin.from('map_palettes').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return new NextResponse(null, { status: 204 })
}
