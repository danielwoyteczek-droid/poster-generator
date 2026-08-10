import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase-admin'
import { renderMockup, DynamicMockupsApiError } from '@/lib/dynamic-mockups-client'
import { composeLocalMockup, type SlotRect } from '@/lib/local-mockup-processor'

export const runtime = 'nodejs'

const PLACEHOLDER_ASSET_URL = 'https://dynamicmockups.com/logo.png'

/**
 * Validiert ein Mockup-Set per Test-Render mit Platzhalter-Poster.
 *
 * Provider-Verzweigung:
 *  - dynamic_mockups: ruft die DM-API für Desktop + Mobile (2 Credits) und
 *    speichert die exportPaths als Thumbnails
 *  - local: rendert die hinterlegten Orientation-Overlays serverseitig mit
 *    sharp gegen ein generiertes DIN-A4-Platzhalter-PNG. Composites werden
 *    in den preset-renders-Bucket als Thumbnails geladen.
 */
export async function POST(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: 'Forbidden' }, { status: auth.status })

  const { id } = await context.params
  const admin = createAdminClient()

  const { data: mockupSet, error: fetchErr } = await admin
    .from('mockup_sets')
    .select('id, slug, provider, desktop_template_uuid, desktop_smart_object_uuid, mobile_template_uuid, mobile_smart_object_uuid, local_portrait_overlay_url, local_portrait_slot, local_landscape_overlay_url, local_landscape_slot')
    .eq('id', id)
    .single()

  if (fetchErr || !mockupSet) return NextResponse.json({ error: 'Mockup-Set nicht gefunden' }, { status: 404 })

  if (mockupSet.provider === 'local') {
    return testRenderLocal(admin, mockupSet)
  }
  return testRenderDynamicMockups(admin, mockupSet)
}

// ─── Dynamic-Mockups-Pfad ─────────────────────────────────────────────────

async function testRenderDynamicMockups(
  admin: ReturnType<typeof createAdminClient>,
  mockupSet: {
    id: string
    desktop_template_uuid: string | null
    desktop_smart_object_uuid: string | null
    mobile_template_uuid: string | null
    mobile_smart_object_uuid: string | null
  },
): Promise<NextResponse> {
  const errors: { variant: 'desktop' | 'mobile'; message: string }[] = []
  const updates: Record<string, string> = {}

  for (const variant of ['desktop', 'mobile'] as const) {
    const templateUuid = variant === 'desktop' ? mockupSet.desktop_template_uuid : mockupSet.mobile_template_uuid
    const smartObjectUuid = variant === 'desktop' ? mockupSet.desktop_smart_object_uuid : mockupSet.mobile_smart_object_uuid
    if (!templateUuid || !smartObjectUuid) {
      errors.push({ variant, message: `UUIDs für ${variant} fehlen` })
      continue
    }

    try {
      const result = await renderMockup({ templateUuid, smartObjectUuid, assetUrl: PLACEHOLDER_ASSET_URL })
      updates[`${variant}_thumbnail_url`] = result.exportPath
    } catch (err) {
      const message = err instanceof DynamicMockupsApiError ? err.message : (err as Error).message
      errors.push({ variant, message })
    }
  }

  if (errors.length > 0) {
    return NextResponse.json(
      { error: 'Test-Render fehlgeschlagen', failures: errors, partial_thumbnails: updates },
      { status: 400 },
    )
  }

  const { data: updated, error: updErr } = await admin
    .from('mockup_sets')
    .update(updates)
    .eq('id', mockupSet.id)
    .select()
    .single()
  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 })

  return NextResponse.json({ mockup_set: updated })
}

// ─── Local-Provider-Pfad ──────────────────────────────────────────────────

const PRESET_RENDERS_BUCKET = 'preset-renders'

