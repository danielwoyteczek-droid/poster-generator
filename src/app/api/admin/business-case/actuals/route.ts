import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase-admin'

export async function GET(req: NextRequest) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: 'Forbidden' }, { status: auth.status })

  const yearParam = req.nextUrl.searchParams.get('year')
  const year = yearParam ? parseInt(yearParam, 10) : new Date().getUTCFullYear()
  if (!Number.isInteger(year) || year < 2020 || year > 2100) {
    return NextResponse.json({ error: 'Invalid year' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('business_actuals')
    .select('year, month, tier_key, orders_count, revenue_cents, synced_at, source')
    .eq('year', year)
    .order('month', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const lastSyncedAt = data && data.length > 0
    ? data.reduce((max, row) => (row.synced_at > max ? row.synced_at : max), data[0].synced_at)
    : null

  return NextResponse.json({ year, actuals: data ?? [], lastSyncedAt })
}
