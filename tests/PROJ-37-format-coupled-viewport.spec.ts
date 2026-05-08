import { test, expect } from '@playwright/test'

/**
 * Smoke-Tests für PROJ-37 Format-gekoppelter Editor-Viewport.
 *
 * Verifiziert:
 * - Format-Selector (A4/A3/A2) sitzt am Top des MapTab — sowohl Desktop als
 *   auch Mobile.
 * - Format-Selector ist NICHT mehr im Export-Tab.
 * - Format-Wechsel ändert die physische Pixel-Größe der MapLibre-Canvas.
 * - Star-Map und Foto-Editor zeigen A2 ebenfalls (über PRINT_FORMAT_OPTIONS).
 *
 * Bewusst nicht getestet (Headless-Flakey/Out-of-Scope):
 * - Geographische Coverage-Vergrößerung (MapTiler-Tiles)
 * - Auto-Recenter Marker beim Format-Wechsel (braucht Marker-Drag-Setup)
 * - Pricing-Catalog-Verhalten (DB-State)
 */

const MAP_URL = '/de/map'
const STAR_MAP_URL = '/de/star-map'
const PHOTO_URL = '/de/photo'

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      'petite-moment-consent-v1',
      JSON.stringify({ analytics: 'denied', marketing: 'denied' }),
    )
  })
})

// ─── Desktop ──────────────────────────────────────────────────────────────

test.describe('PROJ-37 Format-Selector Desktop', () => {
  test.beforeEach(({ }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'Desktop-only test')
  })

  test('Map editor: format selector A4/A3/A2 visible at top of MapTab', async ({ page }) => {
    await page.goto(MAP_URL)
    // The Papierformat label should appear at the top of the sidebar; A4/A3/A2
    // buttons follow it as sibling controls.
    await expect(page.getByText('Papierformat').first()).toBeVisible()
    await expect(page.getByRole('button', { name: 'A4', exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'A3', exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'A2', exact: true })).toBeVisible()
  })

  test('Map editor: A4 is selected by default', async ({ page }) => {
    await page.goto(MAP_URL)
    const a4 = page.getByRole('button', { name: 'A4', exact: true })
    // Selected state uses border-primary + bg-primary classes; check via
    // computed background colour rather than class string (more robust).
    const a4Color = await a4.evaluate((el) => getComputedStyle(el).backgroundColor)
    const a3 = page.getByRole('button', { name: 'A3', exact: true })
    const a3Color = await a3.evaluate((el) => getComputedStyle(el).backgroundColor)
    expect(a4Color).not.toBe(a3Color)
  })

  test('Map editor: switching to A3 changes the rendered map canvas size', async ({ page }) => {
    await page.goto(MAP_URL)
    // Wait for MapLibre to mount
    const canvas = page.locator('canvas.maplibregl-canvas').first()
    await expect(canvas).toBeVisible({ timeout: 15000 })
    const a4Width = await canvas.evaluate((el: HTMLCanvasElement) => el.width)
    expect(a4Width).toBeGreaterThan(0)
    // Switch to A3
    await page.getByRole('button', { name: 'A3', exact: true }).click()
    // MapLibre needs a beat to resize after the parent container resizes
    await page.waitForTimeout(800)
    const a3Width = await canvas.evaluate((el: HTMLCanvasElement) => el.width)
    // A3 logical canvas (1131) is √2× A4 logical (800) → canvas.width should
    // grow correspondingly. Allow some tolerance for devicePixelRatio rounding.
    expect(a3Width).toBeGreaterThan(a4Width)
  })

  test('Map editor: ExportTab no longer contains the format selector', async ({ page }) => {
    await page.goto(MAP_URL)
    // Open the Export tab from the desktop sidebar tab bar.
    const exportTab = page.getByRole('tab', { name: /Export/i })
    if (await exportTab.count() > 0) {
      await exportTab.click()
      // Inside Export tab content, A4/A3/A2 buttons should NOT be present.
      // The MapTab still has them (rendered in another tab panel), so we
      // scope the assertion to the visible tab panel.
      const exportPanel = page.getByRole('tabpanel').filter({ hasText: /Herunterladen|exportProductLabel|Format-Selector lebt/i }).first()
      const labelInPanel = exportPanel.getByText('Papierformat')
      await expect(labelInPanel).toHaveCount(0)
    }
  })
})

// ─── Mobile ───────────────────────────────────────────────────────────────

test.describe('PROJ-37 Format-Selector Mobile', () => {
  test.beforeEach(({ }, testInfo) => {
    test.skip(testInfo.project.name !== 'Mobile Safari', 'Mobile-only test')
  })

  test('Mobile MapTab: format selector A4/A3/A2 visible at top', async ({ page }) => {
    await page.goto(MAP_URL)
    // On Mobile, "Karte" tab is selected by default.
    await expect(page.getByRole('tab', { name: 'Karte' })).toHaveAttribute('aria-selected', 'true')
    await expect(page.getByText('Papierformat').first()).toBeVisible()
    await expect(page.getByRole('button', { name: 'A4', exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'A3', exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'A2', exact: true })).toBeVisible()
  })
})

// ─── Star-Map editor (A2 propagates via PRINT_FORMAT_OPTIONS) ─────────────

test.describe('PROJ-37 Star-Map editor', () => {
  test.beforeEach(({ }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'Desktop-only test')
  })

  test('Star-Map export tab shows A2 option', async ({ page }) => {
    await page.goto(STAR_MAP_URL)
    // Star-Map editor shows the Export tab content directly in the sidebar
    // (single-tab star-map flow). A4/A3/A2 buttons live there.
    await expect(page.getByRole('button', { name: 'A2', exact: true })).toBeVisible({ timeout: 15000 })
  })
})

// ─── Foto-Editor (A2 propagates via PRINT_FORMAT_OPTIONS) ─────────────────

test.describe('PROJ-37 Foto-Editor', () => {
  test.beforeEach(({ }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'Desktop-only test')
  })

  test('Foto editor export tab shows A2 option', async ({ page }) => {
    await page.goto(PHOTO_URL)
    await expect(page.getByRole('button', { name: 'A2', exact: true })).toBeVisible({ timeout: 15000 })
  })
})
