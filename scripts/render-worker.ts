/**
 * PROJ-30 Phase 4: Render-Worker.
 *
 * Pollt Supabase nach Presets mit `render_status = 'pending'`, rendert pro
 * Preset einen nackten Poster-PNG via Headless-Editor (Playwright), schickt
 * den Poster-PNG-URL an Dynamic Mockups, lädt das fertige Composite zurück
 * und speichert es in Supabase Storage als `preset_renders`-Eintrag.
 *
 * Aufruf:
 *   npm run render-worker
 *
 * Voraussetzungen:
 *   - .env.local mit DYNAMIC_MOCKUPS_API_KEY, RENDER_HEADLESS_TOKEN,
 *     SUPABASE_*, APP_BASE_URL
 *   - Dev-Server läuft (oder APP_BASE_URL zeigt auf eine Staging-Instanz)
 *   - SQL-Migration aus Phase 1 ist ausgeführt
 *   - Supabase-Storage-Bucket `preset-renders` existiert (public)
 *   - Mind. ein Mockup-Set in der DB (kann manuell per SQL gesetzt werden)
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { chromium, type Browser, type BrowserContext } from 'playwright'
import { config as loadEnv } from 'dotenv'
import crypto from 'node:crypto'
import { renderMockup, fetchCompositeBuffer, DynamicMockupsApiError } from '../src/lib/dynamic-mockups-client'

loadEnv({ path: '.env.local' })

// ─── Config ────────────────────────────────────────────────────────────────

// GitHub Actions ersetzt fehlende Secrets durch Empty-String. `??` greift
// nur bei undefined/null — daher Empty-String explizit als "fehlt" behandeln.
function envOr<T>(name: string, fallback: T): string | T {
  const v = process.env[name]
  return v && v.length > 0 ? v : fallback
}

const APP_BASE_URL = envOr('APP_BASE_URL', 'http://localhost:3000')
const HEADLESS_TOKEN = envOr('RENDER_HEADLESS_TOKEN', undefined)
const SUPABASE_URL = envOr('NEXT_PUBLIC_SUPABASE_URL', undefined)
const SUPABASE_KEY = envOr('SUPABASE_SECRET_KEY', undefined)
const POLL_INTERVAL_MS = Number.parseInt(envOr('RENDER_POLL_INTERVAL_MS', '5000'), 10)
// Drain-Mode (für GitHub Actions): Worker beendet sich, wenn 2 Polls in
// Folge nichts zu tun fanden. Lokal (Default) bleibt der Worker am Leben
// und pollt unbegrenzt.
const DRAIN_MODE = process.env.RENDER_WORKER_DRAIN === '1'
const DRAIN_EMPTY_THRESHOLD = 2
const READY_TIMEOUT_MS = 60_000
const RENDER_TIMEOUT_MS = 60_000
const DEFAULT_LOCALE = 'de'
const STORAGE_BUCKET = 'preset-renders'

const WORKER_ID = crypto.randomUUID()
const WORKER_SHORT_ID = WORKER_ID.slice(0, 8)

/** Fallback-Location, wenn Preset keinen marker.lat/lng hat. Berlin. */
const FALLBACK_LOCATION = {
  lat: 52.5200,
  lng: 13.4050,
  zoom: 12,
  name: 'Berlin',
}

// ─── Types ─────────────────────────────────────────────────────────────────

interface PresetConfigJson {
  marker?: { lat?: number | null; lng?: number | null }
  zoom?: number
  [key: string]: unknown
}

interface PresetRow {
  id: string
  name: string
  poster_type: 'map' | 'star-map'
  config_json: PresetConfigJson | null
  mockup_set_ids: string[] | null
  preview_image_url: string | null
}

interface MockupSetRow {
  id: string
  slug: string
  name: string
  desktop_template_uuid: string
  desktop_smart_object_uuid: string
  desktop_slot_uuids: string[]
  mobile_template_uuid: string
  mobile_smart_object_uuid: string
  mobile_slot_uuids: string[]
  is_active: boolean
}

interface CompositionRow {
  id: string
  name: string
  mockup_set_id: string
  slot_preset_ids: string[]
}

