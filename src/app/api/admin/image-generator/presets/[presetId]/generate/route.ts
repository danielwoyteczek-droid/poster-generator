import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase-admin'
import { generateImages } from '@/lib/image-generator/server'
import { UUID_RE, errorResponse, invalidId } from '@/lib/image-generator/route-utils'

export const runtime = 'nodejs'
export const maxDuration = 60

const GenerateSchema = z.object({
  entries: z
    .array(z.object({
      mockup_set_id: z.string().uuid(),
      overlay_id: z.string().uuid().nullable(),
    }))
    .min(1, 'Mindestens ein Mockup wählen')
    .max(20, 'Höchstens 20 Mockups pro Lauf'),
  palette_ids: z.array(z.string().trim().min(1).max(60)).max(20, 'Höchstens 20 Zusatzfarben pro Lauf'),
})

/**
 * PROJ-56: Bilder erzeugen. Legt die Galerie-Einträge an, erzeugt sofort, was
 * geht (lokale Mockups mit fertigem Poster), und stößt für den Rest den
 * Render-Worker an.
 */
export async function POST(req: NextRequest, context: { params: Promise<{ presetId: string }> }) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: 'Forbidden' }, { status: auth.status })

  const { presetId } = await context.params
  if (!UUID_RE.test(presetId)) return invalidId()

  const body = await req.json().catch(() => null)
  const parsed = GenerateSchema.safeParse(body)
  if (!parsed.success) {
    const first = parsed.error.issues[0]?.message ?? 'Ungültige Eingabe'
    return NextResponse.json({ error: first, details: parsed.error.flatten() }, { status: 400 })
  }

  try {
    return NextResponse.json(await generateImages(createAdminClient(), presetId, parsed.data))
  } catch (err) {
    return errorResponse(err)
  }
}
