import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase-admin'
import { deleteImage } from '@/lib/image-generator/server'
import { UUID_RE, errorResponse, invalidId } from '@/lib/image-generator/route-utils'

/** PROJ-56: ein Galerie-Bild löschen (Eintrag + Datei). */
export async function DELETE(_req: NextRequest, context: { params: Promise<{ imageId: string }> }) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: 'Forbidden' }, { status: auth.status })

  const { imageId } = await context.params
  if (!UUID_RE.test(imageId)) return invalidId()

  try {
    await deleteImage(createAdminClient(), imageId)
    return NextResponse.json({ ok: true })
  } catch (err) {
    return errorResponse(err)
  }
}
