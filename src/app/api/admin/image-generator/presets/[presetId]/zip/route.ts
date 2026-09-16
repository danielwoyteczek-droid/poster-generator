import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase-admin'
import { buildGalleryZip } from '@/lib/image-generator/server'
import { UUID_RE, errorResponse, invalidId } from '@/lib/image-generator/route-utils'

export const runtime = 'nodejs'
export const maxDuration = 60

/** PROJ-56: alle fertigen Galerie-Bilder eines Presets als ZIP. */
export async function GET(_req: NextRequest, context: { params: Promise<{ presetId: string }> }) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: 'Forbidden' }, { status: auth.status })

  const { presetId } = await context.params
  if (!UUID_RE.test(presetId)) return invalidId()

  try {
    const { buffer, filename } = await buildGalleryZip(createAdminClient(), presetId)
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (err) {
    return errorResponse(err)
  }
}
