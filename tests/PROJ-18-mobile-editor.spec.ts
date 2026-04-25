import { test, expect } from '@playwright/test'

/**
 * Smoke-Tests für PROJ-18 Mobile-Editor.
 *
 * Each test runs in both `chromium` (Desktop 1280×720) and `Mobile Safari`
 * (iPhone 13, 390×664) projects from playwright.config.ts. Mobile-only and
 * Desktop-only tests skip themselves on the wrong project.
 *
 * Fokus: Layout-Switching (< 1024 px → Mobile, ≥ 1024 px → Desktop), die sechs
 * Mobile-Tabs, Eye-Button für Zimmeransicht, Mobile-Cart-Link. Keine Map-
 * Interaktion (Pan/Zoom) — das hängt am MapTiler-WebGL-Stack und ist in
 * Headless-Tests flakey. Diese Suite verifiziert die Struktur, nicht die
 * kartographische Renderqualität.
 */

const MAP_URL = '/de/map'

// ─── Cookie-Consent vor jedem Test ausschalten ────────────────────────────
// Der ConsentBanner ist auf Mobile als `fixed bottom-0 z-50`-Element gerendert
// und überlagert den Tab-Bar-Bereich, sodass `getByRole('tab').click()` darauf
// abprallt. Wir seeden den localStorage-Key, den der Banner prüft, sodass er
// gar nicht erst erscheint.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      'petite-moment-consent-v1',
      JSON.stringify({ analytics: 'denied', marketing: 'denied' }),
    )
  })
})

// ─── Mobile (Mobile Safari project, iPhone 13 viewport) ───────────────────

test.describe('PROJ-18 Mobile-Editor on iPhone 13', () => {
  test.beforeEach(({ }, testInfo) => {
    test.skip(testInfo.project.name !== 'Mobile Safari', 'Mobile-only test')
  })

  test('renders the six-tab Mobile tab bar', async ({ page }) => {
    await page.goto(MAP_URL)
    const tablist = page.getByRole('tablist').first()
    await expect(tablist).toBeVisible()
    await expect(tablist.getByRole('tab')).toHaveCount(6)
  })

  test('shows every labelled tab (Karte / Layout / Text / Marker / Fotos / Export)', async ({ page }) => {
    await page.goto(MAP_URL)
    for (const label of ['Karte', 'Layout', 'Text', 'Marker', 'Fotos', 'Export']) {
      await expect(page.getByRole('tab', { name: label })).toBeVisible()
    }
  })

  test('Karte tab is selected by default', async ({ page }) => {
    await page.goto(MAP_URL)
    await expect(page.getByRole('tab', { name: 'Karte' })).toHaveAttribute('aria-selected', 'true')
  })

  test('switches the selected tab when another tab is tapped', async ({ page }) => {
    await page.goto(MAP_URL)
    await page.getByRole('tab', { name: 'Layout' }).click()
    await expect(page.getByRole('tab', { name: 'Layout' })).toHaveAttribute('aria-selected', 'true')
    await expect(page.getByRole('tab', { name: 'Karte' })).toHaveAttribute('aria-selected', 'false')
  })

  test('Eye / Zimmeransicht button is visible from any tab', async ({ page }) => {
    await page.goto(MAP_URL)
    const eyeBtn = page.getByRole('button', { name: 'Zimmeransicht öffnen' })
    await expect(eyeBtn).toBeVisible()

    // Stays visible after switching to a different tab — confirms the button
    // sits on the always-on preview area, not inside a single tab's content.
    await page.getByRole('tab', { name: 'Marker' }).click()
    await expect(eyeBtn).toBeVisible()

    await page.getByRole('tab', { name: 'Export' }).click()
    await expect(eyeBtn).toBeVisible()
  })

  test('Mobile nav exposes the cart icon (regression: was hidden below md breakpoint)', async ({ page }) => {
    await page.goto(MAP_URL)
    const cart = page.getByRole('link', { name: 'Warenkorb' })
    await expect(cart.first()).toBeVisible()
  })
})

// ─── Desktop regression (chromium project, 1280×720) ──────────────────────

test.describe('PROJ-18 Desktop regression', () => {
  test.beforeEach(({ }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'Desktop-only test')
  })

  test('does not render the Mobile-only Eye button at Desktop width', async ({ page }) => {
    await page.goto(MAP_URL)
    // Wait for the EditorShell to resolve isMobile → false and mount the
    // Desktop layout. The Eye button is exclusive to MobileEditorLayout.
    await page.waitForLoadState('domcontentloaded')
    const eyeBtn = page.getByRole('button', { name: 'Zimmeransicht öffnen' })
    await expect(eyeBtn).toHaveCount(0)
  })

  test('Desktop tab bar has four tabs, not six', async ({ page }) => {
    await page.goto(MAP_URL)
    // Desktop's Tabs (Karte / Text / Foto / Export) is also role="tablist".
    // The count distinguishes Mobile (6) from Desktop (4).
    const tablist = page.getByRole('tablist').first()
    await expect(tablist).toBeVisible()
    await expect(tablist.getByRole('tab')).toHaveCount(4)
  })
})
