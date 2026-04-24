import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase-admin'

const HEX = /^#([A-Fa-f0-9]{3}|[A-Fa-f0-9]{6})$/
const SLUG = /^[a-z][a-z0-9-]*$/

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

const CreateSchema = z.object({
  id: z.string().trim().min(2).max(60).regex(SLUG, 'id must be a lowercase slug'),
  name: z.string().trim().min(1).max(100),
  description: z.string().max(500).optional(),
  colors: ColorsSchema,
  display_order: z.number().int().optional(),
})

export async function GET(req: NextRequest) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: 'Forbidden' }, { status: auth.status })

  const status = req.nextUrl.searchParams.get('status')
  const admin = createAdminClient()
  let query = admin
    .from('map_palettes')
    .select('*')
    .order('display_order', { ascending: true })
    .order('created_at', { ascending: false })

  if (status && status !== 'all') query = query.eq('status', status)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ palettes: data ?? [] })
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
  const { data, error } = await admin
    .from('map_palettes')
    .insert({ ...parsed.data, status: 'draft' })
    .select()
    .single()

  if (error) {
    const message = error.code === '23505' ? 'Eine Palette mit dieser ID existiert bereits' : error.message
    return NextResponse.json({ error: message }, { status: error.code === '23505' ? 409 : 500 })
  }
  return NextResponse.json({ palette: data })
}
