import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase-admin'

export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: 'Forbidden' }, { status: auth.status })

  const { id } = await context.params
  const admin = createAdminClient()

  const { data: mask } = await admin.from('custom_masks').select('id').eq('id', id).single()
  if (!mask) return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 })

  // Delete the SVGs from storage (best-effort — ignore errors)
  await admin.storage.from('masks').remove([`${id}/mask.svg`]).catch(() => {})

  const { error } = await admin.from('custom_masks').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return new NextResponse(null, { status: 204 })
}
