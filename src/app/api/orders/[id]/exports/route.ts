import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase-admin'

const BUCKET = 'order-exports'

const UploadInitSchema = z.object({
  item_index: z.number().int().min(0),
  file_type: z.enum(['png', 'pdf']),
  token: z.string().min(1),
})

const UploadCommitSchema = UploadInitSchema.extend({
  storage_path: z.string().min(1),
  file_size_bytes: z.number().int().nonnegative().optional(),
})

async function loadPaidOrder(id: string, token: string) {
  const admin = createAdminClient()
  const { data: order } = await admin
    .from('orders')
    .select('id, status, items, access_token')
    .eq('id', id)
    .eq('access_token', token)
    .single()
  return { admin, order }
}

// POST = phase 1: request a signed upload URL for direct client-to-storage upload
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params
  const body = await req.json().catch(() => null)
  const parsed = UploadInitSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid body' }, { status: 400 })

  const { admin, order } = await loadPaidOrder(id, parsed.data.token)
  if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  if (order.status !== 'paid') return NextResponse.json({ error: 'Order not paid' }, { status: 403 })

  const items = order.items as { productId: string }[]
  const item = items[parsed.data.item_index]
  if (!item) {
    return NextResponse.json({ error: 'Item not found' }, { status: 400 })
  }

  const storagePath = `${id}/item-${parsed.data.item_index}.${parsed.data.file_type}`
  const { data: signed, error } = await admin.storage
    .from(BUCKET)
    .createSignedUploadUrl(storagePath, { upsert: true })

  if (error || !signed) {
    return NextResponse.json({ error: error?.message || 'Upload URL failed' }, { status: 500 })
  }

  return NextResponse.json({
    uploadUrl: signed.signedUrl,
    storagePath,
    token: signed.token,
  })
}

// PATCH = phase 2: commit the upload by creating the export row
export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params
  const body = await req.json().catch(() => null)
  const parsed = UploadCommitSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid body' }, { status: 400 })

  const { admin, order } = await loadPaidOrder(id, parsed.data.token)
  if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  if (order.status !== 'paid') return NextResponse.json({ error: 'Order not paid' }, { status: 403 })

  const { data, error } = await admin
    .from('order_exports')
    .upsert(
      {
        order_id: id,
        item_index: parsed.data.item_index,
        file_type: parsed.data.file_type,
        storage_bucket: BUCKET,
        storage_path: parsed.data.storage_path,
        file_size_bytes: parsed.data.file_size_bytes ?? null,
      },
      { onConflict: 'order_id,item_index,file_type' },
    )
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ export: data })
}
