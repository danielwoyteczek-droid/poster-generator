import { NextRequest, NextResponse } from 'next/server'
import JSZip from 'jszip'
import { requireAdmin } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase-admin'

export const runtime = 'nodejs'
export const maxDuration = 60

/**
 * PROJ-54 Phase 4: Lädt alle Listing-Bilder einer etsy_listing_def als ZIP
 * herunter. Struktur:
 *
 *   gallery/                 ← palette_mode='main' Items (Haupt-Palette)
 *     01-hero.png
 *     02-personalisierung.png
 *     ...
 *   variants/
 *     <palette-slug>/        ← palette_mode='all' Items pro Palette
 *       03-variant.png
 *     ...
 *   manifest.json            ← Mapping label/palette/role pro Datei
 *
 * Operator-Workflow:
 *  - `gallery/` → Etsy-Galerie-Photos (Photo 1..10)
 *  - `variants/<palette>/` → Etsy-Variant-Bild für diese Palette
 *
 * Streamt das ZIP direkt zurück, kein Zwischen-Storage.
 */
export async function GET(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: 'Forbidden' }, { status: auth.status })

  const { id } = await context.params
  const admin = createAdminClient()

  // Def + Set laden
  const { data: def } = await admin
    .from('etsy_listing_defs')
    .select('id, name, palette_ids, listing_image_set_id, main_palette_id')
    .eq('id', id)
    .single()
  if (!def) return NextResponse.json({ error: 'Listing-Definition nicht gefunden' }, { status: 404 })
  if (!def.listing_image_set_id) {
    return NextResponse.json({ error: 'Keine listing_image_set_id zugewiesen' }, { status: 400 })
  }

  const { data: setRow } = await admin
    .from('listing_image_sets')
    .select('id, slug, name')
    .eq('id', def.listing_image_set_id)
    .single()
  if (!setRow) return NextResponse.json({ error: 'Listing-Image-Set nicht gefunden' }, { status: 404 })

  const { data: items } = await admin
    .from('listing_image_set_items')
    .select('label, display_name, display_order, palette_mode')
    .eq('listing_image_set_id', def.listing_image_set_id)
    .order('display_order')
  if (!items || items.length === 0) {
    return NextResponse.json({ error: 'Set hat keine Items' }, { status: 400 })
  }
  const itemByLabel = new Map(items.map((i) => [i.label as string, i]))

  // Variants laden
  const { data: variants } = await admin
    .from('etsy_listing_variants')
    .select('palette_id, cloned_preset_id')
    .eq('listing_def_id', id)
  if (!variants || variants.length === 0) {
    return NextResponse.json({ error: 'Keine Varianten — erst rendern.' }, { status: 400 })
  }

  const palettesArr = (def.palette_ids as string[]) ?? []
  const mainPaletteId = (def.main_palette_id as string | null) ?? palettesArr[0] ?? null
  const mainVariant = variants.find((v) => v.palette_id === mainPaletteId) ?? null
  const mainPresetId = (mainVariant?.cloned_preset_id as string | null) ?? null

  // Storage-Scan pro Variant-Preset
  const zip = new JSZip()
  type ManifestEntry = { file: string; label: string; display_name: string; palette: string; role: 'gallery' | 'variant' }
  const manifest: ManifestEntry[] = []

  await Promise.all(
    variants.map(async (variant) => {
      const presetId = variant.cloned_preset_id as string | null
      if (!presetId) return
      const folder = `listing-images/${presetId}/${setRow.slug}`
      const { data: files } = await admin.storage.from('preset-renders').list(folder, { limit: 100 })
      if (!files || files.length === 0) return

      await Promise.all(
        files.map(async (f) => {
          const label = f.name.replace(/\.png$/, '')
          const item = itemByLabel.get(label)
          if (!item) return
          const mode = (item.palette_mode as 'main' | 'all') ?? 'all'

          // 'main'-Files nur aus dem Main-Variant-Preset aufnehmen
          if (mode === 'main' && presetId !== mainPresetId) return

          const { data: dl } = await admin.storage.from('preset-renders').download(`${folder}/${f.name}`)
          if (!dl) return
          const buf = Buffer.from(await dl.arrayBuffer())

          if (mode === 'main') {
            const zipPath = `gallery/${f.name}`
            zip.file(zipPath, buf)
            manifest.push({
              file: zipPath,
              label,
              display_name: item.display_name as string,
              palette: variant.palette_id as string,
              role: 'gallery',
            })
          } else {
            const zipPath = `variants/${variant.palette_id}/${f.name}`
            zip.file(zipPath, buf)
            manifest.push({
              file: zipPath,
              label,
              display_name: item.display_name as string,
              palette: variant.palette_id as string,
              role: 'variant',
            })
          }
        }),
      )
    }),
  )

  if (manifest.length === 0) {
    return NextResponse.json({ error: 'Keine Listing-Bilder im Storage gefunden — bitte erst „Listing-Bilder" klicken.' }, { status: 400 })
  }

  // Manifest mitliefern
  manifest.sort((a, b) => a.file.localeCompare(b.file))
  zip.file('manifest.json', JSON.stringify({
    listing_def_id: id,
    listing_def_name: def.name,
    listing_image_set: { id: setRow.id, slug: setRow.slug, name: setRow.name },
    main_palette: mainPaletteId,
    files: manifest,
  }, null, 2))

  const zipBuffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'STORE' })
  const filename = `listing-${def.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.zip`

  return new NextResponse(new Uint8Array(zipBuffer), {
    status: 200,
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
