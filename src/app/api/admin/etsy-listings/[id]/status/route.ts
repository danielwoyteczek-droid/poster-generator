import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase-admin'

// PROJ-53: Aggregierter Render-Status je Farb-Look (für Live-Polling in der UI).

export async function GET(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: 'Forbidden' }, { status: auth.status })

  const { id } = await context.params
  const admin = createAdminClient()

  const { data: variants, error } = await admin
    .from('etsy_listing_variants')
    .select('palette_id, cloned_preset_id')
    .eq('listing_def_id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const presetIds = (variants ?? []).map((v) => v.cloned_preset_id).filter(Boolean) as string[]
  const presetMap = new Map<string, { render_status: string | null; render_status_a4: string | null; render_error: string | null }>()
  if (presetIds.length) {
    const { data: presets } = await admin
      .from('presets')
      .select('id, render_status, render_status_a4, render_error')
      .in('id', presetIds)
    for (const p of presets ?? []) presetMap.set(p.id, p)
  }

  const looks = (variants ?? []).map((v) => {
    const p = v.cloned_preset_id ? presetMap.get(v.cloned_preset_id) : undefined
    return {
      paletteId: v.palette_id,
      presetId: v.cloned_preset_id,
      // 'flat' = das A4-Render, das wir für Var Photo / Photos brauchen
      flatStatus: p?.render_status_a4 ?? null,
      overallStatus: p?.render_status ?? null,
      error: p?.render_error ?? null,
    }
  })

  const flatDone = looks.length > 0 && looks.every((l) => l.flatStatus === 'done')
  return NextResponse.json({ looks, flatDone })
}
