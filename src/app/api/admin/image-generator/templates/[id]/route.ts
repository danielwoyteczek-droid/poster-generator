import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase-admin'
import { UUID_RE, invalidId } from '@/lib/image-generator/route-utils'
import { EntriesSchema, TEMPLATE_COLUMNS, TemplateNameSchema, isDuplicateName } from '@/lib/image-generator/templates'

const PatchSchema = z
  .object({ name: TemplateNameSchema.optional(), entries: EntriesSchema.optional() })
  .refine((v) => v.name !== undefined || v.entries !== undefined, 'Nichts zu ändern')

/** PROJ-56: Vorlage umbenennen oder mit neuer Auswahl überschreiben. */
export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: 'Forbidden' }, { status: auth.status })

  const { id } = await context.params
  if (!UUID_RE.test(id)) return invalidId()

  const parsed = PatchSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Ungültige Eingabe' }, { status: 400 })
  }

  const { data, error } = await createAdminClient()
    .from('image_generator_templates')
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select(TEMPLATE_COLUMNS)
    .maybeSingle()
  if (isDuplicateName(error)) {
    return NextResponse.json({ error: 'Eine Vorlage mit diesem Namen gibt es schon' }, { status: 409 })
  }
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Vorlage nicht gefunden' }, { status: 404 })
  return NextResponse.json({ template: data })
}

/** PROJ-56: Vorlage löschen. Erzeugte Bilder bleiben erhalten. */
export async function DELETE(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: 'Forbidden' }, { status: auth.status })

  const { id } = await context.params
  if (!UUID_RE.test(id)) return invalidId()

  const { error } = await createAdminClient().from('image_generator_templates').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
