/**
 * PROJ-49: Etsy order-pull cron endpoint.
 *
 * Triggered every 15min by `.github/workflows/etsy-order-sync.yml`.
 * Authentication: shared-secret in `Authorization: Bearer <ETSY_CRON_SECRET>`.
 *
 * The actual pull logic lives in `@/lib/etsy/order-pull` so the admin "Sync
 * now" button can re-use the same code with admin-auth instead of the
 * cron-secret.
 */

import { NextResponse } from 'next/server'
import { runOrderPull } from '@/lib/etsy/order-pull'

export const runtime = 'nodejs'
export const maxDuration = 60

function verifyCronAuth(request: Request): boolean {
  const expected = process.env.ETSY_CRON_SECRET?.trim()
  if (!expected) return false
  const got = request.headers.get('authorization')?.trim()
  return got === `Bearer ${expected}`
}

export async function POST(request: Request) {
  if (!verifyCronAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const result = await runOrderPull()
  return NextResponse.json(
    { ok: result.ok, summary: result.summary, run_id: result.run_id },
    { status: result.http_status },
  )
}
