import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase-admin'
import { EntriesSchema, TEMPLATE_COLUMNS, TemplateNameSchema, isDuplicateName } from '@/lib/image-generator/templates'

const CreateSchema = z.object({ name: TemplateNameSchema, entries: EntriesSchema })

/** PROJ-56: Vorlagen auflisten. */
export async function GET() {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: 'Forbidden' }, { status: auth.status })

  const { data, error } = await createAdminClient()
    .from('image_generator_templates')
    .select(TEMPLATE_COLUMNS)
    .order('name')
    .limit(200)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ templates: data ?? [] })
}

/** PROJ-56: Vorlage speichern. */
export async function POST(req: NextRequest) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: 'Forbidden' }, { status: auth.status })

  const parsed = CreateSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Ungültige Eingabe' }, { status: 400 })
  }

  const { data, error } = await createAdminClient()
    .from('image_generator_templates')
    .insert(parsed.data)
    .select(TEMPLATE_COLUMNS)
    .single()
  if (isDuplicateName(error)) {
    return NextResponse.json({ error: 'Eine Vorlage mit diesem Namen gibt es schon' }, { status: 409 })
  }
  if (error || !data) return NextResponse.json({ error: error?.message ?? 'Speichern fehlgeschlagen' }, { status: 500 })
  return NextResponse.json({ template: data }, { status: 201 })
}
