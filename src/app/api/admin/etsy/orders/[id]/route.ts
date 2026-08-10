/**
 * PROJ-49: Etsy-Order detail endpoint — returns the full raw payload + parsed
 * items so the drilldown view can render everything (raw JSON debug + per-item
 * parser result with edit form).
 */

import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase-admin'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin()
  if (!auth.ok) {
    return NextResponse.json({ error: 'Forbidden' }, { status: auth.status })
  }

  const { id } = await params
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('etsy_orders')
    .select('*')
    .eq('id', id)
    .maybeSingle()
  if (error) {
    return NextResponse.json(
      { error: `Read failed: ${error.message}` },
      { status: 500 },
    )
  }
  if (!data) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  return NextResponse.json(data)
}
