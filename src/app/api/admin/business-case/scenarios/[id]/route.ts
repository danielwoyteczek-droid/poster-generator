import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase-admin'
import { updateScenarioSchema } from '@/lib/business-case/schema'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function GET(_req: NextRequest, ctx: RouteContext) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: 'Forbidden' }, { status: auth.status })

  const { id } = await ctx.params
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('business_scenarios')
    .select('id, name, description, data, created_at, updated_at, created_by')
    .eq('id', id)
    .single()

  if (error || !data) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ scenario: data })
}

export async function PATCH(req: NextRequest, ctx: RouteContext) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: 'Forbidden' }, { status: auth.status })

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = updateScenarioSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', details: z.treeifyError(parsed.error) }, { status: 400 })
  }

  const { id } = await ctx.params
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('business_scenarios')
    .update(parsed.data)
    .eq('id', id)
    .select('id, name, description, data, created_at, updated_at, created_by')
    .single()

  if (error || !data) return NextResponse.json({ error: error?.message ?? 'Not found' }, { status: 404 })
  return NextResponse.json({ scenario: data })
}

export async function DELETE(_req: NextRequest, ctx: RouteContext) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: 'Forbidden' }, { status: auth.status })

  const { id } = await ctx.params
  const admin = createAdminClient()
  const { error } = await admin.from('business_scenarios').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
