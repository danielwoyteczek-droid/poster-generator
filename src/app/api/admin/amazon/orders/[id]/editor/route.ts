/**
 * PROJ-31: Bestellung im echten Editor öffnen und zurückschreiben.
 *
 * GET liefert alles, was der Editor braucht, um die Bestellung anzuzeigen:
 * das Preset als Grundlage und die Angaben des Käufers als Überlagerung.
 * Zusammengebaut wird auf der Client-Seite, weil dort ohnehin `applyPreset`
 * lebt — hier werden nur die Daten aufbereitet und die Schriftwahl des
 * Käufers gegen die Schriftbibliothek geprüft.
 *
 * PUT nimmt den angepassten Zustand entgegen. Er hat danach Vorrang vor der
 * automatischen Auswertung: eine Handkorrektur soll eine Neuauswertung
 * überleben.
 */

import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase-admin'

export interface EditorOverlay {
  /** Ortsname für das Suchfeld und die Textzeile. */
  locationName: string | null
  lat: number | null
  lng: number | null
  printFormat: 'a4' | 'a3' | 'a2' | null
  /** Texte in der Reihenfolge, in der sie auf Textblöcke gelegt werden. */
  texts: Array<{
    key: string
    value: string
    /** Nur gesetzt, wenn die Schrift in der Bibliothek vorhanden ist. */
    fontFamily: string | null
    color: string | null
  }>
  /** Was der Käufer bei Amazon gewählt hat, aber hier nicht vorliegt. */
  notes: string[]
}

export interface EditorPayload {
  order: {
    id: string
    amazon_order_id: string
    order_item_id: string
    sku: string
    queue_status: string
    printed_at: string | null
    preview_url: string | null
  }
  preset: { id: string; name: string; poster_type: string; config_json: unknown } | null
  overlay: EditorOverlay
  /** Zuvor von Hand gespeicherter Zustand. Hat Vorrang vor der Überlagerung. */
  editor_state: unknown | null
  editor_state_saved_at: string | null
}

/** Reihenfolge, in der Käufertexte auf die Textblöcke des Presets gelegt werden. */
const TEXT_ORDER = ['title', 'names', 'subline'] as const

