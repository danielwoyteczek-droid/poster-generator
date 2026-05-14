import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase-admin'
import { listFontsWithStyles, FONTS_BUCKET } from '@/lib/fonts-server'
import { validateFontFile, buildFontStoragePath } from '@/lib/font-validation'

const SLUG = /^[a-z][a-z0-9-]*$/

const MetaSchema = z.object({
  id: z.string().trim().min(2).max(60).regex(SLUG, 'id must be a lowercase slug'),
  family_name: z.string().trim().min(1).max(100),
  category: z.enum(['serif', 'script', 'sans', 'display']),
  description: z.string().max(500).optional(),
  display_order: z.number().int().optional(),
})

interface SlotInput {
  file: File
  weight: number
  style: 'normal' | 'italic'
}

function parseStyleSlots(formData: FormData): { slots: SlotInput[]; error?: string } {
  const countRaw = formData.get('styles_count')
  const count = typeof countRaw === 'string' ? Number(countRaw) : NaN
  if (!Number.isInteger(count) || count < 1 || count > 9) {
    return { slots: [], error: 'styles_count fehlt oder ungültig (1–9)' }
  }
  const slots: SlotInput[] = []
  const seenKeys = new Set<string>()
  for (let i = 0; i < count; i += 1) {
    const file = formData.get(`style_${i}_file`)
    const weightRaw = formData.get(`style_${i}_weight`)
    const styleRaw = formData.get(`style_${i}_style`)
    if (!(file instanceof File)) return { slots: [], error: `Schnitt ${i + 1}: Datei fehlt` }
    const weight = typeof weightRaw === 'string' ? Number(weightRaw) : NaN
    if (!Number.isInteger(weight) || weight < 100 || weight > 900 || weight % 100 !== 0) {
      return { slots: [], error: `Schnitt ${i + 1}: weight ungültig` }
    }
    if (styleRaw !== 'normal' && styleRaw !== 'italic') {
      return { slots: [], error: `Schnitt ${i + 1}: style muss 'normal' oder 'italic' sein` }
    }
    const key = `${weight}-${styleRaw}`
    if (seenKeys.has(key)) {
      return { slots: [], error: `Schnitt ${weight}/${styleRaw} doppelt vorhanden` }
    }
    seenKeys.add(key)
    slots.push({ file, weight, style: styleRaw })
  }
  return { slots }
}

export async function GET() {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: 'Forbidden' }, { status: auth.status })

  const admin = createAdminClient()
  try {
    const fonts = await listFontsWithStyles(admin)
    return NextResponse.json({ fonts })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 },
    )
  }
}

/**
 * Create a new font (draft) with one or more style files in a single
 * multipart request. The handler is atomic in best-effort: if any style
 * upload fails after the font row exists, we attempt to roll back the
 * created storage objects and DB rows so the admin can retry cleanly.
 */
export async function POST(req: NextRequest) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: 'Forbidden' }, { status: auth.status })

  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json({ error: 'Multipart-Form erwartet' }, { status: 400 })
  }

  // Parse metadata
  const metaParsed = MetaSchema.safeParse({
    id: formData.get('id'),
    family_name: formData.get('family_name'),
    category: formData.get('category'),
    description: (formData.get('description') as string | null) || undefined,
    display_order: formData.get('display_order') ? Number(formData.get('display_order')) : undefined,
  })
  if (!metaParsed.success) {
    return NextResponse.json(
      { error: 'Ungültige Metadaten', details: metaParsed.error.flatten() },
      { status: 400 },
    )
  }
  const meta = metaParsed.data

  // Parse style slots
  const { slots, error: slotError } = parseStyleSlots(formData)
  if (slotError) return NextResponse.json({ error: slotError }, { status: 400 })

  // Validate every file (extension + magic-number + size)
  const validated: { slot: SlotInput; extension: string }[] = []
  for (let i = 0; i < slots.length; i += 1) {
    const v = await validateFontFile(slots[i].file)
    if (!v.ok || !v.extension) {
      return NextResponse.json(
        { error: `Schnitt ${i + 1} (${slots[i].weight}/${slots[i].style}): ${v.error ?? 'Datei ungültig'}` },
        { status: 400 },
      )
    }
    validated.push({ slot: slots[i], extension: v.extension })
  }

  const admin = createAdminClient()

  // Insert font row (status=draft)
  const { error: insertErr } = await admin.from('fonts').insert({
    id: meta.id,
    family_name: meta.family_name,
    category: meta.category,
    description: meta.description ?? null,
    display_order: meta.display_order ?? 0,
    status: 'draft',
  })
  if (insertErr) {
    const isDuplicate = insertErr.code === '23505'
    const message = isDuplicate
      ? insertErr.message.includes('family_name')
        ? 'Eine Font mit diesem Family-Namen existiert bereits'
        : 'Eine Font mit dieser ID existiert bereits'
      : insertErr.message
    return NextResponse.json({ error: message }, { status: isDuplicate ? 409 : 500 })
  }

  // Upload every style + insert font_styles rows
  const uploadedPaths: string[] = []
  try {
    for (const { slot, extension } of validated) {
      const path = buildFontStoragePath(meta.id, slot.weight, slot.style, extension)
      const bytes = new Uint8Array(await slot.file.arrayBuffer())
      const { error: upErr } = await admin.storage
        .from(FONTS_BUCKET)
        .upload(path, bytes, { contentType: slot.file.type || 'application/octet-stream', upsert: false })
      if (upErr) throw new Error(`Storage-Upload für ${slot.weight}/${slot.style} fehlgeschlagen: ${upErr.message}`)
      uploadedPaths.push(path)

      const { error: styleErr } = await admin.from('font_styles').insert({
        font_id: meta.id,
        weight: slot.weight,
        style: slot.style,
        storage_path: path,
        file_size_bytes: slot.file.size,
      })
      if (styleErr) throw new Error(`DB-Insert für ${slot.weight}/${slot.style} fehlgeschlagen: ${styleErr.message}`)
    }
  } catch (err) {
    // Rollback: delete uploaded files + font row (CASCADE drops style rows).
    if (uploadedPaths.length > 0) {
      await admin.storage.from(FONTS_BUCKET).remove(uploadedPaths)
    }
    await admin.from('fonts').delete().eq('id', meta.id)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Upload fehlgeschlagen' },
      { status: 500 },
    )
  }

  // Return the freshly-created font with resolved URLs.
  const fonts = await listFontsWithStyles(admin).catch(() => [])
  const created = fonts.find((f) => f.id === meta.id)
  return NextResponse.json({ font: created ?? null }, { status: 201 })
}
