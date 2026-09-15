/**
 * PROJ-31: Detail einer Bestellposition — und die Aktionen daran.
 *
 * GET   liefert die erkannten Felder, die Gestaltung je Textblock und eine
 *       signierte URL zu Amazons Vorschaubild. Das Bild ist die Kontrolle:
 *       daneben legen, was petite-moment rendert, und vergleichen.
 * PATCH kann neu auswerten, einen Feldwert korrigieren oder als gedruckt
 *       abhaken.
 */

import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase-admin'
import { STORAGE_BUCKET } from '@/lib/amazon/ingest'
import { resolveAndSave } from '@/lib/amazon/resolve'

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

  return NextResponse.json({
    ...data,
    preset,
    preview_url: await sign(data.preview_path),
    svg_url: await sign(data.svg_path),
  })
}

const PatchSchema = z.object({
  action: z.enum(['reresolve', 'mark_printed', 'unmark_printed', 'correct_field']),
  /** Nur bei correct_field. */
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
    .select('id, sku, order_state, printed_at, customization_item, parse_result, queue_status')
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
      const { error } = await supabase
        .from('amazon_custom_orders')
        .update({ printed_at: new Date().toISOString(), queue_status: 'gedruckt' })
        .eq('id', id)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ ok: true })
    }

    case 'unmark_printed': {
      // Verdruckt oder zu früh abgehakt. Zurück auf 'bereit', nicht auf den
      // Ursprungszustand — die Auswertung von damals gilt weiter.
      const { error } = await supabase
        .from('amazon_custom_orders')
        .update({ printed_at: null, queue_status: 'bereit' })
        .eq('id', id)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ ok: true })
    }

    case 'correct_field': {
      const { key, value } = parsed.data
      if (!key || value === undefined) {
        return NextResponse.json({ error: 'key und value nötig' }, { status: 400 })
      }
      const current = (row.parse_result ?? {}) as {
        parsed?: Record<string, string>
        matchedAs?: Record<string, unknown>
      }
      const next = {
        ...current,
        parsed: { ...(current.parsed ?? {}), [key]: value },
        matchedAs: {
          ...(current.matchedAs ?? {}),
          // Kenntlich machen, dass hier ein Mensch eingegriffen hat — sonst
          // sieht ein korrigierter Wert aus wie ein erkannter.
          [key]: { label: 'von Hand korrigiert', mode: 'manual' },
        },
      }
      const { error } = await supabase
        .from('amazon_custom_orders')
        .update({ parse_result: next })
        .eq('id', id)
        .is('printed_at', null)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ ok: true, parsed: next.parsed })
    }
  }
}
