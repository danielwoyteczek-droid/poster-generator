import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'
import { listFontsWithStyles } from '@/lib/fonts-server'

/**
 * PROJ-47: Public font catalogue.
 *
 * Returns the list of published fonts (with their styles + resolved public
 * Storage URLs) for the editor picker. Cached for 5 min s-maxage so the DB
 * isn't hit on every editor mount.
 */
export async function GET() {
  const admin = createAdminClient()
  try {
    const fonts = await listFontsWithStyles(admin, { status: 'published' })
    return NextResponse.json(
      { fonts },
      { headers: { 'Cache-Control': 'public, max-age=60, s-maxage=300, stale-while-revalidate=600' } },
    )
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 },
    )
  }
}
