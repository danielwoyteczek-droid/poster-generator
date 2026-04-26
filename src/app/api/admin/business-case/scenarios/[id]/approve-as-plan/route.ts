import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase-admin'
import { DEFAULT_MONTHLY_DISTRIBUTION } from '@/lib/business-case/defaults'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function POST(_req: NextRequest, ctx: RouteContext) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: 'Forbidden' }, { status: auth.status })

  const { id } = await ctx.params
  const admin = createAdminClient()

  const { data: source, error: sourceErr } = await admin
    .from('business_scenarios')
    .select('id, name, data')
    .eq('id', id)
    .single()

  if (sourceErr || !source) {
    return NextResponse.json({ error: 'Scenario not found' }, { status: 404 })
  }

  const now = new Date().toISOString()

  // Archive existing active plan, if any
  const { error: archiveErr } = await admin
    .from('business_plans')
    .update({ status: 'archived', valid_until: now })
    .eq('status', 'active')
  if (archiveErr) {
    return NextResponse.json({ error: `Archive failed: ${archiveErr.message}` }, { status: 500 })
  }

  const approvedAtDate = new Date(now)
  const planName = `${source.name} (verabschiedet ${approvedAtDate.toLocaleDateString('de-DE')})`

  const { data: plan, error: planErr } = await admin
    .from('business_plans')
    .insert({
      name: planName,
      source_scenario_id: source.id,
      data: source.data,
      monthly_distribution: DEFAULT_MONTHLY_DISTRIBUTION,
      status: 'active',
      approved_at: now,
      approved_by: auth.user.id,
    })
    .select('id, name, source_scenario_id, data, monthly_distribution, status, approved_at, valid_until, approved_by')
    .single()

  if (planErr || !plan) {
    return NextResponse.json({ error: planErr?.message ?? 'Plan create failed' }, { status: 500 })
  }

  return NextResponse.json({ plan }, { status: 201 })
}
