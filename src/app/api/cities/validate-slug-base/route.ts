import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase-server'

/**
 * PROJ-42: Sanity-FK-Validator-Endpoint.
 *
 * Sanity ist nicht Postgres-aware. Der cityPage-Schema-Validator ruft
 * diesen Endpoint zur Save-Zeit auf, um zu pruefen, ob die im
 * cityId-Feld eingetragene slug_base-Referenz tatsaechlich in der
 * cities-Tabelle existiert.
 *
 * Antwort:
 *   { valid: true,  name: "Hamburg", country_code: "DE", region: "..." }
 *   { valid: false, error: "Stadt nicht gefunden" }
 *
 * No-Cache: bei Save-Zeit-Validierung muss frisch gelesen werden.
 */

const QuerySchema = z.object({
  slug_base: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'Invalid slug_base format'),
})

export async function GET(request: NextRequest) {
  const parsed = QuerySchema.safeParse({
    slug_base: request.nextUrl.searchParams.get('slug_base') ?? '',
  })

  if (!parsed.success) {
    return NextResponse.json(
      { valid: false, error: 'Invalid slug_base format' },
      { status: 400 },
    )
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('cities')
    .select('slug_base, name, country_code, region')
    .eq('slug_base', parsed.data.slug_base)
    .limit(1)

  if (error) {
    return NextResponse.json(
      { valid: false, error: `DB error: ${error.message}` },
      { status: 500 },
    )
  }

  if (!data || data.length === 0) {
    return NextResponse.json(
      { valid: false, error: 'Stadt nicht in cities-Tabelle gefunden' },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  }

  // Note: slug_base is unique per (country_code), so multiple rows are
  // theoretically possible. For the Sanity validator we just confirm at
  // least one exists; the picker UI shows country to disambiguate.
  const city = data[0]
  return NextResponse.json(
    {
      valid: true,
      name: city.name,
      country_code: city.country_code,
      region: city.region,
    },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}
