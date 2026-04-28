/**
 * Smoke-Test für PROJ-30 Phase 2: Editor-Headless-Modus.
 *
 * Startet einen Playwright-Chromium, öffnet einen Editor-Preset im
 * Headless-Modus und schreibt das gerenderte PNG in `tmp/headless-test.png`.
 *
 * Voraussetzungen:
 *  - Dev-Server läuft (`npm run dev`)
 *  - .env.local enthält RENDER_HEADLESS_TOKEN
 *  - Mindestens ein publishtes Preset existiert in Supabase
 *  - Playwright + Chromium installiert (`npx playwright install chromium`)
 *
 * Aufruf:
 *   npx tsx scripts/test-headless-render.ts <preset-id> [poster-type]
 *
 *   <preset-id>     UUID des Presets, gegen das gerendert werden soll
 *   [poster-type]   'map' (Default) oder 'star-map'
 */

import { chromium, type Browser } from 'playwright'
import { writeFile, mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { config as loadEnv } from 'dotenv'

loadEnv({ path: '.env.local' })

const APP_BASE_URL = process.env.APP_BASE_URL ?? 'http://localhost:3000'
const HEADLESS_TOKEN = process.env.RENDER_HEADLESS_TOKEN
const DEFAULT_LOCALE = 'de'
const READY_TIMEOUT_MS = 60_000
const RENDER_TIMEOUT_MS = 60_000

async function main() {
  const [, , presetIdArg, posterTypeArg] = process.argv
  if (!presetIdArg) {
    console.error('Usage: npx tsx scripts/test-headless-render.ts <preset-id> [map|star-map]')
    console.error('Optional location override via env vars: TEST_LAT, TEST_LNG, TEST_ZOOM, TEST_LOCATION_NAME')
    process.exit(1)
  }
  if (!HEADLESS_TOKEN) {
    console.error('RENDER_HEADLESS_TOKEN ist nicht gesetzt. Bitte in .env.local hinterlegen.')
    process.exit(1)
  }
  const posterType: 'map' | 'star-map' = posterTypeArg === 'star-map' ? 'star-map' : 'map'
  const editorPath = posterType === 'star-map' ? 'star-map' : 'map'
  const params = new URLSearchParams()
  params.set('preset', presetIdArg)
  params.set('headless', '1')
  if (process.env.TEST_LAT) params.set('lat', process.env.TEST_LAT)
  if (process.env.TEST_LNG) params.set('lng', process.env.TEST_LNG)
  if (process.env.TEST_ZOOM) params.set('zoom', process.env.TEST_ZOOM)
  if (process.env.TEST_LOCATION_NAME) params.set('location_name', process.env.TEST_LOCATION_NAME)
  const url = `${APP_BASE_URL}/${DEFAULT_LOCALE}/${editorPath}?${params.toString()}`

  console.log(`[test-headless-render] URL: ${url}`)
  console.log(`[test-headless-render] Poster-Type: ${posterType}`)

  let browser: Browser | undefined
  try {
    browser = await chromium.launch({ headless: true })
    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
    })

    // Token nur an unsere App-Origin senden, NICHT an Drittanbieter wie
    // MapTiler (deren CORS-Policy würde sonst die Tile-Requests blocken).
    const appOrigin = new URL(APP_BASE_URL).origin
    await context.route('**/*', async (route) => {
      const reqUrl = new URL(route.request().url())
      if (reqUrl.origin === appOrigin) {
        const headers = {
          ...route.request().headers(),
          'x-render-token': HEADLESS_TOKEN,
        }
        await route.continue({ headers })
      } else {
        await route.continue()
      }
    })

    const page = await context.newPage()

    page.on('console', (msg) => {
      const type = msg.type()
      const text = msg.text()
      if (type === 'error' || type === 'warning' || text.startsWith('[headless-debug]') || text.startsWith('[hl-debug]')) {
        console.log(`[browser ${type}] ${text}`)
      }
    })
    page.on('pageerror', (err) => {
      console.error('[browser pageerror]', err.message)
    })

    console.log('[test-headless-render] Lade Editor...')
    const t0 = Date.now()
    const response = await page.goto(url, { waitUntil: 'load', timeout: READY_TIMEOUT_MS })
    if (!response || !response.ok()) {
      throw new Error(`Page-Load fehlgeschlagen: HTTP ${response?.status()}`)
    }
    console.log(`[test-headless-render] Page geladen in ${Date.now() - t0}ms`)

    console.log(`[test-headless-render] Warte auf window.__posterReady (max ${READY_TIMEOUT_MS}ms)...`)
    await page.waitForFunction(() => window.__posterReady === true, undefined, {
      timeout: READY_TIMEOUT_MS,
    })
    console.log(`[test-headless-render] Ready nach ${Date.now() - t0}ms — starte Render-Call`)

    const tRender = Date.now()
    const renderPromise = page.evaluate(
      async (): Promise<string> => {
        console.log('[headless-debug] __renderPosterPng aufrufen')
        const fn = (window as unknown as { __renderPosterPng?: (opts?: { format?: string }) => Promise<string> }).__renderPosterPng
        if (typeof fn !== 'function') {
          throw new Error('window.__renderPosterPng ist nicht definiert')
        }
        const result = await fn({ format: 'a4' })
        console.log(`[headless-debug] __renderPosterPng zurück, length=${result?.length}`)
        return result
      },
    )
    const TIMEOUT = 120_000
    const timeoutPromise = new Promise<string>((_, rej) =>
      setTimeout(() => rej(new Error(`Render-Timeout nach ${TIMEOUT}ms`)), TIMEOUT),
    )
    const dataUrl = await Promise.race([renderPromise, timeoutPromise])
    console.log(`[test-headless-render] Render fertig in ${Date.now() - tRender}ms`)

    if (!dataUrl.startsWith('data:image/png;base64,')) {
      throw new Error(`Unerwartetes Format: ${dataUrl.slice(0, 60)}...`)
    }
    const base64 = dataUrl.replace(/^data:image\/png;base64,/, '')
    const buffer = Buffer.from(base64, 'base64')

    const tmpDir = join(process.cwd(), 'tmp')
    await mkdir(tmpDir, { recursive: true })
    const outPath = join(tmpDir, `headless-test-${Date.now()}.png`)
    await writeFile(outPath, buffer)
    console.log(`[test-headless-render] ✓ Geschrieben: ${outPath} (${(buffer.length / 1024).toFixed(1)} KB)`)
  } finally {
    if (browser) await browser.close()
  }
}

main().catch((err) => {
  console.error('[test-headless-render] Fehler:', err)
  process.exit(1)
})

// Hinweis: window.__renderPosterPng + __posterReady sind in
// src/components/editor/HeadlessRenderBridge.tsx als globale Window-Typen
// deklariert. Hier brauchen wir keine eigene Deklaration.
