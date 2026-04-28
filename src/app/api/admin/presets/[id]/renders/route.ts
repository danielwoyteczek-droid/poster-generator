import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase-admin'

/**
 * Liefert alle gerenderten Composite-Bilder eines Presets (alle Mockup-Sets,
 * Desktop + Mobile). Wird im Admin-Lightbox angezeigt.
 */
export async function GET(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: 'Forbidden' }, { status: auth.status })

  const { id } = await context.params
  const admin = createAdminClient()

  const { data, error } = await admin
    .from('preset_renders')
    .select('mockup_set_id, variant, image_url, image_width, image_height, rendered_at')
    .eq('preset_id', id)
    .order('rendered_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Mockup-Set-Namen mitliefern für Anzeige
  const mockupSetIds = [...new Set((data ?? []).map((r) => r.mockup_set_id))]
  const { data: mockupSets } = mockupSetIds.length
    ? await admin.from('mockup_sets').select('id, name, slug').in('id', mockupSetIds)
    : { data: [] }

  const mockupSetMap = Object.fromEntries((mockupSets ?? []).map((m) => [m.id, m]))

  const renders = (data ?? []).map((r) => ({
    ...r,
    mockup_set: mockupSetMap[r.mockup_set_id] ?? null,
  }))

  return NextResponse.json({ renders })
}
