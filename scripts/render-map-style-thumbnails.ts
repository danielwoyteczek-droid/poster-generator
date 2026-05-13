/**
 * Generates Map-Style-Thumbnails for the Map-Editor's style picker.
 *
 * For each entry in MAP_LAYOUTS, opens /de/map, clicks the style button,
 * waits for tiles to render, screenshots the MapLibre canvas element, and
 * saves to public/map-style-thumbnails/<id>.png.
 *
 * Voraussetzungen:
 *  - Dev-Server läuft (`npm run dev`)
 *  - Playwright + Chromium installiert (schon Repo-Dependency via regen-preset-thumbnails)
 *
 * Aufruf:
 *   npx tsx scripts/render-map-style-thumbnails.ts
 */

import { chromium } from 'playwright'
import fs from 'fs'
import path from 'path'

const APP_URL = process.env.APP_BASE_URL ?? 'http://localhost:3000'
const EDITOR_URL = `${APP_URL}/de/map`
const OUTPUT_DIR = path.join('public', 'map-style-thumbnails')
const INITIAL_TILE_WAIT_MS = 6_000
const STYLE_SWITCH_WAIT_MS = 5_000

// Mirrors MAP_LAYOUTS from src/lib/map-layouts.ts. Labels mirror locales/de.json
// (mapLayouts.<id>Label) — same as the hardcoded fallback, so the click-by-text
// strategy works against the rendered DOM.
const STYLES: Array<{ id: string; label: string }> = [
  { id: 'klassisch', label: 'Klassisch' },
  { id: 'satellite', label: 'Satellit' },
  { id: 'minimal', label: 'Minimal' },
  { id: 'detail', label: 'Detailliert' },
  { id: 'tusche', label: 'Tusche' },
]

// Palette applied to every style so the thumbnails differ purely in
// structure (layer visibility, line weights, hatching, label density),
// not in colour. "Original" was redefined 2026-05-13 to be a fixed
// Tusche-derived neutral palette (in petite-style-loader.ts), so rendering
// thumbs against Original now matches what the customer sees by default.
const FIXED_PALETTE_LABEL = 'Original'

async function main() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true })

  // Desktop viewport (>= ~1024) so MapTab.tsx renders the named style
  // buttons in the sidebar. deviceScaleFactor 1 keeps the canvas pixel
  // dimensions modest (~400–600px wide) so the raw `canvas.screenshot()`
  // PNG stays small (~80–250 KB). drawImage-based resize doesn't work
  // because MapLibre's WebGL canvas clears its buffer after each frame.
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    deviceScaleFactor: 1,
  })

  // Pre-accept consent so the cookie banner doesn't overlap the map canvas
  // during screenshot. Matches the format in src/lib/analytics.ts.
  await context.addInitScript(() => {
    try {
      localStorage.setItem(
        'petite-moment-consent-v1',
        JSON.stringify({ analytics: 'denied', marketing: 'denied' }),
      )
    } catch {}
  })

  for (const style of STYLES) {
    // Fresh page per style — palette state carries over across clicks
    // within one session (style change does not reset palette), so the
    // klassisch-extracted "original" palette would bleed into every later
    // style screenshot. Closing + re-opening the page resets to default
    // editor state and re-extracts the new style's native palette.
    const page = await context.newPage()
    try {
      console.log(`[${style.id}] opening fresh page`)
      await page.goto(EDITOR_URL, { waitUntil: 'load', timeout: 60_000 })
      await page.waitForSelector('.maplibregl-canvas-container canvas', { timeout: 30_000 })
      await page.waitForTimeout(INITIAL_TILE_WAIT_MS)

      console.log(`[${style.id}] clicking "${style.label}"`)
      await page.getByRole('button', { name: style.label, exact: true }).first().click()
      await page.waitForTimeout(STYLE_SWITCH_WAIT_MS)

      // Apply the fixed unified palette so each thumbnail shows the same
      // colours and the visual difference is purely the style's structural
      // identity (line weights, layer visibility, hatching, labels).
      await page
        .getByRole('button', { name: FIXED_PALETTE_LABEL, exact: true })
        .first()
        .click()
      await page.waitForTimeout(STYLE_SWITCH_WAIT_MS)

      const canvas = await page.$('.maplibregl-canvas-container canvas')
      if (!canvas) throw new Error('Map canvas element not found')

      const buf = await canvas.screenshot({ type: 'png' })
      const filePath = path.join(OUTPUT_DIR, `${style.id}.png`)
      fs.writeFileSync(filePath, buf)
      console.log(`  ✓ ${(buf.length / 1024).toFixed(0)} KB → ${filePath}`)
    } catch (err) {
      console.error(`  ✗ ${style.id}: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      await page.close()
    }
  }

  await browser.close()
  console.log(`[thumbs] done`)
}

main().catch((err) => {
  console.error('[thumbs] Fatal:', err)
  process.exit(1)
})
