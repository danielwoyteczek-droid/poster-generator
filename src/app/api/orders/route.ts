import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Use admin client to bypass any RLS hiccups + fetch exports in one go
  const admin = createAdminClient()

  const { data: orders, error } = await admin
    .from('orders')
    .select('id, status, fulfillment_status, total_cents, items, access_token, created_at, paid_at')
    .eq('user_id', user.id)
    .eq('status', 'paid')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const orderIds = (orders ?? []).map((o) => o.id)
  const exportsByOrder: Record<string, Array<{ id: string; item_index: number; file_type: string }>> = {}

  if (orderIds.length > 0) {
    const { data: exports_ } = await admin
      .from('order_exports')
      .select('id, order_id, item_index, file_type')
      .in('order_id', orderIds)
    for (const ex of exports_ ?? []) {
      const list = exportsByOrder[ex.order_id] ?? []
      list.push({ id: ex.id, item_index: ex.item_index, file_type: ex.file_type })
      exportsByOrder[ex.order_id] = list
    }
  }

  const enriched = (orders ?? []).map((o) => ({
    ...o,
    exports: exportsByOrder[o.id] ?? [],
  }))

  return NextResponse.json({ orders: enriched })
}
