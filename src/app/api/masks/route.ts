import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'
import { createClient } from '@/lib/supabase-server'
import { ALL_POSTER_TYPES, type PosterType } from '@/lib/poster-types'

/**
 * Public mask catalogue used by the editor.
 *
 * Admin-aware: an authenticated admin user sees ALL custom masks (so they can
 * select non-public ones for testing/preview); everyone else only sees masks
 * with `is_public = true`.
 *
 * PROJ-40: optional `?posterType=map|star-map|photo` query filters the
 * catalogue down to masks whose `applicable_poster_types` array contains the
 * requested editor variant. The map editor passes 'map' (default behaviour),
 * the star-map editor passes 'star-map', the photo editor passes 'photo'.
 */
export async function GET(req: NextRequest) {
  // Determine if the requester is an admin without rejecting non-admins —
  // this endpoint is public, but admins get a wider result set.
  let isAdmin = false
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()
      isAdmin = profile?.role === 'admin'
    }
  } catch {
    // Anonymous request or auth probe failure → treat as non-admin.
  }

  const admin = createAdminClient()
  let query = admin
    .from('custom_masks')
    .select('mask_key, label, mask_svg_url, shape_viewbox, shape_markup, is_public, decoration_svg_url, transform_x, transform_y, transform_scale, decoration_transform_x, decoration_transform_y, decoration_transform_scale, applicable_poster_types')
    .order('display_order', { ascending: true })
    .order('created_at', { ascending: false })
    .limit(200)

  if (!isAdmin) query = query.eq('is_public', true)

  const posterTypeRaw = req.nextUrl.searchParams.get('posterType')
  if (posterTypeRaw && (ALL_POSTER_TYPES as readonly string[]).includes(posterTypeRaw)) {
    query = query.contains('applicable_poster_types', [posterTypeRaw as PosterType])
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ masks: data ?? [] })
}
