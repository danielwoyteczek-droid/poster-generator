/**
 * PROJ-49: Admin "Sync now" button — manually triggers the same logic the
 * 15-min cron runs. Useful for testing OAuth setup and for catching up
 * after Etsy API outages without waiting for the next cron tick.
 */

import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { runOrderPull } from '@/lib/etsy/order-pull'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST() {
  const auth = await requireAdmin()
  if (!auth.ok) {
    return NextResponse.json({ error: 'Forbidden' }, { status: auth.status })
  }
  const result = await runOrderPull()
  return NextResponse.json(
    { ok: result.ok, summary: result.summary, run_id: result.run_id },
    { status: result.http_status },
  )
}
