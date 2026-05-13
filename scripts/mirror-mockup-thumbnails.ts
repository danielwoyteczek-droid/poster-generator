#!/usr/bin/env tsx
/**
 * Mirror Dynamic-Mockups-Thumbnails into our own Supabase Storage so the
 * admin Mockup-Set list keeps working when DM's S3 bucket revokes hotlink
 * access (which it did on 2026-05-12 — all desktop_thumbnail_url returned
 * HTTP 403).
 *
 * Steps per run:
 *   1. listMockups() to get the current (fresh) thumbnail URL per template UUID
 *   2. For each mockup_set, look up new desktop + mobile thumbnails
 *   3. Download each thumbnail, upload to bucket `mockup-thumbnails`
 *   4. Update mockup_sets.{desktop,mobile}_thumbnail_url with the new public URL
 *
 * Usage:
 *   npx tsx scripts/mirror-mockup-thumbnails.ts          # apply
 *   npx tsx scripts/mirror-mockup-thumbnails.ts --dry    # print only
 */

import { config as loadEnv } from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import path from 'node:path'
import { listMockups } from '../src/lib/dynamic-mockups-client'

loadEnv({ path: path.resolve(process.cwd(), '.env.local') })

const DRY = process.argv.includes('--dry')
const BUCKET = 'mockup-thumbnails'

function need(name: string): string {
  const v = process.env[name]
  if (!v) throw new Error(`Missing env: ${name}`)
  return v
}

const supabase = createClient(
  need('NEXT_PUBLIC_SUPABASE_URL'),
  need('SUPABASE_SECRET_KEY'),
)

interface MockupSetRow {
  id: string
  name: string
  desktop_template_uuid: string
  mobile_template_uuid: string
  desktop_thumbnail_url: string | null
  mobile_thumbnail_url: string | null
}

async function ensureBucket() {
  const { data: buckets, error } = await supabase.storage.listBuckets()
  if (error) throw new Error(`listBuckets: ${error.message}`)
  if (buckets?.some((b) => b.name === BUCKET)) {
    console.log(`✓ Bucket "${BUCKET}" exists`)
    return
  }
  if (DRY) {
    console.log(`[dry] Would create bucket "${BUCKET}"`)
    return
  }
  const { error: createErr } = await supabase.storage.createBucket(BUCKET, { public: true })
  if (createErr) throw new Error(`createBucket: ${createErr.message}`)
  console.log(`✓ Bucket "${BUCKET}" created`)
}

async function mirrorOne(setRow: MockupSetRow, label: 'desktop' | 'mobile', sourceUrl: string): Promise<string | null> {
  const res = await fetch(sourceUrl)
  if (!res.ok) {
    console.warn(`  ✗ ${label}: source returned HTTP ${res.status} (${sourceUrl.slice(0, 80)}...)`)
    return null
  }
  const contentType = res.headers.get('content-type') ?? 'image/png'
  const ext = contentType.includes('jpeg') ? 'jpg' : contentType.includes('webp') ? 'webp' : 'png'
  const arrayBuffer = await res.arrayBuffer()
  const buf = Buffer.from(arrayBuffer)
  const objectPath = `${setRow.id}/${label}.${ext}`

  if (DRY) {
    console.log(`  [dry] ${label}: ${buf.length} bytes → ${BUCKET}/${objectPath}`)
    return null
  }

  const { error: upErr } = await supabase.storage
    .from(BUCKET)
    .upload(objectPath, buf, { contentType, upsert: true })
  if (upErr) {
    console.warn(`  ✗ ${label}: upload failed: ${upErr.message}`)
    return null
  }
  const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(objectPath)
  const url = `${pub.publicUrl}?v=${Date.now()}`
  console.log(`  ✓ ${label} mirrored → ${url.slice(0, 90)}...`)
  return url
}

async function main() {
  console.log(DRY ? '── DRY-RUN ──' : '── APPLY ──')

  await ensureBucket()

  console.log('\nFetching mockup_sets...')
  const { data: sets, error: selErr } = await supabase
    .from('mockup_sets')
    .select('id, name, desktop_template_uuid, mobile_template_uuid, desktop_thumbnail_url, mobile_thumbnail_url')
    .order('name')
  if (selErr) throw new Error(`SELECT mockup_sets: ${selErr.message}`)
  console.log(`  → ${sets?.length ?? 0} sets`)

  console.log('\nFetching Dynamic-Mockups listing...')
  const dmList = await listMockups()
  console.log(`  → ${dmList.length} DM templates`)
  const uuidToThumb = new Map<string, string>()
  for (const m of dmList) {
    if (m.thumbnail) uuidToThumb.set(m.uuid, m.thumbnail)
  }

  let mirrored = 0
  let missing = 0
  for (const s of (sets ?? []) as MockupSetRow[]) {
    console.log(`\n[${s.name}] (${s.id})`)

    const updates: Record<string, string | null> = {}

    const deskSrc = uuidToThumb.get(s.desktop_template_uuid)
    if (!deskSrc) {
      console.warn(`  ✗ desktop: DM has no thumbnail for template ${s.desktop_template_uuid}`)
      missing++
    } else {
      const newUrl = await mirrorOne(s, 'desktop', deskSrc)
      if (newUrl) updates.desktop_thumbnail_url = newUrl
    }

    const mobSrc = uuidToThumb.get(s.mobile_template_uuid)
    if (!mobSrc) {
      console.warn(`  ✗ mobile: DM has no thumbnail for template ${s.mobile_template_uuid}`)
      missing++
    } else {
      const newUrl = await mirrorOne(s, 'mobile', mobSrc)
      if (newUrl) updates.mobile_thumbnail_url = newUrl
    }

    if (Object.keys(updates).length > 0) {
      if (DRY) {
        console.log(`  [dry] would UPDATE mockup_sets:`, updates)
      } else {
        const { error: upErr } = await supabase.from('mockup_sets').update(updates).eq('id', s.id)
        if (upErr) console.warn(`  ✗ DB update failed: ${upErr.message}`)
        else {
          mirrored++
          console.log(`  ✓ DB row updated`)
        }
      }
    }
  }

  console.log(`\n── Done — ${mirrored} sets mirrored, ${missing} thumbnails missing from DM listing ──`)
}

main().catch((err) => {
  console.error('Fatal:', err instanceof Error ? err.message : err)
  process.exit(1)
})
