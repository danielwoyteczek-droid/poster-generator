import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase-admin'
import { retryImage } from '@/lib/image-generator/server'
import { UUID_RE, errorResponse, invalidId } from '@/lib/image-generator/route-utils'

export const runtime = 'nodejs'
export const maxDuration = 60

/** PROJ-56: fehlgeschlagenes oder veraltetes Bild neu erzeugen. */
export async function POST(_req: NextRequest, context: { params: Promise<{ imageId: string }> }) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: 'Forbidden' }, { status: auth.status })

  const { imageId } = await context.params
  if (!UUID_RE.test(imageId)) return invalidId()

  try {
    return NextResponse.json({ image: await retryImage(createAdminClient(), imageId) })
  } catch (err) {
    return errorResponse(err)
  }
}
