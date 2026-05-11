import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase-server'

/**
 * PROJ-42: Public read-only list of cities.
 *
 * Konsumiert von:
 *  - Sanity-Studio CityIdInput (Custom-Input-Component, Dropdown der
 *    Staedte beim Pflegen einer cityPage).
 *  - Frontend-Verwandte-Staedte-Sektion (Server-Component liest direkt
 *    via Supabase, dieser Endpoint ist primaer fuer Sanity Studio +
 *    Admin-UI).
 *
 * Cache-Control: 5 min (s-maxage). Aenderungen am Stadt-Inventar sind
 * selten (Admin-UI legt sie an). Der Studio-Picker laedt einmal pro
 * Sitzung.
 */

const QuerySchema = z.object({
  country: z.string().regex(/^[A-Z]{2}$/).optional(),
  limit: z.coerce.number().int().min(1).max(1000).optional(),
})

export async function GET(request: NextRequest) {
  const params = QuerySchema.safeParse({
    country: request.nextUrl.searchParams.get('country') ?? undefined,
    limit: request.nextUrl.searchParams.get('limit') ?? undefined,
  })

  if (!params.success) {
    return NextResponse.json(
      { error: 'Invalid query params', issues: params.error.format() },
      { status: 400 },
    )
  }

  const supabase = await createClient()
  let query = supabase
    .from('cities')
    .select('id, slug_base, name, country_code, region, latitude, longitude, population, aliases')
    .order('country_code', { ascending: true })
    .order('population', { ascending: false, nullsFirst: false })
    .order('name', { ascending: true })
    .limit(params.data.limit ?? 500)

  if (params.data.country) {
    query = query.eq('country_code', params.data.country)
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json(
      { error: 'Failed to load cities', detail: error.message },
      { status: 500 },
    )
  }

  return NextResponse.json(
    { cities: data ?? [] },
    {
      headers: {
        'Cache-Control': 's-maxage=300, stale-while-revalidate=600',
      },
    },
  )
}
