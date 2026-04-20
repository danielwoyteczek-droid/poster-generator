import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'

export async function GET() {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('custom_masks')
    .select('mask_key, label, mask_svg_url, shape_viewbox, shape_markup')
    .order('display_order', { ascending: true })
    .order('created_at', { ascending: false })
    .limit(200)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ masks: data ?? [] })
}
