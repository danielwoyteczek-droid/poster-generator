import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase-admin'
import { createScenarioSchema } from '@/lib/business-case/schema'
import { DEFAULT_SCENARIO_DATA } from '@/lib/business-case/defaults'

export async function GET() {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: 'Forbidden' }, { status: auth.status })

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('business_scenarios')
    .select('id, name, description, data, created_at, updated_at, created_by')
    .order('updated_at', { ascending: false })
    .limit(100)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ scenarios: data ?? [] })
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: 'Forbidden' }, { status: auth.status })

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = createScenarioSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', details: z.treeifyError(parsed.error) }, { status: 400 })
  }

  const admin = createAdminClient()
  let data = DEFAULT_SCENARIO_DATA
  let description: string | null = null

  if (parsed.data.cloneFromId) {
    const { data: source, error: sourceErr } = await admin
      .from('business_scenarios')
      .select('name, data')
      .eq('id', parsed.data.cloneFromId)
      .single()
    if (sourceErr || !source) {
      return NextResponse.json({ error: 'Source scenario not found' }, { status: 404 })
    }
    data = source.data
    description = `Kopie von ${source.name}`
  }

  const { data: created, error } = await admin
    .from('business_scenarios')
    .insert({
      name: parsed.data.name,
      description,
      data,
      created_by: auth.user.id,
    })
    .select('id, name, description, data, created_at, updated_at, created_by')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ scenario: created }, { status: 201 })
}
