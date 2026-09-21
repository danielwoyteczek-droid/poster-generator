/**
 * PROJ-31: Eine SKU-Zuordnung ändern oder löschen.
 *
 * PATCH löst danach die wartenden Bestellungen dieser SKU neu auf — sonst
 * bliebe eine gerade nachgetragene Zuordnung folgenlos, und der Betreiber
 * müsste raten, warum die Bestellungen weiter auf 'preset_fehlt' stehen.
 * Gedruckte und stornierte Positionen bleiben dabei unangetastet.
 */

import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase-admin'
import { PersonalizationSchemaSchema } from '@/lib/etsy/personalization-parser'
import { resolveBySku } from '@/lib/amazon/resolve'

const PatchSchema = z.object({
  // null setzt die Zuordnung bewusst zurück.
  preset_id: z.string().uuid().nullable().optional(),
  asin: z.string().max(32).nullable().optional(),
  variant_label: z.string().max(200).nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
  // null = Standard-Schema verwenden.
  personalization_schema: z.union([PersonalizationSchemaSchema, z.null()]).optional(),
  /** Nach dem Speichern die wartenden Bestellungen neu auswerten. */
  reresolve: z.boolean().default(true),
})

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: 'Forbidden' }, { status: auth.status })

  const { id } = await params

  let raw: unknown
  try {
    raw = await request.json()
  } catch {
    return NextResponse.json({ error: 'Rumpf ist kein gültiges JSON' }, { status: 400 })
  }
  const parsed = PatchSchema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ') },
      { status: 400 },
    )
  }

  const { reresolve, ...fields } = parsed.data
  if (Object.keys(fields).length === 0) {
    return NextResponse.json({ error: 'Nichts zu ändern' }, { status: 400 })
  }

  const supabase = createAdminClient()

  // Preset prüfen, bevor wir es festschreiben: eine ins Leere zeigende
  // Zuordnung fiele sonst erst beim Rendern auf.
  if (fields.preset_id) {
    const { data: preset } = await supabase
      .from('presets')
      .select('id, poster_type')
      .eq('id', fields.preset_id)
      .maybeSingle()
    if (!preset) {
      return NextResponse.json({ error: 'Preset nicht gefunden' }, { status: 400 })
    }
  }

  const { data, error } = await supabase
    .from('amazon_sku_mappings')
    .update(fields)
    .eq('id', id)
    .select('id, sku, preset_id')
    .maybeSingle()

  if (error) {
    return NextResponse.json({ error: `Speichern fehlgeschlagen: ${error.message}` }, { status: 500 })
  }
  if (!data) return NextResponse.json({ error: 'Zuordnung nicht gefunden' }, { status: 404 })

  let resolved = null
  if (reresolve) {
    resolved = await resolveBySku(supabase, data.sku as string)
  }

  return NextResponse.json({ ...data, resolved })
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: 'Forbidden' }, { status: auth.status })

  const { id } = await params
  const supabase = createAdminClient()

  // Nur löschen, wenn zu dieser SKU keine Bestellungen liegen — sonst
  // verlöre die Queue ihren Bezug und die Zeile käme beim nächsten Eingang
  // ohnehin leer zurück.
  const { data: mapping } = await supabase
    .from('amazon_sku_mappings')
    .select('sku')
    .eq('id', id)
    .maybeSingle()
  if (!mapping) return NextResponse.json({ error: 'Zuordnung nicht gefunden' }, { status: 404 })

  const { count } = await supabase
    .from('amazon_custom_orders')
    .select('id', { count: 'exact', head: true })
    .eq('sku', mapping.sku as string)

  if ((count ?? 0) > 0) {
    return NextResponse.json(
      { error: `Zu dieser SKU liegen ${count} Bestellungen. Zuordnung stattdessen zurücksetzen.` },
      { status: 409 },
    )
  }

  const { error } = await supabase.from('amazon_sku_mappings').delete().eq('id', id)
  if (error) {
    return NextResponse.json({ error: `Löschen fehlgeschlagen: ${error.message}` }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
