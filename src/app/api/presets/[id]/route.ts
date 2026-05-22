import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'
import { HEADLESS_TOKEN_HEADER, validateHeadlessToken } from '@/lib/headless-render'

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params

  // PROJ-30: the headless render worker fetches presets through this route
  // while rendering, and carries a valid x-render-token on every same-origin
  // request. When that token is present we also serve draft presets — a
  // not-yet-published preset (e.g. a fresh CSV import) would otherwise 404
  // here, and the headless editor would silently render the default design
  // instead. Regular customers (blog/homepage deep-links) have no token, so
  // for them the published-only filter stays in place.
  const isRenderWorker = validateHeadlessToken(req.headers.get(HEADLESS_TOKEN_HEADER))

  const admin = createAdminClient()
  let query = admin
    .from('presets')
    .select('id, name, description, poster_type, preview_image_url, config_json, display_order, target_locales, occasions')
    .eq('id', id)
  if (!isRenderWorker) query = query.eq('status', 'published')

  const { data, error } = await query.single()

  if (error || !data) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ preset: data })
}
