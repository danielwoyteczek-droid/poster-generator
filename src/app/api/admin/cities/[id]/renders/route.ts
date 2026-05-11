import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase-admin'
import { FEATURED_STYLES, FEATURED_STYLE_IDS, isValidFeaturedStyleId } from '@/lib/featured-styles'

/**
 * PROJ-42: Admin Single-City Render-Trigger.
 *
 * POST /api/admin/cities/:id/renders
 *
 * Body (all optional):
 *   { style_ids?: string[]  // subset to re-render; default: alle 3 Featured-Styles
 *     force?: boolean       // default true → bestehende done-Renders auf "stale"
 *                           //                setzen, sodass der Worker sie neu rendert
 *   }
 *
 * Wirkung:
 *   - Pro angefragtem (city_id, style_id) ein city_renders-Eintrag mit
 *     Status `pending` (UPSERT auf der Unique-Constraint).
 *   - Falls Eintrag bereits existiert + force=true: Status auf 'pending'
 *     setzen, image_url + render_error zuruecksetzen.
 *   - Worker muss separat getriggert werden (POST /api/admin/render-worker/trigger)
 *     oder laeuft bereits.
 *
 * GET /api/admin/cities/:id/renders
 *   Listet alle render-status-Eintraege fuer die Stadt.
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const PostBodySchema = z.object({
  style_ids: z.array(z.string()).optional(),
  force: z.boolean().optional(),
})

export async function GET(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: 'Forbidden' }, { status: auth.status })

  const { id } = await context.params
  if (!UUID.test(id)) return NextResponse.json({ error: 'Invalid city id' }, { status: 400 })

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('city_renders')
    .select('id, city_id, style_id, image_url, image_width, image_height, render_status, render_error, render_started_at, render_completed_at, rendered_at, created_at, updated_at')
    .eq('city_id', id)
    .order('style_id')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({
    renders: data ?? [],
    expected_styles: FEATURED_STYLE_IDS,
  })
}

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: 'Forbidden' }, { status: auth.status })

  const { id } = await context.params
  if (!UUID.test(id)) return NextResponse.json({ error: 'Invalid city id' }, { status: 400 })

  const body = await req.json().catch(() => ({}))
  const parsed = PostBodySchema.safeParse(body ?? {})
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid body', details: parsed.error.flatten() },
      { status: 400 },
    )
  }

  const requestedStyles = parsed.data.style_ids ?? [...FEATURED_STYLE_IDS]
  const invalidStyles = requestedStyles.filter((s) => !isValidFeaturedStyleId(s))
  if (invalidStyles.length > 0) {
    return NextResponse.json(
      {
        error: `Unknown style_id(s): ${invalidStyles.join(', ')}`,
        valid_style_ids: FEATURED_STYLE_IDS,
      },
      { status: 400 },
    )
  }
  const force = parsed.data.force ?? true

  const admin = createAdminClient()

  // Verify the city exists.
  const { data: city, error: cityErr } = await admin
    .from('cities')
    .select('id, slug_base, name')
    .eq('id', id)
    .single()
  if (cityErr || !city) {
    return NextResponse.json({ error: 'City not found' }, { status: 404 })
  }

  // UPSERT one row per (city_id, style_id). force=true clears done/failed
  // rows back to pending. force=false leaves done/rendering rows alone but
  // still creates pending rows for styles that don't have an entry yet.
  const now = new Date().toISOString()
  const rowsToUpsert = requestedStyles.map((style_id) => ({
    city_id: id,
    style_id,
    render_status: 'pending' as const,
    image_url: null,
    image_width: null,
    image_height: null,
    render_error: null,
    render_started_at: null,
    render_completed_at: null,
    rendered_at: null,
    updated_at: now,
  }))

  if (force) {
    const { error: upErr } = await admin
      .from('city_renders')
      .upsert(rowsToUpsert, { onConflict: 'city_id,style_id' })
    if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 })
  } else {
    // INSERT only if no row exists yet. Use ignoreDuplicates by supplying a
    // selectively-restricted upsert with ignoreDuplicates option.
    const { error: insErr } = await admin
      .from('city_renders')
      .upsert(rowsToUpsert, { onConflict: 'city_id,style_id', ignoreDuplicates: true })
    if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 })
  }

  // Return current state so the admin UI can refresh without re-fetching.
  const { data: renders } = await admin
    .from('city_renders')
    .select('style_id, render_status, image_url, render_error')
    .eq('city_id', id)
    .order('style_id')

  return NextResponse.json({
    ok: true,
    queued: requestedStyles,
    force,
    renders: renders ?? [],
    note:
      'Worker startet die Render-Jobs. Falls kein Worker laeuft: ' +
      'POST /api/admin/render-worker/trigger oder npm run render-worker.',
  })
}
