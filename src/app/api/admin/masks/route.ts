import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase-admin'
import { parseShapeSvg } from '@/lib/mask-composer'
import {
  ALL_POSTER_TYPES,
  DEFAULT_APPLICABLE_POSTER_TYPES,
  type PosterType,
} from '@/lib/poster-types'

const BUCKET = 'masks'

/**
 * Parse the `applicable_poster_types` form field. Accepts either a single
 * value (browser form auto-collapses single-select multi-checkboxes) or
 * comma-separated. Filters to known PosterType values; falls back to
 * DEFAULT_APPLICABLE_POSTER_TYPES so we never persist an empty array
 * (the DB CHECK constraint requires ≥ 1 entry).
 */
function parseApplicablePosterTypes(formData: FormData): PosterType[] {
  const raw = formData.getAll('applicable_poster_types')
  const flat = raw
    .flatMap((v) => (typeof v === 'string' ? v.split(',') : []))
    .map((s) => s.trim())
    .filter((s) => (ALL_POSTER_TYPES as readonly string[]).includes(s)) as PosterType[]
  const unique = Array.from(new Set(flat))
  return unique.length > 0 ? unique : DEFAULT_APPLICABLE_POSTER_TYPES
}

export async function GET() {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: 'Forbidden' }, { status: auth.status })

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('custom_masks')
    .select('*')
    .order('display_order', { ascending: true })
    .order('created_at', { ascending: false })
    .limit(200)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ masks: data ?? [] })
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: 'Forbidden' }, { status: auth.status })

  const formData = await req.formData()
  const label = formData.get('label')
  const maskFile = formData.get('mask_svg')
  const frameFile = formData.get('frame_svg')
  const applicablePosterTypes = parseApplicablePosterTypes(formData)

  if (typeof label !== 'string' || !label.trim()) {
    return NextResponse.json({ error: 'Label fehlt' }, { status: 400 })
  }
  if (!(maskFile instanceof File)) {
    return NextResponse.json({ error: 'Masken-SVG fehlt' }, { status: 400 })
  }
  if (!maskFile.type.includes('svg')) {
    return NextResponse.json({ error: 'Masken-Datei muss SVG sein' }, { status: 400 })
  }

  const id = crypto.randomUUID()
  const mask_key = `custom-${id.slice(0, 8)}`
  const admin = createAdminClient()

  // Read + parse the SVG to extract pure shape data
  const svgText = await maskFile.text()
  const parsed = parseShapeSvg(svgText)
  if (!parsed) {
    return NextResponse.json({ error: 'SVG konnte nicht geparst werden (viewBox fehlt?)' }, { status: 400 })
  }

  // Upload original SVG as asset (for picker thumbnail)
  const maskPath = `${id}/mask.svg`
  const { error: maskErr } = await admin.storage
    .from(BUCKET)
    .upload(maskPath, new TextEncoder().encode(svgText), { contentType: 'image/svg+xml', upsert: false })
  if (maskErr) return NextResponse.json({ error: maskErr.message }, { status: 500 })
  const { data: maskUrlData } = admin.storage.from(BUCKET).getPublicUrl(maskPath)

  // Legacy frame SVG upload is ignored under the new composition model
  void frameFile

  const { data: row, error: insertErr } = await admin
    .from('custom_masks')
    .insert({
      mask_key,
      label: label.trim(),
      mask_svg_url: maskUrlData.publicUrl,
      shape_viewbox: parsed.viewBox,
      shape_markup: parsed.markup,
      applicable_poster_types: applicablePosterTypes,
    })
    .select()
    .single()

  if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 })
  return NextResponse.json({ mask: row })
}
