import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase-admin'

/**
 * PROJ-42: Admin Cities CRUD — list + create.
 *
 * - GET   /api/admin/cities         — full list with all fields
 * - POST  /api/admin/cities         — create new city (slug_base + name +
 *                                      country_code + lat/lng required;
 *                                      region/population/aliases optional)
 *
 * Uniqueness: (country_code, slug_base) is the natural key. DB enforces
 * via unique index; the endpoint surfaces 409 on collision.
 */

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/
const COUNTRY = /^[A-Z]{2}$/

const CreateSchema = z.object({
  slug_base: z.string().trim().min(2).max(80).regex(SLUG, 'slug_base must be lowercase ascii + dashes'),
  name: z.string().trim().min(1).max(120),
  country_code: z.string().regex(COUNTRY, 'country_code must be ISO-3166-1 alpha-2 (uppercase)'),
  region: z.string().trim().min(1).max(120).optional().nullable(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  population: z.number().int().min(0).optional().nullable(),
  aliases: z.array(z.string().trim().min(1).max(120)).max(10).optional(),
})

export async function GET(req: NextRequest) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: 'Forbidden' }, { status: auth.status })

  const country = req.nextUrl.searchParams.get('country')
  const admin = createAdminClient()
  let query = admin
    .from('cities')
    .select('*')
    .order('country_code', { ascending: true })
    .order('population', { ascending: false, nullsFirst: false })
    .order('name', { ascending: true })
    .limit(1000)

  if (country && COUNTRY.test(country)) {
    query = query.eq('country_code', country)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ cities: data ?? [] })
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: 'Forbidden' }, { status: auth.status })

  const body = await req.json().catch(() => null)
  const parsed = CreateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid body', details: parsed.error.flatten() },
      { status: 400 },
    )
  }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('cities')
    .insert({
      slug_base: parsed.data.slug_base,
      name: parsed.data.name,
      country_code: parsed.data.country_code,
      region: parsed.data.region ?? null,
      latitude: parsed.data.latitude,
      longitude: parsed.data.longitude,
      population: parsed.data.population ?? null,
      aliases: parsed.data.aliases ?? [],
    })
    .select()
    .single()

  if (error) {
    const isUnique = error.code === '23505'
    const message = isUnique
      ? `Eine Stadt mit slug_base "${parsed.data.slug_base}" existiert bereits in ${parsed.data.country_code}`
      : error.message
    return NextResponse.json({ error: message }, { status: isUnique ? 409 : 500 })
  }

  return NextResponse.json({ city: data }, { status: 201 })
}
