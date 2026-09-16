/**
 * PROJ-31: Detail einer Bestellposition — und die Aktionen daran.
 *
 * GET   liefert die erkannten Felder, die Gestaltung je Textblock und eine
 *       signierte URL zu Amazons Vorschaubild. Das Bild ist die Kontrolle:
 *       daneben legen, was petite-moment rendert, und vergleichen.
 * PATCH kann neu auswerten, einen Feldwert korrigieren oder die Korrektur
 *       zurücknehmen, die erzeugte Druckdatei festhalten oder als gedruckt
 *       abhaken.
 */

import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase-admin'
import { STORAGE_BUCKET } from '@/lib/amazon/ingest'
import { resolveAndSave } from '@/lib/amazon/resolve'
import { schemaOrDefault } from '@/lib/amazon/sku-schema'

/** Wie lange eine signierte Asset-URL gilt. Kurz, weil die Bilder
 *  Käufereingaben zeigen und die Ansicht ohnehin nur kurz offen ist. */
const SIGNED_URL_TTL_SECONDS = 60 * 30

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: 'Forbidden' }, { status: auth.status })

  const { id } = await params
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('amazon_custom_orders')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error) {
    return NextResponse.json({ error: `Lesen fehlgeschlagen: ${error.message}` }, { status: 500 })
  }
  if (!data) return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 })

  // Der Bucket ist privat — ohne Signatur ist das Bild nicht abrufbar.
  const sign = async (path: unknown): Promise<string | null> => {
    if (typeof path !== 'string' || !path) return null
    const { data: signed } = await supabase.storage
      .from(STORAGE_BUCKET)
      .createSignedUrl(path, SIGNED_URL_TTL_SECONDS)
    return signed?.signedUrl ?? null
  }

  const preset = data.preset_id
    ? (await supabase.from('presets').select('id, name, poster_type').eq('id', data.preset_id).maybeSingle()).data
    : null

  // Die Felder des Schemas, damit die Queue auch ein fehlendes Pflichtfeld
  // zum Nachtragen anbieten kann — nicht nur die erkannten.
  const { data: skuMapping } = await supabase
    .from('amazon_sku_mappings')
    .select('personalization_schema')
    .eq('sku', data.sku as string)
    .maybeSingle<{ personalization_schema: unknown }>()
  const schema_fields = schemaOrDefault(skuMapping?.personalization_schema).map((f) => ({
    key: f.key,
    label: f.label,
    required: f.required,
  }))

  return NextResponse.json({
    ...data,
    preset,
    schema_fields,
    preview_url: await sign(data.preview_path),
    svg_url: await sign(data.svg_path),
  })
}

const PatchSchema = z.object({
  action: z.enum([
    'reresolve', 'mark_printed', 'unmark_printed',
    'correct_field', 'reset_field', 'print_file_created',
  ]),
  /** Nur bei correct_field und reset_field. */
  key: z.string().min(1).max(64).optional(),
  value: z.string().max(2000).optional(),
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

  const supabase = createAdminClient()
  const { data: row } = await supabase
    .from('amazon_custom_orders')
    .select('id, sku, order_state, printed_at, customization_item, ingest_warnings, field_corrections, queue_status')
    .eq('id', id)
    .maybeSingle()
  if (!row) return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 })

  switch (parsed.data.action) {
    case 'reresolve': {
      const r = await resolveAndSave(supabase, row as never)
      if (!r.ok) return NextResponse.json({ error: r.error }, { status: 500 })
      return NextResponse.json({ ok: true, status: r.status })
    }

    case 'mark_printed': {
      // Eine stornierte Bestellung wird nicht gedruckt. Wer sie trotzdem
      // abhaken will, hat sich in der Zeile vertan.
      if (row.order_state === 'cancelled') {
        return NextResponse.json(
          { error: 'Die Bestellung ist bei Amazon storniert und wird nicht gedruckt.' },
          { status: 409 },
        )
      }
      const { error } = await supabase
        .from('amazon_custom_orders')
        .update({ printed_at: new Date().toISOString(), queue_status: 'gedruckt' })
        .eq('id', id)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ ok: true })
    }

    case 'unmark_printed': {
      // Verdruckt oder zu früh abgehakt. Zurück auf 'bereit', nicht auf den
      // Ursprungszustand — die Auswertung von damals gilt weiter. Ausnahme:
      // wurde die Bestellung inzwischen storniert, gehört sie nicht zurück in
      // die offene Liste.
      const { error } = await supabase
        .from('amazon_custom_orders')
        .update({
          printed_at: null,
          queue_status: row.order_state === 'cancelled' ? 'storniert' : 'bereit',
        })
        .eq('id', id)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ ok: true })
    }

    case 'correct_field':
    case 'reset_field': {
      const { key, value } = parsed.data
      if (!key) return NextResponse.json({ error: 'key nötig' }, { status: 400 })
      if (parsed.data.action === 'correct_field' && value === undefined) {
        return NextResponse.json({ error: 'value nötig' }, { status: 400 })
      }
      if (row.printed_at) {
        return NextResponse.json({ error: 'Bereits gedruckt — keine Änderung mehr.' }, { status: 409 })
      }

      // Getrennt vom Ergebnis ablegen: die Auswertung ersetzt parse_result
      // bei jedem Lauf, die Korrekturen legt sie darüber.
      const corrections = { ...((row.field_corrections ?? {}) as Record<string, string>) }
      if (parsed.data.action === 'reset_field') delete corrections[key]
      else corrections[key] = value!

      const { error } = await supabase
        .from('amazon_custom_orders')
        .update({ field_corrections: corrections })
        .eq('id', id)
        .is('printed_at', null)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })

      // Gleich neu auswerten: ein korrigierter Ort muss neu gesucht werden,
      // ein nachgetragenes Pflichtfeld holt die Position aus der Prüfung.
      const r = await resolveAndSave(supabase, row as never)
      if (!r.ok) return NextResponse.json({ error: r.error }, { status: 500 })
      return NextResponse.json({ ok: true, status: r.status })
    }

    case 'print_file_created': {
      // Die Datei selbst liegt beim Betreiber, nicht bei uns — festgehalten
      // wird nur, dass und wann sie entstand.
      const { error } = await supabase
        .from('amazon_custom_orders')
        .update({ rendered_at: new Date().toISOString() })
        .eq('id', id)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ ok: true })
    }
  }
}
