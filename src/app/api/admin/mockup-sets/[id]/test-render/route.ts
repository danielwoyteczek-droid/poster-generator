import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase-admin'
import { renderMockup, DynamicMockupsApiError } from '@/lib/dynamic-mockups-client'

const PLACEHOLDER_ASSET_URL = 'https://dynamicmockups.com/logo.png'

/**
 * Validiert die UUIDs eines Mockup-Sets via Test-Render gegen Dynamic Mockups.
 * Speichert die zurückgelieferten export_paths als Thumbnails.
 *
 * Verbraucht 2 Render-Credits (Desktop + Mobile).
 */
export async function POST(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: 'Forbidden' }, { status: auth.status })

  const { id } = await context.params
  const admin = createAdminClient()

  const { data: mockupSet, error: fetchErr } = await admin
    .from('mockup_sets')
    .select('id, desktop_template_uuid, desktop_smart_object_uuid, mobile_template_uuid, mobile_smart_object_uuid')
    .eq('id', id)
    .single()

  if (fetchErr || !mockupSet) return NextResponse.json({ error: 'Mockup-Set nicht gefunden' }, { status: 404 })

  const errors: { variant: 'desktop' | 'mobile'; message: string }[] = []
  const updates: Record<string, string> = {}

  for (const variant of ['desktop', 'mobile'] as const) {
    const templateUuid = variant === 'desktop' ? mockupSet.desktop_template_uuid : mockupSet.mobile_template_uuid
    const smartObjectUuid = variant === 'desktop' ? mockupSet.desktop_smart_object_uuid : mockupSet.mobile_smart_object_uuid

    try {
      const result = await renderMockup({
        templateUuid,
        smartObjectUuid,
        assetUrl: PLACEHOLDER_ASSET_URL,
      })
      updates[`${variant}_thumbnail_url`] = result.exportPath
    } catch (err) {
      const message = err instanceof DynamicMockupsApiError ? err.message : (err as Error).message
      errors.push({ variant, message })
    }
  }

  if (errors.length > 0) {
    return NextResponse.json(
      { error: 'Test-Render fehlgeschlagen', failures: errors, partial_thumbnails: updates },
      { status: 400 },
    )
  }

  // Beide Thumbnails speichern
  const { data: updated, error: updErr } = await admin
    .from('mockup_sets')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 })

  return NextResponse.json({ mockup_set: updated })
}
