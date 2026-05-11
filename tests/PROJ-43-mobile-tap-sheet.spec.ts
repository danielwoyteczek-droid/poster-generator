import { test, expect } from '@playwright/test'

/**
 * PROJ-43: Mobile Tap-Sheet UX smoke tests.
 *
 * These verify the new tap-to-open / tap-canvas-to-close pattern on all
 * three editor entry points (Map, Star-Map, Foto). Coverage:
 *
 *   - Initial: sheet closed, tab-bar visible, canvas full
 *   - Tap tab → sheet rises (aria-expanded flips to true)
 *   - Tap canvas → sheet collapses (aria-expanded back to false)
 *   - Tab swap while open: content swaps, sheet stays open
 *   - Old drag-handle is gone
 *
 * Skipped on Desktop project because the new pattern is mobile-only.
 */

const MOBILE_URLS = ['/de/map', '/de/star-map', '/de/photo']

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      'petite-moment-consent-v1',
      JSON.stringify({ analytics: 'denied', marketing: 'denied' }),
    )
  })
})

test.describe('PROJ-43 mobile tap-sheet — initial state', () => {
  test.beforeEach(({ }, testInfo) => {
    test.skip(testInfo.project.name !== 'Mobile Safari', 'Mobile-only')
  })

  for (const url of MOBILE_URLS) {
    test(`${url} loads with sheet closed and tab-bar visible`, async ({ page }) => {
      await page.goto(url)
      const tabList = page.getByRole('tablist').first()
      await expect(tabList).toBeVisible({ timeout: 15000 })
      // No tab should be expanded on initial load.
      const expanded = tabList.locator('[aria-expanded="true"]')
      await expect(expanded).toHaveCount(0)
      // The old drag-handle is gone (CanvasResizeHandle used aria-label
      // "Vorschau-Bereich anpassen"). Asserting its absence guards the
      // removal across all three editors.
      const oldHandle = page.getByRole('separator', { name: /Vorschau-Bereich anpassen/i })
      await expect(oldHandle).toHaveCount(0)
    })
  }
})

test.describe('PROJ-43 mobile tap-sheet — open / close behaviour', () => {
  test.beforeEach(({ }, testInfo) => {
    test.skip(testInfo.project.name !== 'Mobile Safari', 'Mobile-only')
  })

  test('/de/map: tap tab → sheet opens; tab swap → stays open; tap canvas → closes', async ({ page }) => {
    await page.goto('/de/map')
    const tablist = page.getByRole('tablist').first()
    await expect(tablist).toBeVisible({ timeout: 15000 })

    const mapTab = tablist.getByRole('tab').first()
    const textTab = tablist.getByRole('tab').nth(2) // Karte / Layout / Text / …

    // 1) Tap Map tab → it should become expanded.
    await mapTab.click()
    await expect(mapTab).toHaveAttribute('aria-expanded', 'true')

    // 2) Tap Text tab while sheet is open → Text becomes expanded, Map drops.
    await textTab.click()
    await expect(textTab).toHaveAttribute('aria-expanded', 'true')
    await expect(mapTab).toHaveAttribute('aria-expanded', 'false')

    // 3) Tap on canvas (visible top-half area) → sheet should close.
    // We click the top portion of the viewport to avoid hitting the sheet
    // itself. The MapLibre canvas absorbs pointerdown but our hook fires
    // close on pointerup if the tap was short and stationary.
    const viewportSize = page.viewportSize()
    if (!viewportSize) throw new Error('No viewport size')
    await page.mouse.click(viewportSize.width / 2, viewportSize.height * 0.25)

    // The tab's aria-expanded should now be false.
    await expect(textTab).toHaveAttribute('aria-expanded', 'false', { timeout: 2000 })
  })
})
