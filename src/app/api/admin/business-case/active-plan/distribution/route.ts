import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase-admin'
import { updateDistributionSchema } from '@/lib/business-case/schema'

export async function PATCH(req: NextRequest) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: 'Forbidden' }, { status: auth.status })

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = updateDistributionSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', details: z.treeifyError(parsed.error) }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('business_plans')
    .update({ monthly_distribution: parsed.data.monthlyDistribution })
    .eq('status', 'active')
    .select('id, name, source_scenario_id, data, monthly_distribution, status, approved_at, valid_until, approved_by')
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'No active plan' }, { status: 404 })
  return NextResponse.json({ plan: data })
}
