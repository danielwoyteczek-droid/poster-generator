import { chromium } from 'playwright'

async function main() {
  const browser = await chromium.launch({ headless: true })
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } })
  await ctx.addInitScript(() => {
    try {
      localStorage.setItem(
        'petite-moment-consent-v1',
        JSON.stringify({ analytics: 'denied', marketing: 'denied' }),
      )
    } catch {}
  })
  const page = await ctx.newPage()

  await page.goto('http://localhost:3000/de/map', { waitUntil: 'load', timeout: 60_000 })
  await page.waitForSelector('.maplibregl-canvas-container canvas', { timeout: 30_000 })
  await page.waitForTimeout(3000)

  // Desktop Standard view
  await page.screenshot({ path: 'tmp-toggle-desktop-standard.png', fullPage: false })
  console.log('✓ Desktop Standard → tmp-toggle-desktop-standard.png')

  // Click Anpassen and capture
  await page.getByRole('tab', { name: 'Anpassen', exact: true }).first().click()
  await page.waitForTimeout(500)
  await page.screenshot({ path: 'tmp-toggle-desktop-anpassen.png', fullPage: false })
  console.log('✓ Desktop Anpassen → tmp-toggle-desktop-anpassen.png')

  await browser.close()
}

main().catch((err) => { console.error(err); process.exit(1) })
