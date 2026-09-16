import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase-admin'
import { getGeneratorState } from '@/lib/image-generator/server'
import { UUID_RE, errorResponse, invalidId } from '@/lib/image-generator/route-utils'

/** PROJ-56: Generator-Zustand eines Presets (Preset-Infos + Galerie-Bilder mit Status). */
export async function GET(_req: NextRequest, context: { params: Promise<{ presetId: string }> }) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: 'Forbidden' }, { status: auth.status })

  const { presetId } = await context.params
  if (!UUID_RE.test(presetId)) return invalidId()

  try {
    return NextResponse.json(await getGeneratorState(createAdminClient(), presetId))
  } catch (err) {
    return errorResponse(err)
  }
}
