#!/usr/bin/env tsx
/**
 * PROJ-49 Helper: Rendert 4 Sample-Poster (Original/Dark/Pink/Navy) fuer den
 * Etsy-Listing Compare-Grid via Headless-Bridge (`?city_render=1`-Modus).
 *
 * Voraussetzungen:
 *  - Dev-Server laeuft (`npm run dev`)
 *  - RENDER_HEADLESS_TOKEN in .env.local
 *  - Playwright + Chromium installiert
 *
 * Usage:
 *   npm run etsy:render-samples
 *   npm run etsy:render-samples -- --lat=48.137 --lng=11.575 --location="München"
 *
 * Output: ./out/etsy-samples/{style}.png (Original/Dark/Pink/Navy)
 * Dauer: ca. 60-90s (4 Renders á ~15-20s)
 */

import { chromium, type Browser } from 'playwright'
import { writeFile, mkdir } from 'node:fs/promises'
import path from 'node:path'
import { config as loadEnv } from 'dotenv'

loadEnv({ path: '.env.local' })

const APP_BASE_URL = process.env.APP_BASE_URL ?? 'http://localhost:3000'
const HEADLESS_TOKEN = process.env.RENDER_HEADLESS_TOKEN
const READY_TIMEOUT_MS = 60_000
const RENDER_TIMEOUT_MS = 120_000

interface StyleConfig {
  id: 'original' | 'dark' | 'pink' | 'navy'
  layout: string
  palette: string
}

const STYLES: StyleConfig[] = [
  { id: 'original', layout: 'tusche', palette: 'original' },
  { id: 'dark', layout: 'tusche', palette: 'black-white' },
  { id: 'pink', layout: 'klassisch', palette: 'pink' },
  { id: 'navy', layout: 'klassisch', palette: 'navy' },
]

interface Args {
  lat: number
  lng: number
  zoom: number
  location: string
  outDir: string
}

function parseArgs(): Args {
  const argv = process.argv.slice(2)
  const get = (k: string) => argv.find((a) => a.startsWith('--' + k + '='))?.split('=')[1]
  return {
    lat: parseFloat(get('lat') ?? '52.5163'),
    lng: parseFloat(get('lng') ?? '13.3777'),
    zoom: parseFloat(get('zoom') ?? '13'),
    location: get('location') ?? 'Berlin',
    outDir: get('out') ?? './out/etsy-samples',
  }
}

async function renderOne(browser: Browser, style: StyleConfig, args: Args): Promise<Buffer> {
  if (!HEADLESS_TOKEN) throw new Error('RENDER_HEADLESS_TOKEN nicht gesetzt')

  const params = new URLSearchParams({
    headless: '1',
    city_render: '1',
    layout: style.layout,
    palette: style.palette,
    lat: String(args.lat),
    lng: String(args.lng),
    zoom: String(args.zoom),
    location_name: args.location,
  })
  const url = `${APP_BASE_URL}/de/map?${params.toString()}`
  console.log(`  → ${style.id.toUpperCase()}: ${style.layout}+${style.palette}`)

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
  })
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

  try {
    const page = await context.newPage()
    page.on('console', (msg) => {
      const text = msg.text()
      if (msg.type() === 'error' || text.startsWith('[hl-debug]')) {
        // Silenced — uncomment for verbose debugging
        // console.log(`    [browser ${msg.type()}] ${text}`)
      }
    })
    page.on('pageerror', (err) => console.error('    [pageerror]', err.message))

    const response = await page.goto(url, { waitUntil: 'load', timeout: READY_TIMEOUT_MS })
    if (!response || !response.ok()) {
      throw new Error(`Page-Load fehlgeschlagen: HTTP ${response?.status()}`)
    }

    await page.waitForFunction(() => window.__posterReady === true, undefined, {
      timeout: READY_TIMEOUT_MS,
    })

    const renderPromise = page.evaluate(async (): Promise<string> => {
      const fn = (window as unknown as { __renderPosterPng?: (opts?: { format?: string }) => Promise<string> })
        .__renderPosterPng
      if (typeof fn !== 'function') throw new Error('window.__renderPosterPng nicht definiert')
      return fn({ format: 'a4' })
    })
    const timeoutPromise = new Promise<string>((_, rej) =>
      setTimeout(() => rej(new Error(`Render-Timeout nach ${RENDER_TIMEOUT_MS}ms`)), RENDER_TIMEOUT_MS),
    )
    const dataUrl = await Promise.race([renderPromise, timeoutPromise])

    if (!dataUrl.startsWith('data:image/png;base64,')) {
      throw new Error(`Unerwartetes Format: ${dataUrl.slice(0, 60)}`)
    }
    return Buffer.from(dataUrl.replace(/^data:image\/png;base64,/, ''), 'base64')
  } finally {
    await context.close()
  }
}

async function main() {
  if (!HEADLESS_TOKEN) {
    console.error('RENDER_HEADLESS_TOKEN nicht gesetzt. Bitte in .env.local hinterlegen.')
    process.exit(1)
  }
  const args = parseArgs()
  console.log(`Etsy-Samples rendern: ${args.location} (${args.lat}, ${args.lng}, zoom ${args.zoom})`)
  console.log(`Output: ${path.resolve(args.outDir)}`)
  console.log('')

  const outDir = path.resolve(args.outDir)
  await mkdir(outDir, { recursive: true })

  const browser = await chromium.launch({ headless: true })
  try {
    for (const style of STYLES) {
      const t0 = Date.now()
      const buf = await renderOne(browser, style, args)
      const outPath = path.join(outDir, `${style.id}.png`)
      await writeFile(outPath, buf)
      console.log(`    ✓ ${outPath} (${(buf.length / 1024).toFixed(0)} KB, ${Date.now() - t0}ms)`)
    }
  } finally {
    await browser.close()
  }

  console.log('')
  console.log('Nächster Schritt — Compare-Grid bauen:')
  console.log('  npm run etsy:compare-grid -- \\')
  console.log(`    --original=${path.join(args.outDir, 'original.png')} \\`)
  console.log(`    --dark=${path.join(args.outDir, 'dark.png')} \\`)
  console.log(`    --pink=${path.join(args.outDir, 'pink.png')} \\`)
  console.log(`    --navy=${path.join(args.outDir, 'navy.png')} \\`)
  console.log(`    --out=./out/etsy-compare-grid.png`)
}

main().catch((err) => {
  console.error('Fataler Fehler:', err)
  process.exit(1)
})
