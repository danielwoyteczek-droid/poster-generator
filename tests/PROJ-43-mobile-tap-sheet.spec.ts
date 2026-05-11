import { test, expect } from '@playwright/test'

/**
 * PROJ-43 — Mobile Tap-Sheet UX acceptance tests.
 *
 * Covers ACs that can be verified in a headless browser. Pan / pinch /
 * marker-drag (AC11–13) and the iOS-keyboard branch (AC14–16) are partially
 * covered by useMobileSheet.test.ts at the unit level; full Mobile-Safari
 * on-device behaviour requires a real iPhone and is flagged for manual QA
 * in the spec.
 */

const MAP_URL = '/de/map'
const STAR_MAP_URL = '/de/star-map'
const PHOTO_URL = '/de/photo'
const MOBILE_URLS = [MAP_URL, STAR_MAP_URL, PHOTO_URL]

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      'petite-moment-consent-v1',
      JSON.stringify({ analytics: 'denied', marketing: 'denied' }),
    )
  })
})

// ─── Initial state (AC1 / AC2 / AC17) ─────────────────────────────────────

test.describe('PROJ-43 initial state', () => {
  test.beforeEach(({ }, testInfo) => {
    test.skip(testInfo.project.name !== 'Mobile Safari', 'Mobile-only')
  })

  for (const url of MOBILE_URLS) {
    test(`AC1+AC2+AC17 ${url}: sheet closed, tab-bar visible, no drag-handle`, async ({ page }) => {
      await page.goto(url)
      const tabList = page.getByRole('tablist').first()
      await expect(tabList).toBeVisible({ timeout: 15000 })
      // AC1: No tab carries aria-expanded=true on initial load.
      const expanded = tabList.locator('[aria-expanded="true"]')
      await expect(expanded).toHaveCount(0)
      // AC2: All tabs in the tab-bar are visible.
      const tabCount = await tabList.getByRole('tab').count()
      expect(tabCount).toBeGreaterThanOrEqual(3)
      // AC17: The old CanvasResizeHandle (aria-label "Vorschau-Bereich
      // anpassen") is gone.
      const oldHandle = page.getByRole('separator', { name: /Vorschau-Bereich anpassen/i })
      await expect(oldHandle).toHaveCount(0)
    })
  }
})

// ─── Desktop unchanged (AC3) ─────────────────────────────────────────────

test.describe('PROJ-43 desktop unchanged', () => {
  test.beforeEach(({ }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'Desktop-only')
  })

  test('AC3 /de/map at desktop width: no mobile bottom-sheet present', async ({ page }) => {
    await page.goto(MAP_URL)
    // The mobile sheet has id="mobile-editor-sheet"; on desktop it must not
    // be rendered at all.
    const sheet = page.locator('#mobile-editor-sheet')
    await expect(sheet).toHaveCount(0)
  })
})

// ─── Open / close behaviour (AC4–AC11) ────────────────────────────────────

