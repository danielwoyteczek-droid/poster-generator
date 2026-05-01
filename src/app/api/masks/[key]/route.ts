import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'

/**
 * Single-mask lookup by `mask_key` — bypasses the public `/api/masks` endpoint's
 * `is_public = true` filter so customers can resolve masks referenced by an
 * applied preset, even if the mask itself is currently non-public (PROJ-35
 * edge case "old preset → mask was un-published").
 *
 * Security note: keys are random `custom-{8 hex}` so enumeration is impractical.
 * The only useful path is "I already have this key from a preset config" —
 * which is the supported use case.
 */
export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ key: string }> },
) {
  const { key } = await context.params
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('custom_masks')
    .select('mask_key, label, mask_svg_url, shape_viewbox, shape_markup, is_public, decoration_svg_url')
    .eq('mask_key', key)
    .single()
  if (error || !data) return NextResponse.json({ mask: null }, { status: 404 })
  return NextResponse.json({ mask: data })
}
