import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase-admin'
import { FEATURED_STYLE_IDS } from '@/lib/featured-styles'

/**
 * PROJ-42: Admin Bulk Render-Trigger.
 *
 * POST /api/admin/cities/renders/bulk
 *
 * Body (all optional):
 *   { country?: string         // 2-Char ISO; nur Staedte aus diesem Land
 *     city_ids?: string[]      // explizite Stadt-Auswahl; ueberlagert country
 *     missing_only?: boolean   // default true → nur fuer Stadt × Style-
 *                              // Kombinationen, die noch keinen done-Render
 *                              // haben (re-rendert nichts, was bereits done ist)
 *   }
 *
 * Wirkung:
 *   Fuer jede betroffene Stadt × jeden Featured-Style: ein Eintrag
 *   in city_renders mit Status 'pending' (UPSERT). Worker muss separat
 *   gestartet werden.
 *
 * Antwort enthaelt die Anzahl der gequeueten Render-Jobs + die Liste
 * der betroffenen Staedte fuer UI-Feedback.
 */

const COUNTRY = /^[A-Z]{2}$/
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const BodySchema = z.object({
  country: z.string().regex(COUNTRY).optional(),
  city_ids: z.array(z.string().regex(UUID)).max(500).optional(),
  missing_only: z.boolean().optional(),
})

export async function POST(req: NextRequest) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: 'Forbidden' }, { status: auth.status })

  const body = await req.json().catch(() => ({}))
  const parsed = BodySchema.safeParse(body ?? {})
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid body', details: parsed.error.flatten() },
      { status: 400 },
    )
  }
  const missingOnly = parsed.data.missing_only ?? true

  const admin = createAdminClient()

  // 1. Resolve city set.
  let cityQuery = admin.from('cities').select('id, slug_base, name, country_code').limit(500)
  if (parsed.data.city_ids && parsed.data.city_ids.length > 0) {
    cityQuery = cityQuery.in('id', parsed.data.city_ids)
  } else if (parsed.data.country) {
    cityQuery = cityQuery.eq('country_code', parsed.data.country)
  }
  const { data: cities, error: cityErr } = await cityQuery
  if (cityErr) return NextResponse.json({ error: cityErr.message }, { status: 500 })
  if (!cities || cities.length === 0) {
    return NextResponse.json({ ok: true, queued: 0, cities: [] })
  }

  // 2. If missing_only, fetch existing done-renders to skip them.
  const cityIds = cities.map((c) => c.id)
  let alreadyDone = new Set<string>()
  if (missingOnly) {
    const { data: existing } = await admin
      .from('city_renders')
      .select('city_id, style_id, render_status')
      .in('city_id', cityIds)
      .eq('render_status', 'done')
    alreadyDone = new Set((existing ?? []).map((r) => `${r.city_id}:${r.style_id}`))
  }

  // 3. Build the upsert rows.
  const now = new Date().toISOString()
  const rows: Array<Record<string, unknown>> = []
  for (const city of cities) {
    for (const style_id of FEATURED_STYLE_IDS) {
      if (missingOnly && alreadyDone.has(`${city.id}:${style_id}`)) continue
      rows.push({
        city_id: city.id,
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
      })
    }
  }

  if (rows.length === 0) {
    return NextResponse.json({
      ok: true,
      queued: 0,
      cities: cities.map((c) => ({ id: c.id, name: c.name, country_code: c.country_code })),
      note: 'Alle Renders bereits done — nichts zu tun.',
    })
  }

  // 4. UPSERT in chunks of 100 (Supabase row-limit safety).
  const CHUNK = 100
  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK)
    const { error } = await admin
      .from('city_renders')
      .upsert(chunk, { onConflict: 'city_id,style_id' })
    if (error) {
      return NextResponse.json(
        { error: `Upsert failed at chunk ${i}: ${error.message}` },
        { status: 500 },
      )
    }
  }

  return NextResponse.json({
    ok: true,
    queued: rows.length,
    cities: cities.map((c) => ({ id: c.id, name: c.name, country_code: c.country_code })),
    missing_only: missingOnly,
    note:
      'Worker startet die Render-Jobs. Falls kein Worker laeuft: ' +
      'POST /api/admin/render-worker/trigger oder npm run render-worker.',
  })
}
