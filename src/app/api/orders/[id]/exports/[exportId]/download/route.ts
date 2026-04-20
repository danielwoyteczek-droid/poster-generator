import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string; exportId: string }> },
) {
  const { id, exportId } = await context.params
  const token = req.nextUrl.searchParams.get('token')
  if (!token) return NextResponse.json({ error: 'Token fehlt' }, { status: 400 })

  const admin = createAdminClient()

  // Validate token against order
  const { data: order } = await admin
    .from('orders')
    .select('id, status')
    .eq('id', id)
    .eq('access_token', token)
    .single()
  if (!order || order.status !== 'paid') {
    return NextResponse.json({ error: 'Nicht freigegeben' }, { status: 403 })
  }

  const { data: exportRec } = await admin
    .from('order_exports')
    .select('storage_bucket, storage_path, file_type')
    .eq('id', exportId)
    .eq('order_id', id)
    .single()
  if (!exportRec) return NextResponse.json({ error: 'Export nicht gefunden' }, { status: 404 })

  const { data: signed, error } = await admin.storage
    .from(exportRec.storage_bucket)
    .createSignedUrl(exportRec.storage_path, 60, {
      download: `poster.${exportRec.file_type}`,
    })

  if (error || !signed) {
    return NextResponse.json({ error: error?.message || 'Signed URL failed' }, { status: 500 })
  }

  return NextResponse.json({ url: signed.signedUrl })
}