type Variant = 'desktop' | 'mobile'

// ─── Helpers ───────────────────────────────────────────────────────────────

function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms))
}

function log(msg: string) {
  const ts = new Date().toISOString().slice(11, 19)
  console.log(`[${ts}][${WORKER_SHORT_ID}] ${msg}`)
}

function logErr(msg: string) {
  const ts = new Date().toISOString().slice(11, 19)
  console.error(`[${ts}][${WORKER_SHORT_ID}] ${msg}`)
}

function resolveLocation(preset: PresetRow) {
  const marker = preset.config_json?.marker
  if (marker?.lat != null && marker?.lng != null) {
    return {
      lat: marker.lat,
      lng: marker.lng,
      zoom: typeof preset.config_json?.zoom === 'number' ? preset.config_json.zoom : FALLBACK_LOCATION.zoom,
      name: '',
    }
  }
  return FALLBACK_LOCATION
}

// ─── Atomic Claim ──────────────────────────────────────────────────────────

async function claimNextPreset(supabase: SupabaseClient): Promise<PresetRow | null> {
  // Step 1: find a pending row (read-only)
  const { data: candidates, error: selErr } = await supabase
    .from('presets')
    .select('id, name, poster_type, config_json, mockup_set_ids, preview_image_url')
    .eq('render_status', 'pending')
    .order('created_at')
    .limit(1)

  if (selErr) {
    logErr(`SELECT pending failed: ${selErr.message}`)
    return null
  }
  if (!candidates || candidates.length === 0) return null

  const candidate = candidates[0]

  // Step 2: claim atomically via UPDATE with WHERE status='pending'.
  // Wenn ein anderer Worker bereits geclaimt hat, ist render_status nicht
  // mehr 'pending' und das Update liefert keine Row zurück.
  const { data: claimed, error: updErr } = await supabase
    .from('presets')
    .update({
      render_status: 'rendering',
      render_started_at: new Date().toISOString(),
      render_worker_id: WORKER_ID,
      render_error: null,
    })
    .eq('id', candidate.id)
    .eq('render_status', 'pending')
    .select('id, name, poster_type, config_json, mockup_set_ids, preview_image_url')
    .single()

  if (updErr || !claimed) return null
  return claimed as PresetRow
}

async function markDone(supabase: SupabaseClient, presetId: string) {
  // preview_image_url bleibt das nackte Poster (vom SaveAsPresetButton),
  // damit der Admin Presets in der Liste anhand des Designs erkennt.
  // Mockup-Composites sind separat in preset_renders verfügbar (Lightbox).
  const { error } = await supabase.from('presets').update({
    render_status: 'done',
    render_completed_at: new Date().toISOString(),
    render_error: null,
  }).eq('id', presetId)
  if (error) logErr(`markDone failed: ${error.message}`)
}

async function markFailed(supabase: SupabaseClient, presetId: string, message: string) {
  const { error } = await supabase
    .from('presets')
    .update({
      render_status: 'failed',
      render_completed_at: new Date().toISOString(),
      render_error: message.slice(0, 1000),
    })
    .eq('id', presetId)
  if (error) logErr(`markFailed failed: ${error.message}`)
}

// ─── Compositions ──────────────────────────────────────────────────────────

async function claimNextComposition(supabase: SupabaseClient): Promise<CompositionRow | null> {
  const { data: candidates } = await supabase
    .from('mockup_compositions')
    .select('id, name, mockup_set_id, slot_preset_ids')
    .eq('render_status', 'pending')
    .order('created_at')
    .limit(1)

  if (!candidates || candidates.length === 0) return null
  const candidate = candidates[0]

  const { data: claimed } = await supabase
    .from('mockup_compositions')
    .update({
      render_status: 'rendering',
      render_started_at: new Date().toISOString(),
      render_worker_id: WORKER_ID,
      render_error: null,
    })
    .eq('id', candidate.id)
    .eq('render_status', 'pending')
    .select('id, name, mockup_set_id, slot_preset_ids')
    .single()

  return (claimed as CompositionRow | null) ?? null
}