function toFormat(value: string | undefined): 'a4' | 'a3' | 'a2' | null {
  if (!value) return null
  const v = value.toLowerCase().replace(/[\s.-]/g, '')
  if (v.includes('a4')) return 'a4'
  if (v.includes('a3')) return 'a3'
  if (v.includes('a2')) return 'a2'
  return null
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: 'Forbidden' }, { status: auth.status })

  const { id } = await params
  const supabase = createAdminClient()

  const { data: order, error } = await supabase
    .from('amazon_custom_orders')
    .select(
      'id, amazon_order_id, order_item_id, sku, queue_status, printed_at, preset_id, parse_result, design_hints, map_lat, map_lng, map_place, preview_path, editor_state, editor_state_saved_at',
    )
    .eq('id', id)
    .maybeSingle()

  if (error) {
    return NextResponse.json({ error: `Lesen fehlgeschlagen: ${error.message}` }, { status: 500 })
  }
  if (!order) return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 })

  const preset = order.preset_id
    ? (
        await supabase
          .from('presets')
          .select('id, name, poster_type, config_json')
          .eq('id', order.preset_id)
          .maybeSingle()
      ).data
    : null

  const parsed = ((order.parse_result as { parsed?: Record<string, string> })?.parsed ?? {}) as Record<string, string>
  const hints = (order.design_hints ?? []) as Array<{
    fontFamily: string | null
    colorHex: string | null
    textKeys: string[]
  }>

  // Schriftwahl des Käufers gegen die Bibliothek prüfen. Eine Schrift, die
  // der Renderer nicht laden kann, darf nicht gesetzt werden — sie fiele
  // still auf etwas anderes zurück und das Poster sähe anders aus als
  // Amazons Vorschau, ohne dass es jemandem auffällt.
  const wanted = [...new Set(hints.map((h) => h.fontFamily).filter(Boolean))] as string[]
  const known = new Set<string>()
  if (wanted.length > 0) {
    const { data: fonts } = await supabase.from('fonts').select('family_name').limit(200)
    for (const f of fonts ?? []) {
      const name = f.family_name as string
      if (wanted.some((w) => w.toLowerCase() === name.toLowerCase())) known.add(name.toLowerCase())
    }
  }

  const notes: string[] = []
  const texts: EditorOverlay['texts'] = []
  for (const key of TEXT_ORDER) {
    const value = parsed[key]
    if (!value) continue
    const hint = hints.find((h) => h.textKeys.includes(key))
    let fontFamily: string | null = null
    if (hint?.fontFamily) {
      if (known.has(hint.fontFamily.toLowerCase())) {
        fontFamily = hint.fontFamily
      } else {
        notes.push(
          `Schrift „${hint.fontFamily}" (${key}) ist nicht in der Bibliothek — Preset-Schrift bleibt stehen`,
        )
      }
    }
    texts.push({ key, value, fontFamily, color: hint?.colorHex ?? null })
  }

  if (parsed.frame) notes.push(`Rahmen laut Bestellung: ${parsed.frame}`)
  if (!parsed.format) notes.push('Keine Größenangabe in der Bestellung')

  let previewUrl: string | null = null
  if (typeof order.preview_path === 'string' && order.preview_path) {
    const { data: signed } = await supabase.storage
      .from('amazon-custom')
      .createSignedUrl(order.preview_path, 60 * 60)
    previewUrl = signed?.signedUrl ?? null
  }

  const payload: EditorPayload = {
    order: {
      id: order.id as string,
      amazon_order_id: order.amazon_order_id as string,
      order_item_id: order.order_item_id as string,
      sku: order.sku as string,
      queue_status: order.queue_status as string,
      printed_at: (order.printed_at as string) ?? null,
      preview_url: previewUrl,
    },
    preset: preset as EditorPayload['preset'],
    overlay: {
      locationName: (order.map_place as string) ?? parsed.location ?? null,
      lat: (order.map_lat as number) ?? null,
      lng: (order.map_lng as number) ?? null,
      printFormat: toFormat(parsed.format),
      texts,
      notes,
    },
    editor_state: order.editor_state ?? null,
    editor_state_saved_at: (order.editor_state_saved_at as string) ?? null,
  }
  return NextResponse.json(payload)
}

const PutSchema = z.object({
  // Der Editor-Zustand ist ein grosses, offenes Objekt (gleiche Form wie
  // projects.config_json). Feld fuer Feld zu validieren hiesse, den Editor
  // hier ein zweites Mal zu beschreiben und bei jeder Erweiterung
  // nachzuziehen. Geprueft wird, dass es ein Objekt mit den Feldern ist,
  // ohne die ein Poster nicht darstellbar waere.
  editor_state: z
    .object({ textBlocks: z.array(z.unknown()), viewState: z.unknown() })
    .passthrough(),
})

export async function PUT(
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
  const parsed = PutSchema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ') },
      { status: 400 },
    )
  }

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('amazon_custom_orders')
    .update({
      editor_state: parsed.data.editor_state,
      editor_state_saved_at: new Date().toISOString(),
      // Von Hand angepasst heisst geprüft: die Position ist druckfertig,
      // auch wenn die automatische Auswertung vorher gemeckert hat.
      queue_status: 'bereit',
    })
    .eq('id', id)
    // Eine gedruckte Position wird nicht mehr veraendert.
    .is('printed_at', null)
    .select('id, queue_status, editor_state_saved_at')
    .maybeSingle()

  if (error) {
    return NextResponse.json({ error: `Speichern fehlgeschlagen: ${error.message}` }, { status: 500 })
  }
  if (!data) {
    return NextResponse.json(
      { error: 'Nicht gefunden oder bereits gedruckt — Änderungen wurden nicht übernommen.' },
      { status: 409 },
    )
  }
  return NextResponse.json(data)
}
