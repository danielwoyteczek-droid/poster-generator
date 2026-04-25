import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase-admin'
import { LocaleSchema } from '@/lib/preset-locales'

const CopyBodySchema = z.object({
  target_locale: LocaleSchema,
  name_suffix: z.string().trim().max(20).optional(),
})

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: 'Forbidden' }, { status: auth.status })

  const { id } = await context.params
  const body = await req.json().catch(() => null)
  const parsed = CopyBodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid body', details: parsed.error.flatten() }, { status: 400 })
  }

  const admin = createAdminClient()

  const { data: source, error: fetchError } = await admin
    .from('presets')
    .select('name, description, poster_type, config_json, preview_image_url, display_order')
    .eq('id', id)
    .single()

  if (fetchError || !source) {
    return NextResponse.json({ error: 'Source preset not found' }, { status: 404 })
  }

  const suffix = parsed.data.name_suffix?.trim() || `(${parsed.data.target_locale.toUpperCase()})`
  const newName = `${source.name} ${suffix}`.slice(0, 200)

  const { data, error } = await admin
    .from('presets')
    .insert({
      name: newName,
      description: source.description,
      poster_type: source.poster_type,
      config_json: source.config_json,
      preview_image_url: source.preview_image_url,
      display_order: source.display_order,
      target_locales: [parsed.data.target_locale],
      status: 'draft',
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ preset: data }, { status: 201 })
}