async function testRenderLocal(
  admin: ReturnType<typeof createAdminClient>,
  mockupSet: {
    id: string
    slug: string
    local_portrait_overlay_url: string | null
    local_portrait_slot: SlotRect | null
    local_landscape_overlay_url: string | null
    local_landscape_slot: SlotRect | null
  },
): Promise<NextResponse> {
  // Platzhalter-Poster (DIN-A-Aspect 1:√2 für portrait, √2:1 für landscape)
  const placeholderPortrait = await buildPlaceholderPoster(800, 1131)
  const placeholderLandscape = await buildPlaceholderPoster(1131, 800)

  const errors: { orientation: 'portrait' | 'landscape'; message: string }[] = []
  const updates: Record<string, string> = {}

  for (const orientation of ['portrait', 'landscape'] as const) {
    const overlayUrl = orientation === 'portrait'
      ? mockupSet.local_portrait_overlay_url
      : mockupSet.local_landscape_overlay_url
    const slot = orientation === 'portrait'
      ? mockupSet.local_portrait_slot
      : mockupSet.local_landscape_slot

    if (!overlayUrl || !slot) continue  // Orientation nicht konfiguriert — kein Fehler, überspringen

    try {
      const overlayResp = await fetch(overlayUrl)
      if (!overlayResp.ok) throw new Error(`Overlay-Fetch HTTP ${overlayResp.status}`)
      const overlayBuffer = Buffer.from(await overlayResp.arrayBuffer())

      const posterBuffer = orientation === 'portrait' ? placeholderPortrait : placeholderLandscape
      const composite = await composeLocalMockup({ posterBuffer, overlayBuffer, slot })

      // Thumbnail in preset-renders/_thumbnails/{set-id}/{orientation}.jpg
      const thumbPath = `_thumbnails/${mockupSet.id}/${orientation}.jpg`
      const { error: upErr } = await admin.storage
        .from(PRESET_RENDERS_BUCKET)
        .upload(thumbPath, composite, { contentType: 'image/jpeg', upsert: true })
      if (upErr) throw new Error(`Thumbnail-Upload: ${upErr.message}`)

      const { data: urlData } = admin.storage.from(PRESET_RENDERS_BUCKET).getPublicUrl(thumbPath)
      // Schreibe in desktop_thumbnail_url (portrait) / mobile_thumbnail_url
      // (landscape). Reuse vorhandener UI-Felder ohne neue Spalten.
      const dbField = orientation === 'portrait' ? 'desktop_thumbnail_url' : 'mobile_thumbnail_url'
      updates[dbField] = `${urlData.publicUrl}?v=${Date.now()}`
    } catch (err) {
      errors.push({ orientation, message: (err as Error).message })
    }
  }

  if (errors.length > 0) {
    return NextResponse.json(
      { error: 'Test-Render fehlgeschlagen', failures: errors, partial_thumbnails: updates },
      { status: 400 },
    )
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json(
      { error: 'Keine Orientation konfiguriert — bitte mindestens ein Overlay hochladen' },
      { status: 400 },
    )
  }

  const { data: updated, error: updErr } = await admin
    .from('mockup_sets')
    .update(updates)
    .eq('id', mockupSet.id)
    .select()
    .single()
  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 })

  return NextResponse.json({ mockup_set: updated })
}

async function buildPlaceholderPoster(width: number, height: number): Promise<Buffer> {
  const sharp = (await import('sharp')).default
  // Hellgraues Poster mit einem Text-Streifen, damit der Slot sichtbar ist.
  // Reicht für reinen Smoke-Test der Compositing-Pipeline.
  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#e8e4de"/>
      <rect x="${width * 0.1}" y="${height * 0.4}" width="${width * 0.8}" height="${height * 0.2}" fill="#1F3A44"/>
      <text x="${width / 2}" y="${height * 0.52}" text-anchor="middle" fill="#fff" font-family="sans-serif" font-size="${Math.round(height * 0.05)}">TEST</text>
    </svg>
  `
  return sharp(Buffer.from(svg)).png().toBuffer()
}
