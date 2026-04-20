import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'

export async function GET(req: NextRequest) {
  const posterType = req.nextUrl.searchParams.get('poster_type')

  const admin = createAdminClient()
  let query = admin
    .from('presets')
    .select('id, name, description, poster_type, preview_image_url, config_json, display_order')
    .eq('status', 'published')
    .order('display_order', { ascending: true })
    .limit(100)

  if (posterType) query = query.eq('poster_type', posterType)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ presets: data ?? [] })
}
