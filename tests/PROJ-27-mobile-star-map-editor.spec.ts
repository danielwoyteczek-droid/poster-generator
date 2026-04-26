import { test, expect } from '@playwright/test'

/**
 * Smoke-Tests für PROJ-27 Mobile-Star-Map-Editor.
 *
 * Spiegelt PROJ-18-Tests, aber für /star-map: vier Tabs statt sechs
 * (Sterne / Himmel / Text / Export), kein Marker/Foto-Konzept und kein
 * Map-Pan/Zoom-Interaktionsmodell.
 */

const STAR_MAP_URL = '/de/star-map'

// Cookie-Banner pre-seed, damit er die Tab-Bar nicht überlagert.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      'petite-moment-consent-v1',
      JSON.stringify({ analytics: 'denied', marketing: 'denied' }),
    )
  })
})

// ─── Mobile (Mobile Safari project, iPhone 13 viewport) ───────────────────

test.describe('PROJ-27 Mobile-Star-Map-Editor on iPhone 13', () => {
  test.beforeEach(({ }, testInfo) => {
    test.skip(testInfo.project.name !== 'Mobile Safari', 'Mobile-only test')
  })

  test('renders the four-tab Mobile tab bar', async ({ page }) => {
    await page.goto(STAR_MAP_URL)
    const tablist = page.getByRole('tablist').first()
    await expect(tablist).toBeVisible()
    await expect(tablist.getByRole('tab')).toHaveCount(4)
  })

  test('shows every labelled tab (Sterne / Himmel / Text / Export)', async ({ page }) => {
    await page.goto(STAR_MAP_URL)
    for (const label of ['Sterne', 'Himmel', 'Text', 'Export']) {
      await expect(page.getByRole('tab', { name: label })).toBeVisible()
    }
  })

  test('Sterne tab is selected by default', async ({ page }) => {
    await page.goto(STAR_MAP_URL)
    await expect(page.getByRole('tab', { name: 'Sterne' })).toHaveAttribute('aria-selected', 'true')
  })

  test('switches the selected tab when another tab is tapped', async ({ page }) => {
    await page.goto(STAR_MAP_URL)
    await page.getByRole('tab', { name: 'Himmel' }).click()
    await expect(page.getByRole('tab', { name: 'Himmel' })).toHaveAttribute('aria-selected', 'true')
    await expect(page.getByRole('tab', { name: 'Sterne' })).toHaveAttribute('aria-selected', 'false')
  })

  test('Eye / Zimmeransicht button is visible from any tab', async ({ page }) => {
    await page.goto(STAR_MAP_URL)
    const eyeBtn = page.getByRole('button', { name: 'Zimmeransicht öffnen' })
    await expect(eyeBtn).toBeVisible()

    await page.getByRole('tab', { name: 'Text' }).click()
    await expect(eyeBtn).toBeVisible()

    await page.getByRole('tab', { name: 'Export' }).click()
    await expect(eyeBtn).toBeVisible()
  })
})

// ─── Desktop regression ───────────────────────────────────────────────────

test.describe('PROJ-27 Desktop regression', () => {
  test.beforeEach(({ }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'Desktop-only test')
  })

  test('does not render the Mobile-only Eye button at Desktop width', async ({ page }) => {
    await page.goto(STAR_MAP_URL)
    await page.waitForLoadState('domcontentloaded')
    const eyeBtn = page.getByRole('button', { name: 'Zimmeransicht öffnen' })
    await expect(eyeBtn).toHaveCount(0)
  })

  test('Desktop tab bar has four tabs', async ({ page }) => {
    await page.goto(STAR_MAP_URL)
    // Desktop StarMapLayout has the same four-tab structure as Mobile, but
    // styled as a sidebar — the role-based count is the same.
    const tablist = page.getByRole('tablist').first()
    await expect(tablist).toBeVisible()
    await expect(tablist.getByRole('tab')).toHaveCount(4)
  })
})