async function markCompositionDone(supabase: SupabaseClient, id: string, desktopUrl: string, mobileUrl: string) {
  const { error } = await supabase.from('mockup_compositions').update({
    render_status: 'done',
    render_completed_at: new Date().toISOString(),
    render_error: null,
    desktop_image_url: desktopUrl,
    mobile_image_url: mobileUrl,
  }).eq('id', id)
  if (error) logErr(`markCompositionDone failed: ${error.message}`)
}

async function markCompositionFailed(supabase: SupabaseClient, id: string, msg: string) {
  const { error } = await supabase.from('mockup_compositions').update({
    render_status: 'failed',
    render_completed_at: new Date().toISOString(),
    render_error: msg.slice(0, 1000),
  }).eq('id', id)
  if (error) logErr(`markCompositionFailed failed: ${error.message}`)
}

// ─── Headless-Editor-Render ────────────────────────────────────────────────

async function renderPosterPng(
  context: BrowserContext,
  preset: PresetRow,
): Promise<Buffer> {
  const editorPath = preset.poster_type === 'star-map' ? 'star-map' : 'map'
  const loc = resolveLocation(preset)

  const params = new URLSearchParams({
    preset: preset.id,
    headless: '1',
    lat: String(loc.lat),
    lng: String(loc.lng),
  })
  if (loc.name) params.set('location_name', loc.name)
  if (loc.zoom) params.set('zoom', String(loc.zoom))

  const url = `${APP_BASE_URL}/${DEFAULT_LOCALE}/${editorPath}?${params.toString()}`
  log(`  → headless render: ${url}`)

  const page = await context.newPage()
  try {
    const resp = await page.goto(url, { waitUntil: 'load', timeout: READY_TIMEOUT_MS })
    if (!resp || !resp.ok()) {
      throw new Error(`Headless-Editor-Page HTTP ${resp?.status()}`)
    }

    await page.waitForFunction(() => window.__posterReady === true, undefined, {
      timeout: READY_TIMEOUT_MS,
    })

    const dataUrl = await Promise.race([
      page.evaluate(async (): Promise<string> => {
        const fn = (window as unknown as { __renderPosterPng?: (opts?: { format?: string }) => Promise<string> }).__renderPosterPng
        if (typeof fn !== 'function') throw new Error('window.__renderPosterPng fehlt')
        return await fn({ format: 'a4' })
      }),
      new Promise<string>((_, rej) =>
        setTimeout(() => rej(new Error(`Headless-Render-Timeout ${RENDER_TIMEOUT_MS}ms`)), RENDER_TIMEOUT_MS),
      ),
    ])

    const base64 = dataUrl.replace(/^data:image\/png;base64,/, '')
    return Buffer.from(base64, 'base64')
  } finally {
    await page.close()
  }
}

// ─── Mockup-Compositing via Dynamic Mockups ────────────────────────────────

const MOBILE_TARGET_RATIO_W = 2
const MOBILE_TARGET_RATIO_H = 3

/**
 * Center-crops a buffer to a target aspect ratio (e.g. 2:3 for mobile).
 * Wenn Source bereits exakt die Target-Ratio hat, wird unverändert
 * zurückgegeben.
 */
async function cropToAspect(
  source: Buffer,
  targetW: number,
  targetH: number,
): Promise<{ buffer: Buffer; width: number; height: number }> {
  const sharp = (await import('sharp')).default
  const img = sharp(source)
  const metadata = await img.metadata()
  const srcW = metadata.width ?? 0
  const srcH = metadata.height ?? 0
  if (srcW === 0 || srcH === 0) throw new Error('Source-Image hat keine Dimensionen')

  const targetRatio = targetW / targetH
  const srcRatio = srcW / srcH

  let cropW = srcW
  let cropH = srcH
  let left = 0
  let top = 0

  if (Math.abs(srcRatio - targetRatio) < 0.001) {
    // Bereits passend
    return { buffer: source, width: srcW, height: srcH }
  } else if (srcRatio > targetRatio) {
    // Source breiter als Target → horizontal beschneiden
    cropW = Math.floor(srcH * targetRatio)
    left = Math.floor((srcW - cropW) / 2)
  } else {
    // Source schmaler als Target → vertikal beschneiden
    cropH = Math.floor(srcW / targetRatio)
    top = Math.floor((srcH - cropH) / 2)
  }

  const buffer = await img.extract({ left, top, width: cropW, height: cropH }).png().toBuffer()
  return { buffer, width: cropW, height: cropH }
}

