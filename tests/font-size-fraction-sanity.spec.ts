import { test, expect } from '@playwright/test'

/**
 * Live sanity check for the format-invariant fontSizeFraction migration.
 * Loads the map editor, captures the rendered title block's CSS font-size in
 * each format, and asserts that A3/A2 grow proportionally to A4 instead of
 * staying at the same px value (the old bug).
 *
 * Expected ratios — fontSizeFraction × logicalCanvasWidth where logical
 * widths are A4=800, A3=1131, A2=1600. So A3 ≈ 1.414× A4, A2 ≈ 2× A4.
 */
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      'cookie-consent',
      JSON.stringify({ status: 'accepted', timestamp: Date.now() }),
    )
  })
})

test('font-size scales proportionally with paper format', async ({ page }) => {
  await page.goto('/de/map')
  await page.waitForLoadState('networkidle')

  // The default New York title block lives in the editor preview overlay.
  const titleBlock = page.locator('[data-block-id="block-title"]').first()
  await expect(titleBlock).toBeVisible({ timeout: 15_000 })

  const innerSelector = '[data-block-id="block-title"] > div'

  // Helper: pick the format button by label and read the rendered font-size.
  const formatButton = (label: string) =>
    page.getByRole('button', { name: new RegExp(`^${label}$`) }).first()

  const measureFontPx = async () =>
    await page.evaluate((sel) => {
      const el = document.querySelector(sel) as HTMLElement | null
      if (!el) return 0
      return parseFloat(window.getComputedStyle(el).fontSize)
    }, innerSelector)

  await formatButton('A4').click()
  await page.waitForTimeout(300)
  const a4Px = await measureFontPx()

  await formatButton('A3').click()
  await page.waitForTimeout(300)
  const a3Px = await measureFontPx()

  await formatButton('A2').click()
  await page.waitForTimeout(300)
  const a2Px = await measureFontPx()

  console.log({ a4Px, a3Px, a2Px, a3OverA4: a3Px / a4Px, a2OverA4: a2Px / a4Px })

  // A3 must be visibly larger than A4 (proportional, not constant).
  // ISO-A linear ratio is √2 ≈ 1.414. Allow ±10 % slop for layout/transform.
  expect(a3Px / a4Px).toBeGreaterThan(1.27)
  expect(a3Px / a4Px).toBeLessThan(1.56)

  // A2 should be ~2× A4.
  expect(a2Px / a4Px).toBeGreaterThan(1.8)
  expect(a2Px / a4Px).toBeLessThan(2.2)

  // And: returning to A4 must restore the original size (no drift).
  await formatButton('A4').click()
  await page.waitForTimeout(300)
  const a4PxBack = await measureFontPx()
  expect(Math.abs(a4PxBack - a4Px)).toBeLessThan(1)
})

test('marker pin scales proportionally with paper format', async ({ page }) => {
  await page.goto('/de/map')
  await page.waitForLoadState('networkidle')

  // Marker is off by default — flip it on via the dev-exposed store.
  await page.evaluate(() => {
    const store = (window as unknown as {
      useEditorStore: { setState: (s: { marker: { enabled: boolean; type: 'classic' | 'heart'; color: string; lat: null; lng: null } }) => void }
    }).useEditorStore
    store.setState({ marker: { enabled: true, type: 'classic', color: '#e63946', lat: null, lng: null } })
  })

  const pin = page.getByTestId('marker-pin-primary')
  await expect(pin).toBeVisible({ timeout: 5_000 })

  const formatButton = (label: string) =>
    page.getByRole('button', { name: new RegExp(`^${label}$`) }).first()

  // Measure the SVG `height` attribute (logical CSS px from
  // resolvePinSizePx) rather than getBoundingClientRect (post-transform
  // visual px) — the CSS-transform-scale fitting logical canvas into the
  // wrapper grows with format too, so the visual height stays roughly
  // constant. The attribute is what actually changed in the fix.
  const measurePinSvgHeight = async () =>
    await page.evaluate(() => {
      const el = document.querySelector('[data-testid="marker-pin-primary"] svg') as SVGSVGElement | null
      if (!el) return 0
      const h = el.getAttribute('height')
      return h ? parseFloat(h) : 0
    })

  await formatButton('A4').click()
  await page.waitForTimeout(300)
  const a4Px = await measurePinSvgHeight()

  await formatButton('A3').click()
  await page.waitForTimeout(300)
  const a3Px = await measurePinSvgHeight()

  await formatButton('A2').click()
  await page.waitForTimeout(300)
  const a2Px = await measurePinSvgHeight()

  console.log({ a4Px, a3Px, a2Px, a3OverA4: a3Px / a4Px, a2OverA4: a2Px / a4Px })

  expect(a3Px / a4Px).toBeGreaterThan(1.27)
  expect(a3Px / a4Px).toBeLessThan(1.56)
  expect(a2Px / a4Px).toBeGreaterThan(1.8)
  expect(a2Px / a4Px).toBeLessThan(2.2)
})
