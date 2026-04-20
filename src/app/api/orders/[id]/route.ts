import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params
  const token = req.nextUrl.searchParams.get('token')
  if (!token) return NextResponse.json({ error: 'Token fehlt' }, { status: 400 })

  const admin = createAdminClient()
  const { data: order, error } = await admin
    .from('orders')
    .select('id, status, total_cents, currency, items, email, shipping_address, created_at, paid_at')
    .eq('id', id)
    .eq('access_token', token)
    .single()

  if (error || !order) {
    return NextResponse.json({ error: 'Bestellung nicht gefunden' }, { status: 404 })
  }

  const { data: exports_ } = await admin
    .from('order_exports')
    .select('id, item_index, file_type, storage_path, file_size_bytes, created_at')
    .eq('order_id', id)

  return NextResponse.json({ order, exports: exports_ ?? [] })
}
