import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase-admin'

// Storage-Bucket der Mockup-Composites (siehe scripts/render-worker.ts).
const STORAGE_BUCKET = 'preset-renders'

/**
 * Admin-Render-Library: alle fertigen preset_renders mit Metadata zum Filtern.
 *
 * Query-Params (alle optional):
 *   mockup_set_id, variant (desktop|mobile), occasion, locale, q (text-search)
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

  const admin = createAdminClient()

  // 1. Fetch all renders (filterable per mockup_set + variant on this table)
  let renderQuery = admin
    .from('preset_renders')
    .select('id, preset_id, mockup_set_id, variant, image_url, image_width, image_height, rendered_at')
    .order('rendered_at', { ascending: false })
    .limit(500)

  if (mockupSetId) renderQuery = renderQuery.eq('mockup_set_id', mockupSetId)
  if (variant === 'desktop' || variant === 'mobile') renderQuery = renderQuery.eq('variant', variant)

  const { data: renderRows, error: renderErr } = await renderQuery
  if (renderErr) return NextResponse.json({ error: renderErr.message }, { status: 500 })
  if (!renderRows || renderRows.length === 0) {
    return NextResponse.json({ renders: [], filters_meta: await fetchMeta(admin) })
  }

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
  ids: z.array(z.string().uuid()).min(1).max(200),
})

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

  // Zeilen vorab laden, um die Storage-Pfade zu rekonstruieren.
  const { data: rows, error: fetchErr } = await admin
    .from('preset_renders')
    .select('id, preset_id, mockup_set_id, variant')
    .in('id', parsed.data.ids)

  if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 })
  if (!rows || rows.length === 0) return NextResponse.json({ deleted: 0 })

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
  return NextResponse.json({ deleted: rows.length })
}

async function fetchMeta(admin: ReturnType<typeof createAdminClient>) {
  const { data: mockupSets } = await admin
    .from('mockup_sets')
    .select('id, name, slug')
    .eq('is_active', true)
    .order('name')

  return { mockup_sets: mockupSets ?? [] }
}