test.describe('PROJ-43 open / close', () => {
  test.beforeEach(({ }, testInfo) => {
    test.skip(testInfo.project.name !== 'Mobile Safari', 'Mobile-only')
  })

  // MapTiler initialisation + first-compile of /de/map can take > 30 s
  // under parallel load on a dev server. The actual user-facing latency
  // is fine in production; we just need to give Playwright room.
  test.setTimeout(60000)

  test('AC4+AC7 /de/map: tap Karte tab opens sheet, tab highlighted via aria-expanded', async ({ page }) => {
    await page.goto(MAP_URL)
    const tablist = page.getByRole('tablist').first()
    await expect(tablist).toBeVisible({ timeout: 15000 })
    const mapTab = tablist.getByRole('tab').first()
    await expect(mapTab).toHaveAttribute('aria-expanded', 'false')
    await mapTab.click()
    await expect(mapTab).toHaveAttribute('aria-expanded', 'true')
    // The associated sheet panel should be present and not aria-hidden.
    const sheet = page.locator('#mobile-editor-sheet')
    await expect(sheet).toHaveAttribute('aria-hidden', 'false')
  })

  test('AC8+AC9 /de/map: tab swap while sheet open swaps content in place', async ({ page }) => {
    await page.goto(MAP_URL)
    const tablist = page.getByRole('tablist').first()
    await expect(tablist).toBeVisible({ timeout: 15000 })
    const mapTab = tablist.getByRole('tab').first()
    const textTab = tablist.getByRole('tab').nth(2)
    await mapTab.click()
    await expect(mapTab).toHaveAttribute('aria-expanded', 'true')
    // Swap — sheet stays open, expanded moves to the new tab.
    await textTab.click()
    await expect(textTab).toHaveAttribute('aria-expanded', 'true')
    await expect(mapTab).toHaveAttribute('aria-expanded', 'false')
    // Sheet itself never went to aria-hidden=true during the swap.
    const sheet = page.locator('#mobile-editor-sheet')
    await expect(sheet).toHaveAttribute('aria-hidden', 'false')
  })

  test('AC10 /de/map: tap on visible canvas (top half) closes the sheet', async ({ page }) => {
    await page.goto(MAP_URL)
    const tablist = page.getByRole('tablist').first()
    await expect(tablist).toBeVisible({ timeout: 15000 })
    const mapTab = tablist.getByRole('tab').first()
    await mapTab.click()
    await expect(mapTab).toHaveAttribute('aria-expanded', 'true')
    // Click at the top-middle, which is canvas area (visible above the open
    // sheet that occupies the bottom 50%).
    const viewportSize = page.viewportSize()
    if (!viewportSize) throw new Error('No viewport size')
    await page.mouse.click(viewportSize.width / 2, viewportSize.height * 0.2)
    await expect(mapTab).toHaveAttribute('aria-expanded', 'false', { timeout: 2000 })
  })
})

// ─── Star-Map: AC20–22 parity + interactive opt-out (AC13) ────────────────

test.describe('PROJ-43 star-map parity', () => {
  test.beforeEach(({ }, testInfo) => {
    test.skip(testInfo.project.name !== 'Mobile Safari', 'Mobile-only')
  })

  test('AC21 /de/star-map: tap Sterne tab opens sheet', async ({ page }) => {
    await page.goto(STAR_MAP_URL)
    const tablist = page.getByRole('tablist').first()
    await expect(tablist).toBeVisible({ timeout: 15000 })
    const sterneTab = tablist.getByRole('tab').first()
    await sterneTab.click()
    await expect(sterneTab).toHaveAttribute('aria-expanded', 'true')
  })

  test('AC13 /de/star-map: tap on Eye-Button does NOT close the open sheet', async ({ page }) => {
    await page.goto(STAR_MAP_URL)
    const tablist = page.getByRole('tablist').first()
    await expect(tablist).toBeVisible({ timeout: 15000 })
    const sterneTab = tablist.getByRole('tab').first()
    await sterneTab.click()
    await expect(sterneTab).toHaveAttribute('aria-expanded', 'true')
    // The Eye button is marked data-canvas-interactive — tapping it opens
    // the Zimmer modal but must NOT bubble up to the canvas-tap detector
    // and close the sheet.
    const eyeBtn = page.getByRole('button', { name: 'Zimmeransicht öffnen' })
    await expect(eyeBtn).toBeVisible()
    await eyeBtn.click()
    // The modal opens — close it so we can recheck the sheet state.
    await page.keyboard.press('Escape').catch(() => null)
    // Sheet should still be open (or the modal close shouldn't have flipped it).
    await expect(sterneTab).toHaveAttribute('aria-expanded', 'true')
  })
})

// ─── Photo editor parity (AC22) ───────────────────────────────────────────

test.describe('PROJ-43 photo editor parity', () => {
  test.beforeEach(({ }, testInfo) => {
    test.skip(testInfo.project.name !== 'Mobile Safari', 'Mobile-only')
  })

  test('AC22 /de/photo: tap first tab opens sheet', async ({ page }) => {
    await page.goto(PHOTO_URL)
    const tablist = page.getByRole('tablist').first()
    await expect(tablist).toBeVisible({ timeout: 15000 })
    const firstTab = tablist.getByRole('tab').first()
    await firstTab.click()
    await expect(firstTab).toHaveAttribute('aria-expanded', 'true')
  })
})
