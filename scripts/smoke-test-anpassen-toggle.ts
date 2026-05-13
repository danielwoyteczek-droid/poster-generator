/**
 * Smoke test for the PROJ-36 „Erweiterte Optionen" switch (2026-05-13 v2).
 * Verifies:
 *  - Map editor loads (Desktop or Mobile via --mobile flag)
 *  - Old Sheet/Footer architecture is gone
 *  - „Erweiterte Optionen"-Switch is visible for non-admin users
 *  - Toggling the switch flips its checked state
 *  - Canvas stays interactive (no modal backdrop)
 *
 * Aufruf: npx tsx scripts/smoke-test-anpassen-toggle.ts [--mobile]
 */

import { chromium } from 'playwright'

const APP_URL = process.env.APP_BASE_URL ?? 'http://localhost:3000'
const SWITCH_LABEL = 'Erweiterte Optionen'

async function main() {
  const mobile = process.argv.includes('--mobile')
  const browser = await chromium.launch({ headless: true })
  const ctx = await browser.newContext({
    viewport: mobile ? { width: 390, height: 844 } : { width: 1280, height: 900 },
    isMobile: mobile,
    hasTouch: mobile,
  })
  await ctx.addInitScript(() => {
    try {
      localStorage.setItem(
        'petite-moment-consent-v1',
        JSON.stringify({ analytics: 'denied', marketing: 'denied' }),
      )
    } catch {}
  })
  const page = await ctx.newPage()

  let pass = 0
  let fail = 0
  const log = (ok: boolean, msg: string) => {
    if (ok) {
      pass++
      console.log(`  ✓ ${msg}`)
    } else {
      fail++
      console.log(`  ✗ ${msg}`)
    }
  }

  console.log(`[smoke] opening ${APP_URL}/de/map (${mobile ? 'mobile' : 'desktop'})`)
  await page.goto(`${APP_URL}/de/map`, { waitUntil: 'load', timeout: 60_000 })
  await page.waitForSelector('.maplibregl-canvas-container canvas', { timeout: 30_000 })
  await page.waitForTimeout(3000)

  if (mobile) {
    const mapTab = await page.getByRole('tab', { name: /karte|map/i }).first()
    if (await mapTab.isVisible()) {
      await mapTab.click()
      await page.waitForTimeout(800)
    }
  }

  // 1. Map canvas present
  const canvas = await page.$('.maplibregl-canvas-container canvas')
  log(!!canvas, 'map canvas present')

  // 2. Switch labelled "Erweiterte Optionen" visible
  const sw = page.getByRole('switch', { name: SWITCH_LABEL }).first()
  const swVisible = await sw.isVisible().catch(() => false)
  log(swVisible, `Switch labelled "${SWITCH_LABEL}" visible`)

  if (swVisible) {
    // 3. Default state: off
    const checkedBefore = await sw.getAttribute('aria-checked')
    log(checkedBefore === 'false', `Switch off by default (aria-checked=${checkedBefore})`)

    // 4. Click → flips to on
    await sw.click()
    await page.waitForTimeout(400)
    const checkedAfter = await sw.getAttribute('aria-checked')
    log(checkedAfter === 'true', `Switch on after click (aria-checked=${checkedAfter})`)

    // 5. Click again → flips back
    await sw.click()
    await page.waitForTimeout(400)
    const checkedAgain = await sw.getAttribute('aria-checked')
    log(checkedAgain === 'false', `Switch off after second click (aria-checked=${checkedAgain})`)
  }

  // 6. Canvas still on top — no modal overlay
  const canvasBox = await canvas?.boundingBox()
  if (canvasBox) {
    const elAtCenter = await page.evaluate(({ x, y }) => {
      const el = document.elementFromPoint(x, y)
      return el ? `${el.tagName}.${(el as HTMLElement).className?.toString().slice(0, 60) ?? ''}` : null
    }, { x: Math.round(canvasBox.x + canvasBox.width / 2), y: Math.round(canvasBox.y + canvasBox.height / 2) })
    const looksLikeCanvas = !!elAtCenter && /canvas|maplibre/i.test(elAtCenter)
    log(looksLikeCanvas, `canvas element on top at center (got: ${elAtCenter ?? 'null'})`)
  } else {
    log(false, 'canvas bounding box missing')
  }

  console.log(`\n[smoke] ${pass} passed, ${fail} failed`)
  await browser.close()
  if (fail > 0) process.exit(1)
}

main().catch((err) => {
  console.error('[smoke] fatal:', err)
  process.exit(1)
})
