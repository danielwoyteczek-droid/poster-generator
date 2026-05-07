import { NextResponse } from 'next/server'
import { getOccasions } from '@/lib/occasions-server'

/**
 * PROJ-29 Iteration 2: public occasion list endpoint.
 *
 * Read-only, returns the current `occasion`-Docs from Sanity (with the
 * hardcoded fallback if Sanity is empty/down). Used by client-side admin
 * UI and customer-facing components that need the full list.
 *
 * Cache-Control: 5 minutes — short enough that operator edits in Studio
 * surface quickly, long enough to avoid hammering Sanity from every
 * sidebar render.
 */
export async function GET() {
  const occasions = await getOccasions()
  return NextResponse.json(
    { occasions },
    {
      headers: {
        'Cache-Control': 's-maxage=300, stale-while-revalidate=600',
      },
    },
  )
}
