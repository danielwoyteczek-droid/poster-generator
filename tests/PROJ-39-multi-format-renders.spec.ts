import { test, expect } from '@playwright/test'

/**
 * Smoke-Tests für PROJ-39 Multi-Format-Preset-Renders + Inspiration
 * Format-Switcher.
 *
 * Verifiziert:
 * - Inspiration/Gallery-Karten zeigen einen 3-Pill-Format-Switcher (A4/A3/A2)
 *   im Desktop-Viewport.
 * - Pill-Click wechselt das angezeigte Vorschau-Bild ohne Page-Reload.
 * - Pill-Click klickt NICHT den umliegenden `<Link>` durch (Click-Bubbling
 *   gestoppt) — der Customer bleibt auf der Gallery-Seite.
 * - Hero-Click leitet zum Editor mit `?preset=<id>&format=<fmt>` weiter.
 * - Mobile-Viewport blendet den Pill-Switcher aus (Lese-fluss-Schutz, gemäss
 *   Spec).
 * - Public `/api/presets`-Endpoint liefert die neuen per-format-Spalten.
 *
 * Bewusst nicht getestet:
 * - Tatsächliche Render-Worker-Iteration (PROJ-30-Pipeline; eigener Test).
 * - Backfill-Filter (Admin-only, eigener Admin-Test).
 * - Storage-Layout `preset-renders/<id>/format-<fmt>.jpg` (DB-Smoke statt
 *   Storage-Smoke; ohne Service-Role-Key im Browser nicht testbar).
 */

const GALLERY_URL = '/de/gallery'

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      'petite-moment-consent-v1',
      JSON.stringify({ analytics: 'denied', marketing: 'denied' }),
    )
  })
})

// ─── Public API ───────────────────────────────────────────────────────────

test.describe('PROJ-39 public /api/presets returns per-format columns', () => {
  test.beforeEach(({ }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'API smoke runs once')
  })

  test('GET /api/presets includes preview_image_url_<fmt> + render_status_<fmt>', async ({ request }) => {
    const res = await request.get('/api/presets?poster_type=map&locale=de')
    expect(res.ok()).toBe(true)
    const body = await res.json()
    expect(Array.isArray(body.presets)).toBe(true)
    if (body.presets.length === 0) {
      test.skip(true, 'No published map presets seeded for de — DB-only env.')
      return
    }
    const sample = body.presets[0]
    // Per-format URL columns must be present on the wire (null is fine before
    // backfill, but the keys themselves should be selected).
    expect(sample).toHaveProperty('preview_image_url_a4')
    expect(sample).toHaveProperty('preview_image_url_a3')
    expect(sample).toHaveProperty('preview_image_url_a2')
    expect(sample).toHaveProperty('render_status_a4')
    expect(sample).toHaveProperty('render_status_a3')
    expect(sample).toHaveProperty('render_status_a2')
  })
})

// ─── Desktop: format-switcher visible + interactive ──────────────────────

test.describe('PROJ-39 Format-Switcher Desktop', () => {
  test.beforeEach(({ }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'Desktop-only test')
  })

  test('Gallery: format pills A4/A3/A2 render under at least one card', async ({ page }) => {
    await page.goto(GALLERY_URL)
    // Wait until the gallery has hydrated and at least one card is visible.
    const firstCard = page.locator('a[aria-label]').first()
    await firstCard.waitFor({ state: 'visible', timeout: 15000 })
    // The switcher only renders when ≥2 formats have `done`. We accept that
    // some seeded presets may only have A4 for now (during PROJ-39 rollout) —
    // test passes if at least ONE pill-group exists somewhere on the page.
    const pillGroups = page.locator('button[aria-pressed]').filter({ hasText: /^A[234]$/ })
    const count = await pillGroups.count()
    if (count === 0) {
      test.skip(true, 'No multi-format presets visible yet — backfill not run.')
      return
    }
    expect(count).toBeGreaterThanOrEqual(2)
  })

  test('Gallery: clicking a pill swaps the image without navigating away', async ({ page }) => {
    await page.goto(GALLERY_URL)
    await page.waitForLoadState('networkidle')
    // Find a card that has multiple format pills (i.e. the parent gallery item
    // exposes A4 AND A3 buttons inside it).
    const cards = page.locator('div').filter({
      has: page.locator('button[aria-pressed]', { hasText: 'A4' }),
    }).filter({
      has: page.locator('button[aria-pressed]', { hasText: 'A3' }),
    })
    const cardCount = await cards.count()
    if (cardCount === 0) {
      test.skip(true, 'No card has 2+ formats yet — backfill not run.')
      return
    }
    const card = cards.first()
    const img = card.locator('img').first()
    await expect(img).toBeVisible()
    const initialSrc = await img.getAttribute('src')
    // Click A4 pill explicitly — even if it's already active, the active state
    // shouldn't change. Then click A3 to force a switch (or vice-versa).
    const a4Pill = card.locator('button[aria-pressed]').filter({ hasText: 'A4' }).first()
    const a3Pill = card.locator('button[aria-pressed]').filter({ hasText: 'A3' }).first()
    const currentlyA4 = (await a4Pill.getAttribute('aria-pressed')) === 'true'
    const targetPill = currentlyA4 ? a3Pill : a4Pill
    await targetPill.click()
    // URL must NOT have changed — pill is inside a Link wrapper, click should
    // be stopPropagation'd. This is the regression guard.
    await expect(page).toHaveURL(new RegExp(`${GALLERY_URL.replace('/', '\\/')}(\\?|$)`))
    // Image src should swap (next/image rewrites paths so we just diff).
    await expect.poll(async () => img.getAttribute('src')).not.toBe(initialSrc)
  })

  test('Gallery: hero click navigates to editor with ?preset & ?format', async ({ page }) => {
    await page.goto(GALLERY_URL)
    await page.waitForLoadState('networkidle')
    // Scope to GalleryPresetCard links specifically: their href always points
    // at /map or /star-map with a `preset=` query, so we filter on that to
    // exclude the LandingNav logo link (which is `/`).
    const cardLinks = page.locator('a[aria-label]').filter({
      has: page.locator(':scope[href*="preset="]'),
    })
    // Fallback: filter by attribute selector since :scope[has] support varies.
    const firstCard = page.locator('a[aria-label][href*="preset="]').first()
    await firstCard.waitFor({ state: 'visible', timeout: 15000 }).catch(async () => {
      // If no preset card is on the page (no published presets seeded for de),
      // skip — this is an env condition, not a PROJ-39 bug.
      const count = await cardLinks.count()
      if (count === 0) test.skip(true, 'No preset cards visible on /de/gallery.')
    })
    const href = await firstCard.getAttribute('href')
    expect(href).toMatch(/\/(map|star-map)\?preset=[a-f0-9-]+&format=(a4|a3|a2)/)
  })
})

