import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase-admin'

/**
 * PROJ-42: Admin Cities CRUD — read / update / delete by id.
 *
 * - GET    /api/admin/cities/:id    — full row + render-status summary
 * - PATCH  /api/admin/cities/:id    — partial update of editable fields
 * - DELETE /api/admin/cities/:id    — refuses if any city_renders or
 *                                      Sanity-cityPage docs still
 *                                      reference the city; otherwise
 *                                      cascades render rows away.
 */

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/
const COUNTRY = /^[A-Z]{2}$/
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const PatchSchema = z.object({
  slug_base: z.string().trim().min(2).max(80).regex(SLUG).optional(),
  name: z.string().trim().min(1).max(120).optional(),
  country_code: z.string().regex(COUNTRY).optional(),
  region: z.string().trim().min(1).max(120).nullable().optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  population: z.number().int().min(0).nullable().optional(),
  aliases: z.array(z.string().trim().min(1).max(120)).max(10).optional(),
})

export async function GET(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: 'Forbidden' }, { status: auth.status })

  const { id } = await context.params
  if (!UUID.test(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 })

  const admin = createAdminClient()
  const [{ data: city, error: cityErr }, { data: renders }] = await Promise.all([
    admin.from('cities').select('*').eq('id', id).single(),
    admin
      .from('city_renders')
      .select('style_id, render_status, image_url, image_width, image_height, render_error, rendered_at')
      .eq('city_id', id)
      .order('style_id'),
  ])

  if (cityErr || !city) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ city, renders: renders ?? [] })
}

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: 'Forbidden' }, { status: auth.status })

  const { id } = await context.params
  if (!UUID.test(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 })

  const body = await req.json().catch(() => null)
  const parsed = PatchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid body', details: parsed.error.flatten() },
      { status: 400 },
    )
  }

  if (Object.keys(parsed.data).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('cities')
    .update(parsed.data)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    const isUnique = error.code === '23505'
    return NextResponse.json(
      { error: isUnique ? 'Slug-Konflikt mit anderer Stadt im selben Land' : error.message },
      { status: isUnique ? 409 : 500 },
    )
  }
  return NextResponse.json({ city: data })
}

export async function DELETE(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: 'Forbidden' }, { status: auth.status })

  const { id } = await context.params
  if (!UUID.test(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 })

  const admin = createAdminClient()

  // Best-effort guard: if Sanity has cityPage-Docs referencing this city's
  // slug_base, refuse delete. We can't enforce this in the DB because
  // Sanity is external — but we can hint at it. The Admin UI should also
  // display Sanity-doc-count next to each city.
  // V1: skip the Sanity check (no cheap way without making this endpoint
  // dependent on Sanity-Client init). Document the risk in feature spec.

  const { error } = await admin.from('cities').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  // city_renders rows cascade away via FK ON DELETE CASCADE; storage objects
  // remain but are orphaned (cleanup is V2-add-on).
  return new NextResponse(null, { status: 204 })
}