/**
 * Rendert das Mockup-Composite via Dynamic Mockups EINMAL (Desktop) und
 * leitet daraus die Mobile-Variante per Center-Crop zu 2:3 ab.
 * Spart 50% DM-Credits gegenüber zwei separaten API-Calls.
 *
 * Returns: ein Map von variant → { imageUrl, width, height }
 */
async function compositeViaMockup(
  supabase: SupabaseClient,
  preset: PresetRow,
  mockupSet: MockupSetRow,
  posterBuffer: Buffer,
  jobUuid: string,
): Promise<Record<Variant, { imageUrl: string; width: number; height: number }>> {
  // 1. Poster-PNG temporär nach Storage hochladen (1x für beide Varianten)
  const tempPath = `_temp/${jobUuid}/poster.png`
  const { error: tempErr } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(tempPath, posterBuffer, {
      contentType: 'image/png',
      upsert: true,
    })
  if (tempErr) throw new Error(`Temp-Upload: ${tempErr.message}`)

  const { data: tempUrlData } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(tempPath)
  const posterUrl = tempUrlData.publicUrl

  // 2. Dynamic Mockups Render-Call (Desktop = native PSD-Aspect)
  log(`  → DM-Render (template=${mockupSet.desktop_template_uuid.slice(0, 8)})`)
  const { exportPath } = await renderMockup({
    templateUuid: mockupSet.desktop_template_uuid,
    smartObjectUuid: mockupSet.desktop_smart_object_uuid,
    assetUrl: posterUrl,
  })

  // 3. Composite herunterladen
  const desktopBuffer = await fetchCompositeBuffer(exportPath)

  // 4. Desktop-Variante hochladen (Original-PSD-Aspect, kein Crop)
  const desktopPath = `${preset.id}/${mockupSet.id}/desktop.png`
  const { error: deskErr } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(desktopPath, desktopBuffer, { contentType: 'image/png', upsert: true })
  if (deskErr) throw new Error(`Desktop-Upload: ${deskErr.message}`)

  const desktopMeta = await (await import('sharp')).default(desktopBuffer).metadata()
  const desktopUrl = `${supabase.storage.from(STORAGE_BUCKET).getPublicUrl(desktopPath).data.publicUrl}?v=${Date.now()}`

  // 5. Mobile-Variante: 2:3-Center-Crop des Desktop-Composites
  log(`  → mobile crop ${MOBILE_TARGET_RATIO_W}:${MOBILE_TARGET_RATIO_H}`)
  const mobileCrop = await cropToAspect(desktopBuffer, MOBILE_TARGET_RATIO_W, MOBILE_TARGET_RATIO_H)
  const mobilePath = `${preset.id}/${mockupSet.id}/mobile.png`
  const { error: mobErr } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(mobilePath, mobileCrop.buffer, { contentType: 'image/png', upsert: true })
  if (mobErr) throw new Error(`Mobile-Upload: ${mobErr.message}`)
  const mobileUrl = `${supabase.storage.from(STORAGE_BUCKET).getPublicUrl(mobilePath).data.publicUrl}?v=${Date.now()}`

  return {
    desktop: { imageUrl: desktopUrl, width: desktopMeta.width ?? 0, height: desktopMeta.height ?? 0 },
    mobile: { imageUrl: mobileUrl, width: mobileCrop.width, height: mobileCrop.height },
  }
}

// ─── DB-Updates für preset_renders ─────────────────────────────────────────

async function upsertPresetRender(
  supabase: SupabaseClient,
  presetId: string,
  mockupSetId: string,
  variant: Variant,
  imageUrl: string,
  width: number,
  height: number,
  inputsHash: string,
) {
  // UPSERT auf der Unique-Constraint (preset_id, mockup_set_id, variant)
  const { error } = await supabase.from('preset_renders').upsert(
    {
      preset_id: presetId,
      mockup_set_id: mockupSetId,
      variant,
      image_url: imageUrl,
      image_width: width,
      image_height: height,
      inputs_hash: inputsHash,
      rendered_at: new Date().toISOString(),
    },
    { onConflict: 'preset_id,mockup_set_id,variant' },
  )
  if (error) throw new Error(`preset_renders upsert: ${error.message}`)
}

