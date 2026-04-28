import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase-admin'

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

async function fetchMeta(admin: ReturnType<typeof createAdminClient>) {
  const { data: mockupSets } = await admin
    .from('mockup_sets')
    .select('id, name, slug')
    .eq('is_active', true)
    .order('name')

  return { mockup_sets: mockupSets ?? [] }
}
