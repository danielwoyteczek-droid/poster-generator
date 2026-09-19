import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase-admin'

// Storage-Bucket der Mockup-Composites (siehe scripts/render-worker.ts).
const STORAGE_BUCKET = 'preset-renders'

/** Prefix für Image-Generator-Bilder (PROJ-56), damit die IDs beider Quellen
 *  in einer Liste eindeutig bleiben — auch beim Löschen. */
const GEN_PREFIX = 'gen:'

interface LibraryRow {
  id: string
  preset_id: string
  mockup_set_id: string
  variant: 'desktop' | 'mobile' | null
  image_url: string
  rendered_at: string | null
  source: 'worker' | 'generator'
  /** Nur Generator: Farbe bzw. Overlay, statt der Worker-Variante. */
  label?: string
}

/**
 * Admin-Render-Library: alle fertigen Bilder mit Metadata zum Filtern.
 * Quellen: Marketing-Renders des Workers (`preset_renders`) und die Galerie
 * des Image Generators (`image_generator_images`, PROJ-56).
 *
 * Query-Params (alle optional):
 *   mockup_set_id, variant (desktop|mobile), occasion, locale, q (text-search),
 *   source (worker|generator)
 */
export async function GET(req: NextRequest) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: 'Forbidden' }, { status: auth.status })

  const url = req.nextUrl
  const mockupSetId = url.searchParams.get('mockup_set_id')
  const variant = url.searchParams.get('variant')
  const occasion = url.searchParams.get('occasion')
  const locale = url.searchParams.get('locale')
  const q = url.searchParams.get('q')?.trim().toLowerCase()
  const source = url.searchParams.get('source')

  const admin = createAdminClient()

  const rows: LibraryRow[] = []

  // 1a. Worker-Renders (filterable per mockup_set + variant on this table)
  if (source !== 'generator') {
    let renderQuery = admin
      .from('preset_renders')
      .select('id, preset_id, mockup_set_id, variant, image_url, image_width, image_height, rendered_at')
      .order('rendered_at', { ascending: false })
      .limit(500)

    if (mockupSetId) renderQuery = renderQuery.eq('mockup_set_id', mockupSetId)
    if (variant === 'desktop' || variant === 'mobile') renderQuery = renderQuery.eq('variant', variant)

    const { data, error } = await renderQuery
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    for (const r of data ?? []) rows.push({ ...r, source: 'worker' })
  }

  // 1b. Image-Generator-Galerie. Kennt keine Desktop/Mobile-Variante, fällt
  // deshalb aus der Ergebnismenge, sobald danach gefiltert wird.
  if (source !== 'worker' && variant !== 'desktop' && variant !== 'mobile') {
    let genQuery = admin
      .from('image_generator_images')
      .select('id, preset_id, mockup_set_id, palette_id, overlay_id, image_url, rendered_at')
      .eq('status', 'done')
      .not('image_url', 'is', null)
      .order('rendered_at', { ascending: false })
      .limit(500)

    if (mockupSetId) genQuery = genQuery.eq('mockup_set_id', mockupSetId)

    const { data, error } = await genQuery
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const genRows = data ?? []
    const labels = await fetchGeneratorLabels(admin, genRows)
    for (const g of genRows) {
      rows.push({
        id: `${GEN_PREFIX}${g.id}`,
        preset_id: g.preset_id,
        mockup_set_id: g.mockup_set_id,
        variant: null,
        image_url: g.image_url as string,
        rendered_at: g.rendered_at,
        source: 'generator',
        label: labels.get(g.id) ?? 'Grundfarbe',
      })
    }
  }

  if (rows.length === 0) {
    return NextResponse.json({ renders: [], filters_meta: await fetchMeta(admin) })
  }

  const renderRows = rows
    .sort((a, b) => (b.rendered_at ?? '').localeCompare(a.rendered_at ?? ''))
    .slice(0, 500)

  // 2. Fetch matching presets + mockup-sets
  const presetIds = [...new Set(renderRows.map((r) => r.preset_id))]
  const mockupSetIds = [...new Set(renderRows.map((r) => r.mockup_set_id))]

  let presetQuery = admin
    .from('presets')
    .select('id, name, status, target_locales, occasions, poster_type')
    .in('id', presetIds)

  if (occasion) presetQuery = presetQuery.contains('occasions', [occasion])
  if (locale) presetQuery = presetQuery.contains('target_locales', [locale])

  const { data: presets, error: presetErr } = await presetQuery
  if (presetErr) return NextResponse.json({ error: presetErr.message }, { status: 500 })

  const presetMap = Object.fromEntries((presets ?? []).map((p) => [p.id, p]))

  const { data: mockupSets } = await admin
    .from('mockup_sets')
    .select('id, name, slug')
    .in('id', mockupSetIds)
  const mockupMap = Object.fromEntries((mockupSets ?? []).map((m) => [m.id, m]))

  // 3. Filter + enrich
  const enriched = renderRows
    .map((r) => {
      const preset = presetMap[r.preset_id]
      if (!preset) return null
      if (q && !preset.name.toLowerCase().includes(q)) return null
      return {
        ...r,
        preset: { id: preset.id, name: preset.name, status: preset.status, target_locales: preset.target_locales, occasions: preset.occasions, poster_type: preset.poster_type },
        mockup_set: mockupMap[r.mockup_set_id] ?? null,
      }
    })
    .filter((r): r is NonNullable<typeof r> => r !== null)

  return NextResponse.json({ renders: enriched, filters_meta: await fetchMeta(admin) })
}

