import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'

/**
 * Public list of published palettes. Used by the editor picker on every
 * render. Cached for 5 minutes so the DB isn't hit on each mount.
 */
export async function GET() {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('map_palettes')
    .select('id, name, description, colors, display_order')
    .eq('status', 'published')
    .order('display_order', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(
    { palettes: data ?? [] },
    { headers: { 'Cache-Control': 'public, max-age=60, s-maxage=300, stale-while-revalidate=600' } },
  )
}
