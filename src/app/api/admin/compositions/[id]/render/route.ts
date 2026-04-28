import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase-admin'

/**
 * Setzt die Composition auf render_status='pending'.
 * Worker pickt sie auf und rendert N Posters + DM-Composite.
 */
export async function POST(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: 'Forbidden' }, { status: auth.status })

  const { id } = await context.params
  const admin = createAdminClient()

  const { data, error } = await admin
    .from('mockup_compositions')
    .update({
      render_status: 'pending',
      render_error: null,
      render_started_at: null,
      render_completed_at: null,
      render_worker_id: null,
    })
    .eq('id', id)
    .select('id, name, render_status')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ composition: data })
}
