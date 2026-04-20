import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase-admin'

export async function GET(req: NextRequest) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: 'Forbidden' }, { status: auth.status })

  const status = req.nextUrl.searchParams.get('fulfillment_status')

  const admin = createAdminClient()
  let query = admin
    .from('orders')
    .select('id, status, fulfillment_status, tracking_number, total_cents, currency, items, email, shipping_address, created_at, paid_at, shipped_at')
    .eq('status', 'paid')
    .order('created_at', { ascending: false })

  if (status && status !== 'all') {
    query = query.eq('fulfillment_status', status)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ orders: data ?? [] })
}
