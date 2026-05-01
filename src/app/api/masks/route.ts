import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'
import { createClient } from '@/lib/supabase-server'

/**
 * Public mask catalogue used by the editor.
 *
 * Admin-aware: an authenticated admin user sees ALL custom masks (so they can
 * select non-public ones for testing/preview); everyone else only sees masks
 * with `is_public = true`.
 */
export async function GET() {
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
    .select('mask_key, label, mask_svg_url, shape_viewbox, shape_markup, is_public, decoration_svg_url')
    .order('display_order', { ascending: true })
    .order('created_at', { ascending: false })
    .limit(200)

  if (!isAdmin) query = query.eq('is_public', true)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ masks: data ?? [] })
}