const DeleteSchema = z.object({
  // Worker-Renders: nackte UUID. Image-Generator-Bilder: `gen:<uuid>`.
  ids: z.array(z.string().regex(/^(gen:)?[0-9a-f-]{36}$/i)).min(1).max(200),
})

/** Anzeige-Label je Generator-Bild: Palettenname bzw. „Grundfarbe", plus Overlay. */
async function fetchGeneratorLabels(
  admin: ReturnType<typeof createAdminClient>,
  rows: { id: string; palette_id: string | null; overlay_id: string | null }[],
): Promise<Map<string, string>> {
  const paletteIds = [...new Set(rows.map((r) => r.palette_id).filter((v): v is string => !!v))]
  const overlayIds = [...new Set(rows.map((r) => r.overlay_id).filter((v): v is string => !!v))]

  const [palettes, overlays] = await Promise.all([
    paletteIds.length
      ? admin.from('map_palettes').select('id, name').in('id', paletteIds)
      : Promise.resolve({ data: [] as { id: string; name: string }[] }),
    overlayIds.length
      ? admin.from('image_overlays').select('id, name').in('id', overlayIds)
      : Promise.resolve({ data: [] as { id: string; name: string }[] }),
  ])

  const paletteMap = new Map((palettes.data ?? []).map((p) => [p.id, p.name]))
  const overlayMap = new Map((overlays.data ?? []).map((o) => [o.id, o.name]))

  return new Map(
    rows.map((r) => {
      const colour = r.palette_id ? paletteMap.get(r.palette_id) ?? r.palette_id : 'Grundfarbe'
      const overlay = r.overlay_id ? overlayMap.get(r.overlay_id) : null
      return [r.id, overlay ? `${colour} + ${overlay}` : colour]
    }),
  )
}

/**
 * Löscht ausgewählte preset_renders dauerhaft: erst die Storage-Dateien
 * (best-effort), dann die DB-Zeilen. Presets selbst bleiben unverändert —
 * gelöschte Renders erscheinen einfach nicht mehr in der Library und können
 * jederzeit per Re-Render neu erzeugt werden.
 */
export async function DELETE(req: NextRequest) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: 'Forbidden' }, { status: auth.status })

  const body = await req.json().catch(() => null)
  const parsed = DeleteSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  const admin = createAdminClient()

  const genIds = parsed.data.ids
    .filter((id) => id.startsWith(GEN_PREFIX))
    .map((id) => id.slice(GEN_PREFIX.length))
  const workerIds = parsed.data.ids.filter((id) => !id.startsWith(GEN_PREFIX))

  let deletedGenerator = 0
  if (genIds.length > 0) {
    // Image-Generator-Bilder: Storage-Pfad steht in der Zeile (PROJ-56).
    const { data: genRows, error: genFetchErr } = await admin
      .from('image_generator_images')
      .select('id, storage_path')
      .in('id', genIds)
    if (genFetchErr) return NextResponse.json({ error: genFetchErr.message }, { status: 500 })

    const genPaths = (genRows ?? []).map((r) => r.storage_path).filter((p): p is string => !!p)
    if (genPaths.length > 0) {
      await admin.storage.from(STORAGE_BUCKET).remove(genPaths).then(() => {}, () => {})
    }
    if ((genRows ?? []).length > 0) {
      const { error: genDelErr } = await admin
        .from('image_generator_images')
        .delete()
        .in('id', (genRows ?? []).map((r) => r.id))
      if (genDelErr) return NextResponse.json({ error: genDelErr.message }, { status: 500 })
      deletedGenerator = (genRows ?? []).length
    }
  }

  if (workerIds.length === 0) return NextResponse.json({ deleted: deletedGenerator })

  // Zeilen vorab laden, um die Storage-Pfade zu rekonstruieren.
  const { data: rows, error: fetchErr } = await admin
    .from('preset_renders')
    .select('id, preset_id, mockup_set_id, variant')
    .in('id', workerIds)

  if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 })
  if (!rows || rows.length === 0) return NextResponse.json({ deleted: deletedGenerator })

  // Storage-Cleanup: Pfad-Schema aus render-worker.ts
  // (`${preset_id}/${mockup_set_id}/${variant}.png`). Best-effort — die
  // DB-Zeile ist die Source of Truth, eine verwaiste Datei wäre nur Ballast.
  const paths = rows.map((r) => `${r.preset_id}/${r.mockup_set_id}/${r.variant}.png`)
  await admin.storage.from(STORAGE_BUCKET).remove(paths).then(
    () => {},
    () => {},
  )

  const { error: delErr } = await admin
    .from('preset_renders')
    .delete()
    .in('id', rows.map((r) => r.id))

  if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 })
  return NextResponse.json({ deleted: rows.length + deletedGenerator })
}

async function fetchMeta(admin: ReturnType<typeof createAdminClient>) {
  const { data: mockupSets } = await admin
    .from('mockup_sets')
    .select('id, name, slug')
    .eq('is_active', true)
    .order('name')

  return { mockup_sets: mockupSets ?? [] }
}
