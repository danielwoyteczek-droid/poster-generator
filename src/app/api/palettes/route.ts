import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'

/**
 * Public list of published palettes. Used by the editor picker on every
 * render. The CDN edge cache is kept short (30s) so a palette published in
 * the admin shows up in the editor almost immediately — the useMapPalettes
 * hook already dedupes fetches per session, so a long edge cache only delayed
 * new palettes without saving meaningful DB load.
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
    { headers: { 'Cache-Control': 'public, max-age=0, s-maxage=30, stale-while-revalidate=120' } },
  )
}