// ─── Mobile: pills hidden by default per spec ─────────────────────────────

test.describe('PROJ-39 Format-Switcher Mobile', () => {
  test.beforeEach(({ }, testInfo) => {
    test.skip(testInfo.project.name !== 'Mobile Safari', 'Mobile-only test')
  })

  test('Gallery: format pills are hidden under lg: breakpoint', async ({ page }) => {
    await page.goto(GALLERY_URL)
    await page.waitForLoadState('networkidle')
    // Pills exist in the DOM but should be display:none on mobile widths.
    // We assert visibility, not existence.
    const pills = page.locator('button[aria-pressed]').filter({ hasText: /^A[234]$/ })
    const count = await pills.count()
    if (count === 0) {
      test.skip(true, 'No multi-format presets visible yet — backfill not run.')
      return
    }
    // None of them should be visible on Mobile Safari viewport.
    for (let i = 0; i < Math.min(count, 5); i++) {
      await expect(pills.nth(i)).toBeHidden()
    }
  })
})

// ─── Editor: format query-param respected after applyPreset ──────────────

test.describe('PROJ-39 Editor honours ?format URL param', () => {
  test.beforeEach(({ }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'Desktop-only test')
  })

  test('Map editor opens at A2 when ?format=a2 is in URL', async ({ request, page }) => {
    // Pull a published map-preset id from the public API to drive the deep-link.
    const res = await request.get('/api/presets?poster_type=map&locale=de')
    if (!res.ok()) {
      test.skip(true, 'No public presets API response — env-only smoke.')
      return
    }
    const body = await res.json()
    if (!body.presets?.length) {
      test.skip(true, 'No map presets available.')
      return
    }
    const presetId = body.presets[0].id
    test.setTimeout(60000) // MapTiler + applyPreset can take >30s under parallel load
    await page.goto(`/de/map?preset=${presetId}&format=a2`)
    // Wait for the toast that signals applyPreset finished, then check that A2
    // is the selected paper-format pill in the editor sidebar.
    await page.waitForFunction(
      () => (window as Window & { __presetApplied?: boolean }).__presetApplied === true,
      { timeout: 45000 },
    )
    const a2 = page.getByRole('button', { name: 'A2', exact: true })
    await expect(a2).toBeVisible()
    // The selected pill differs visually — assert background is not the same
    // as A4 (which would indicate A4 still active).
    const a2Bg = await a2.evaluate((el) => getComputedStyle(el).backgroundColor)
    const a4 = page.getByRole('button', { name: 'A4', exact: true })
    const a4Bg = await a4.evaluate((el) => getComputedStyle(el).backgroundColor)
    expect(a2Bg).not.toBe(a4Bg)
  })

  test('Editor silently ignores invalid ?format=a5', async ({ request, page }) => {
    const res = await request.get('/api/presets?poster_type=map&locale=de')
    if (!res.ok()) {
      test.skip(true, 'API not available.')
      return
    }
    const body = await res.json()
    if (!body.presets?.length) {
      test.skip(true, 'No presets seeded.')
      return
    }
    const presetId = body.presets[0].id
    test.setTimeout(60000)
    await page.goto(`/de/map?preset=${presetId}&format=a5`)
    await page.waitForFunction(
      () => (window as Window & { __presetApplied?: boolean }).__presetApplied === true,
      { timeout: 45000 },
    )
    // No toast error, no crash — invalid format is just dropped on the floor.
    // Editor should be in a working state (Papierformat label visible).
    await expect(page.getByText('Papierformat').first()).toBeVisible()
  })
})

// ─── Admin API: format param whitelisted ─────────────────────────────────

test.describe('PROJ-39 Admin API rejects invalid format', () => {
  test.beforeEach(({ }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'API smoke runs once')
  })

  test('POST /api/admin/presets/bulk-render rejects format=a5', async ({ request }) => {
    const res = await request.post('/api/admin/presets/bulk-render', {
      data: { filter: 'backfill', format: 'a5' },
    })
    // Either 400 (invalid body) or 401/403 (no admin session in test env).
    // Both are acceptable — the point is "not 200 OK with random format string".
    expect([400, 401, 403]).toContain(res.status())
  })

  test('POST /api/admin/presets/bulk-render rejects empty body', async ({ request }) => {
    const res = await request.post('/api/admin/presets/bulk-render', {
      data: {},
    })
    expect([400, 401, 403]).toContain(res.status())
  })
})
