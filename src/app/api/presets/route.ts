import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'
import { LocaleSchema } from '@/lib/preset-locales'
import { OccasionSchema } from '@/lib/occasions'

export async function GET(req: NextRequest) {
  const posterType = req.nextUrl.searchParams.get('poster_type')
  const localeParam = req.nextUrl.searchParams.get('locale')
  const occasionParam = req.nextUrl.searchParams.get('occasion')

  const admin = createAdminClient()
  // Public API powers the editor's PresetPicker — we only return presets
  // that are explicitly marked as editor-visible. Gallery-only presets
  // (show_in_editor = false) are filtered out here but remain accessible
  // to the gallery page, which queries Supabase directly.
  let query = admin
    .from('presets')
    .select('id, name, description, poster_type, preview_image_url, config_json, display_order, target_locales, occasions')
    .eq('status', 'published')
    .eq('show_in_editor', true)
    .order('display_order', { ascending: true })
    .limit(100)

  if (posterType) query = query.eq('poster_type', posterType)

  if (localeParam) {
    const parsed = LocaleSchema.safeParse(localeParam)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid locale' }, { status: 400 })
    }
    query = query.contains('target_locales', [parsed.data])
  }

  if (occasionParam) {
    const parsed = OccasionSchema.safeParse(occasionParam)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid occasion' }, { status: 400 })
    }
    query = query.contains('occasions', [parsed.data])
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ presets: data ?? [] })
}