// ─── End-to-End-Render pro Preset ──────────────────────────────────────────

async function renderPresetEnd2End(
  supabase: SupabaseClient,
  context: BrowserContext,
  preset: PresetRow,
) {
  const jobUuid = crypto.randomUUID()
  const mockupSetIds = preset.mockup_set_ids ?? []

  // 1. Poster-PNG einmal rendern
  log(`Rendering "${preset.name}" (${mockupSetIds.length} mockup-set(s)) ...`)
  const posterBuffer = await renderPosterPng(context, preset)
  log(`  → poster ${(posterBuffer.length / 1024).toFixed(0)} KB`)

  if (mockupSetIds.length === 0) {
    // Fallback: nackten Poster ohne Mockup speichern, damit nicht alles fehlt
    const fallbackPath = `${preset.id}/_naked/desktop.png`
    const { error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(fallbackPath, posterBuffer, { contentType: 'image/png', upsert: true })
    if (error) throw new Error(`Fallback-Upload: ${error.message}`)
    const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(fallbackPath)
    log(`  → fallback (kein Mockup-Set): ${data.publicUrl}`)
    await markDone(supabase, preset.id)
    return
  }

  // 2. Mockup-Sets nachladen
  const { data: mockupSets, error: msErr } = await supabase
    .from('mockup_sets')
    .select('id, slug, name, desktop_template_uuid, desktop_smart_object_uuid, mobile_template_uuid, mobile_smart_object_uuid, is_active')
    .in('id', mockupSetIds)

  if (msErr) throw new Error(`mockup_sets fetch: ${msErr.message}`)
  if (!mockupSets || mockupSets.length === 0) {
    throw new Error(`Keine mockup_sets mit IDs: ${mockupSetIds.join(', ')}`)
  }

  // Inputs-Hash (vereinfacht für V1 — preset.config_json + mockup-set ids)
  const inputsHash = crypto
    .createHash('sha256')
    .update(JSON.stringify({ config: preset.config_json, mockupSetIds }))
    .digest('hex')

  // 3. Pro Mockup-Set rendern (1 DM-Call → desktop native, mobile = 2:3-Crop)
  for (const mockupSet of mockupSets as MockupSetRow[]) {
    if (!mockupSet.is_active) {
      log(`  skip inactive mockup-set "${mockupSet.name}"`)
      continue
    }
    log(`  ⟶ ${mockupSet.name}`)
    const variants = await compositeViaMockup(
      supabase,
      preset,
      mockupSet,
      posterBuffer,
      jobUuid,
    )
    for (const variant of ['desktop', 'mobile'] as Variant[]) {
      const v = variants[variant]
      await upsertPresetRender(
        supabase,
        preset.id,
        mockupSet.id,
        variant,
        v.imageUrl,
        v.width,
        v.height,
        inputsHash,
      )
    }
  }

  // 4. Cleanup: temp poster löschen (best-effort)
  await supabase.storage.from(STORAGE_BUCKET).remove([
    `_temp/${jobUuid}/poster.png`,
  ]).then(() => {}).catch(() => {})

  await markDone(supabase, preset.id)
}

// ─── Composition-Rendering ─────────────────────────────────────────────────

async function renderCompositionEnd2End(
  supabase: SupabaseClient,
  context: BrowserContext,
  composition: CompositionRow,
) {
  const { renderMockup, fetchCompositeBuffer } = await import('../src/lib/dynamic-mockups-client')

  log(`Rendering composition "${composition.name}" (${composition.slot_preset_ids.length} slots)`)

  // 1. Mockup-Set + slot-presets laden
  const { data: mockupSet, error: msErr } = await supabase
    .from('mockup_sets')
    .select('id, name, desktop_template_uuid, desktop_slot_uuids, mobile_template_uuid, mobile_slot_uuids')
    .eq('id', composition.mockup_set_id)
    .single()
  if (msErr || !mockupSet) throw new Error(`Mockup-Set ${composition.mockup_set_id} nicht gefunden`)

  const { data: slotPresets, error: prErr } = await supabase
    .from('presets')
    .select('id, name, poster_type, config_json, preview_image_url, mockup_set_ids')
    .in('id', composition.slot_preset_ids)
  if (prErr) throw new Error(`Slot-Presets fetch: ${prErr.message}`)

  // Map for ordered access
  const presetMap = Object.fromEntries((slotPresets ?? []).map((p) => [p.id, p as PresetRow]))
  const orderedPresets = composition.slot_preset_ids.map((id) => {
    const p = presetMap[id]
    if (!p) throw new Error(`Slot-Preset ${id} nicht gefunden`)
    return p
  })

  // 2. Pro Slot-Preset Headless-Render (nackter Poster) und Upload
  const jobUuid = crypto.randomUUID()
  const tempPosterUrls: string[] = []
  for (let i = 0; i < orderedPresets.length; i++) {
    const preset = orderedPresets[i]
    log(`  → Slot ${i + 1}: rendering "${preset.name}"`)
    const posterBuffer = await renderPosterPng(context, preset)
    const tempPath = `_temp/${jobUuid}/slot-${i}.png`
    const { error } = await supabase.storage.from(STORAGE_BUCKET).upload(tempPath, posterBuffer, {
      contentType: 'image/png', upsert: true,
    })
    if (error) throw new Error(`Slot ${i} temp upload: ${error.message}`)
    const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(tempPath)
    tempPosterUrls.push(data.publicUrl)
  }

  // 3. DM-Render (1 Call, multi-slot) → Desktop native, Mobile = 2:3-Crop
  const results: Record<'desktop' | 'mobile', string> = { desktop: '', mobile: '' }
  const templateUuid = mockupSet.desktop_template_uuid
  const slotUuids = (mockupSet.desktop_slot_uuids ?? []) as string[]
  if (slotUuids.length !== tempPosterUrls.length) {
    throw new Error(`Slot-Anzahl-Mismatch: ${slotUuids.length} Slots, ${tempPosterUrls.length} Presets`)
  }

  log(`  ⟶ DM-Render mit ${slotUuids.length} Smart-Objects`)
  const { exportPath } = await renderMockup({
    templateUuid,
    smartObjects: slotUuids.map((soUuid, idx) => ({
      smartObjectUuid: soUuid,
      assetUrl: tempPosterUrls[idx],
    })),
  })
  const compositeBuffer = await fetchCompositeBuffer(exportPath)

  // Desktop = native PSD-Aspect
  const desktopPath = `compositions/${composition.id}/desktop.png`
  const { error: deskErr } = await supabase.storage.from(STORAGE_BUCKET).upload(desktopPath, compositeBuffer, {
    contentType: 'image/png', upsert: true,
  })
  if (deskErr) throw new Error(`Composition desktop upload: ${deskErr.message}`)
  results.desktop = `${supabase.storage.from(STORAGE_BUCKET).getPublicUrl(desktopPath).data.publicUrl}?v=${Date.now()}`

  // Mobile = 2:3 Center-Crop
  log(`  → mobile crop 2:3`)
  const mobileCrop = await cropToAspect(compositeBuffer, MOBILE_TARGET_RATIO_W, MOBILE_TARGET_RATIO_H)
  const mobilePath = `compositions/${composition.id}/mobile.png`
  const { error: mobErr } = await supabase.storage.from(STORAGE_BUCKET).upload(mobilePath, mobileCrop.buffer, {
    contentType: 'image/png', upsert: true,
  })
  if (mobErr) throw new Error(`Composition mobile upload: ${mobErr.message}`)
  results.mobile = `${supabase.storage.from(STORAGE_BUCKET).getPublicUrl(mobilePath).data.publicUrl}?v=${Date.now()}`

  // 4. Cleanup temp posters
  await supabase.storage.from(STORAGE_BUCKET).remove(
    tempPosterUrls.map((_, i) => `_temp/${jobUuid}/slot-${i}.png`),
  ).then(() => {}).catch(() => {})

  await markCompositionDone(supabase, composition.id, results.desktop, results.mobile)
}

// ─── Main-Loop ─────────────────────────────────────────────────────────────

async function main() {
  if (!HEADLESS_TOKEN || !SUPABASE_URL || !SUPABASE_KEY) {
    console.error('Fehlende Env-Vars: RENDER_HEADLESS_TOKEN, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY')
    process.exit(1)
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  log(`Worker started — poll=${POLL_INTERVAL_MS}ms, app=${APP_BASE_URL}`)

  let browser: Browser | undefined
  let context: BrowserContext | undefined
  try {
    browser = await chromium.launch({ headless: true })
    context = await browser.newContext({ viewport: { width: 1280, height: 1600 } })

    const appOrigin = new URL(APP_BASE_URL).origin
    await context.route('**/*', async (route) => {
      const reqUrl = new URL(route.request().url())
      if (reqUrl.origin === appOrigin) {
        await route.continue({
          headers: { ...route.request().headers(), 'x-render-token': HEADLESS_TOKEN },
        })
      } else {
        await route.continue()
      }
    })

    let running = true
    let consecutiveEmptyPolls = 0
    process.on('SIGINT', () => { log('SIGINT — graceful shutdown'); running = false })
    process.on('SIGTERM', () => { log('SIGTERM — graceful shutdown'); running = false })

    if (DRAIN_MODE) log(`Drain-Mode aktiv — Exit nach ${DRAIN_EMPTY_THRESHOLD} leeren Polls`)

    while (running) {
      // 1. Erst Presets versuchen
      let claimedPreset: PresetRow | null = null
      try {
        claimedPreset = await claimNextPreset(supabase)
      } catch (err) {
        logErr(`Preset-Claim error: ${err instanceof Error ? err.message : err}`)
      }

      if (claimedPreset) {
        consecutiveEmptyPolls = 0
        const t0 = Date.now()
        try {
          await renderPresetEnd2End(supabase, context, claimedPreset)
          log(`✓ "${claimedPreset.name}" fertig in ${((Date.now() - t0) / 1000).toFixed(1)}s`)
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err)
          if (err instanceof DynamicMockupsApiError) {
            await markFailed(supabase, claimedPreset.id, `Dynamic Mockups: ${msg}`)
          } else {
            await markFailed(supabase, claimedPreset.id, msg)
          }
          logErr(`✗ "${claimedPreset.name}": ${msg}`)
        }
        continue
      }

      // 2. Dann Compositions versuchen
      let claimedComp: CompositionRow | null = null
      try {
        claimedComp = await claimNextComposition(supabase)
      } catch (err) {
        logErr(`Composition-Claim error: ${err instanceof Error ? err.message : err}`)
      }

      if (claimedComp) {
        consecutiveEmptyPolls = 0
        const t0 = Date.now()
        try {
          await renderCompositionEnd2End(supabase, context, claimedComp)
          log(`✓ Composition "${claimedComp.name}" fertig in ${((Date.now() - t0) / 1000).toFixed(1)}s`)
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err)
          if (err instanceof DynamicMockupsApiError) {
            await markCompositionFailed(supabase, claimedComp.id, `Dynamic Mockups: ${msg}`)
          } else {
            await markCompositionFailed(supabase, claimedComp.id, msg)
          }
          logErr(`✗ Composition "${claimedComp.name}": ${msg}`)
        }
        continue
      }

      // Nichts da
      consecutiveEmptyPolls++
      if (DRAIN_MODE && consecutiveEmptyPolls >= DRAIN_EMPTY_THRESHOLD) {
        log(`Queue leer (${consecutiveEmptyPolls} leere Polls) — Drain-Mode beendet`)
        running = false
        break
      }
      await sleep(POLL_INTERVAL_MS)
    }
  } finally {
    if (context) await context.close().catch(() => {})
    if (browser) await browser.close().catch(() => {})
    log('Shutdown complete')
  }
}

main().catch((err) => {
  console.error('[render-worker] Fatal:', err)
  process.exit(1)
})
