import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase-admin'
import { LocaleSchema, TargetLocalesSchema } from '@/lib/preset-locales'
import { OccasionSchema, OccasionsSchema } from '@/lib/occasions'

const CreatePresetSchema = z.object({
  name: z.string().trim().min(1).max(200),
  description: z.string().max(1000).optional(),
  poster_type: z.enum(['map', 'star-map', 'photo']),
  config_json: z.record(z.string(), z.unknown()),
  preview_image_url: z.string().url().optional(),
  display_order: z.number().int().optional(),
  target_locales: TargetLocalesSchema.optional(),
  occasions: OccasionsSchema.optional(),
  show_in_editor: z.boolean().optional(),
})

export async function GET(req: NextRequest) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: 'Forbidden' }, { status: auth.status })

  const status = req.nextUrl.searchParams.get('status')
  const posterType = req.nextUrl.searchParams.get('poster_type')
  const localeParam = req.nextUrl.searchParams.get('locale')
  const occasionParam = req.nextUrl.searchParams.get('occasion')

  const admin = createAdminClient()
  let query = admin
    .from('presets')
    .select('id, name, description, poster_type, preview_image_url, status, display_order, target_locales, occasions, show_in_editor, created_at, updated_at, published_at, render_status, render_error, render_completed_at, mockup_set_ids')
    .order('display_order', { ascending: true })
    .order('created_at', { ascending: false })
    .limit(200)

  if (status && status !== 'all') query = query.eq('status', status)
  if (posterType && posterType !== 'all') query = query.eq('poster_type', posterType)

  if (localeParam) {
    const parsed = LocaleSchema.safeParse(localeParam)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid locale' }, { status: 400 })
    }
    query = query.contains('target_locales', [parsed.data])
  }

  if (occasionParam) {
    const parsed = OccasionSchema.safeParse(occasionParam)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid occasion' }, { status: 400 })
    }
    query = query.contains('occasions', [parsed.data])
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ presets: data ?? [] })
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: 'Forbidden' }, { status: auth.status })

  const body = await req.json().catch(() => null)
  const parsed = CreatePresetSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid body', details: parsed.error.flatten() }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('presets')
    .insert({ ...parsed.data, status: 'draft' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ preset: data })
}
