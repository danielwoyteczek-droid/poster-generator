/**
 * Regeneriert preview_image_url aller published Presets via Headless-Render.
 *
 * Nutzt dieselbe Pipeline wie test-headless-render: Playwright öffnet
 * den Editor im Headless-Mode, ruft window.__renderPosterPng() auf,
 * lädt das resultierende PNG nach Supabase-Storage hoch (Bucket
 * `preset-previews`) und aktualisiert preview_image_url in der DB.
 *
 * Voraussetzungen:
 *  - Dev-Server läuft (`npm run dev`)
 *  - .env.local enthält RENDER_HEADLESS_TOKEN, SUPABASE_*, APP_BASE_URL
 *  - Playwright + Chromium installiert
 *  - Supabase-Storage-Bucket `preset-previews` existiert (public)
 *
 * Aufruf:
 *   npm run regen-thumbnails              → alle published Presets
 *   npm run regen-thumbnails -- <id>      → nur ein bestimmtes Preset
 */

import { createClient } from '@supabase/supabase-js'
import { chromium, type Browser, type BrowserContext } from 'playwright'
import { config as loadEnv } from 'dotenv'

loadEnv({ path: '.env.local' })

const APP_BASE_URL = process.env.APP_BASE_URL ?? 'http://localhost:3000'
const HEADLESS_TOKEN = process.env.RENDER_HEADLESS_TOKEN
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SECRET_KEY
const DEFAULT_LOCALE = 'de'
const READY_TIMEOUT_MS = 60_000
const RENDER_TIMEOUT_MS = 120_000
const STORAGE_BUCKET = 'preset-previews'

interface PresetRow {
  id: string
  name: string
  poster_type: 'map' | 'star-map'
  status: string
}

async function main() {
  if (!HEADLESS_TOKEN || !SUPABASE_URL || !SUPABASE_KEY) {
    console.error('Fehlende Env-Vars. Benötigt: RENDER_HEADLESS_TOKEN, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY')
    process.exit(1)
  }

  const filterId = process.argv[2]

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  let query = supabase
    .from('presets')
    .select('id, name, poster_type, status')
    .eq('status', 'published')
    .order('name')

  if (filterId) {
    query = query.eq('id', filterId)
  }

  const { data: presets, error } = await query
  if (error) {
    console.error('Supabase-Query fehlgeschlagen:', error.message)
    process.exit(1)
  }
  if (!presets || presets.length === 0) {
    console.log('Keine published Presets gefunden.')
    return
  }

  console.log(`[regen] ${presets.length} Preset(s) zu rendern...`)

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

    let success = 0
    let failed = 0

    for (const preset of presets as PresetRow[]) {
      const idx = success + failed + 1
      const t0 = Date.now()
      try {
        const editorPath = preset.poster_type === 'star-map' ? 'star-map' : 'map'
        const url = `${APP_BASE_URL}/${DEFAULT_LOCALE}/${editorPath}?preset=${preset.id}&headless=1`

        process.stdout.write(`[${idx}/${presets.length}] "${preset.name}" (${preset.poster_type})... `)

        const page = await context.newPage()
        try {
          const response = await page.goto(url, { waitUntil: 'load', timeout: READY_TIMEOUT_MS })
          if (!response || !response.ok()) {
            throw new Error(`HTTP ${response?.status()}`)
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
              setTimeout(() => rej(new Error(`Render-Timeout ${RENDER_TIMEOUT_MS}ms`)), RENDER_TIMEOUT_MS),
            ),
          ])

          const base64 = dataUrl.replace(/^data:image\/png;base64,/, '')
          const buffer = Buffer.from(base64, 'base64')

          const path = `${preset.id}.png`
          const { error: uploadErr } = await supabase.storage
            .from(STORAGE_BUCKET)
            .upload(path, buffer, {
              contentType: 'image/png',
              upsert: true,
            })
          if (uploadErr) throw new Error(`Storage-Upload: ${uploadErr.message}`)

          const { data: urlData } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path)
          const cacheBustedUrl = `${urlData.publicUrl}?v=${Date.now()}`

          const { error: updateErr } = await supabase
            .from('presets')
            .update({ preview_image_url: cacheBustedUrl })
            .eq('id', preset.id)
          if (updateErr) throw new Error(`DB-Update: ${updateErr.message}`)

          const sizeKb = (buffer.length / 1024).toFixed(0)
          const dur = ((Date.now() - t0) / 1000).toFixed(1)
          console.log(`✓ ${sizeKb} KB in ${dur}s`)
          success++
        } finally {
          await page.close()
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        console.log(`✗ ${msg}`)
        failed++
      }
    }

    console.log(`\n[regen] Fertig — ${success} OK, ${failed} fehlgeschlagen.`)
  } finally {
    if (context) await context.close()
    if (browser) await browser.close()
  }
}

main().catch((err) => {
  console.error('[regen] Fatal:', err)
  process.exit(1)
})
