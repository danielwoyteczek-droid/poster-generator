import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('presets')
    .select('id, name, description, poster_type, preview_image_url, config_json, display_order, target_locales, occasions')
    .eq('id', id)
    .eq('status', 'published')
    .single()

  if (error || !data) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ preset: data })
}
