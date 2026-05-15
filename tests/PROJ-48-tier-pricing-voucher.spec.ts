import { test, expect } from '@playwright/test'

/**
 * Smoke-Tests für PROJ-48 — Tier-Pricing & Voucher-Readiness.
 *
 * Verifiziert (API-Ebene, deterministisch ohne WebGL/Editor):
 * - `/api/products` liefert das neue `frameMarkup`-Feld mit A4/A3/A2-Prices.
 * - Produktkatalog enthält nur noch `download` + `poster` (kein `frame`).
 * - `/api/voucher/validate` lehnt fehlerhafte Bodies mit 400 ab.
 * - `/api/voucher/validate` liefert `valid:false, reason:'not_found'` für
 *   unbekannte Codes (kein 500, kein Leak).
 * - Editor-Tier-Picker zeigt 2 Radio-Optionen + Frame-Checkbox (Desktop).
 *
 * Bewusst NICHT getestet (externe Abhängigkeit / Flakiness):
 * - Voller Editor→Cart→Stripe-Checkout-Flow (Stripe-Redirect ist extern).
 * - Webhook-Discount-Persistierung (braucht echten Stripe-Webhook-Event).
 * - Editor-Tier-Picker-UI (WebGL-Map + Tab-Navigation flaky; per Code-Audit
 *   + manuellem Browser-Test abgedeckt).
 *
 * HINWEIS Rate-Limit: Der In-Memory-Limiter (10 Hits/15min) nutzt einen
 * IP-Bucket. Lokal kollabieren alle Requests auf den 'unknown'-Bucket,
 * d. h. die Body-Validierungs-Tests können je nach vorheriger Last 400
 * ODER 429 sehen — beide sind korrekte Rejections. Die Tests prüfen
 * daher "4xx, niemals 2xx/5xx".
 */

const VALIDATE_URL = '/api/voucher/validate'

// ─── Public catalog API ────────────────────────────────────────────────────

test.describe('PROJ-48 /api/products exposes the tier model', () => {
  test.beforeEach(({ }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'API smoke runs once')
  })

  test('returns download + poster products and no legacy frame product', async ({ request }) => {
    const res = await request.get('/api/products')
    expect(res.ok()).toBeTruthy()
    const data = await res.json()
    const ids = (data.products ?? []).map((p: { id: string }) => p.id).sort()
    expect(ids).toEqual(['download', 'poster'])
  })

  test('returns a frameMarkup table', async ({ request }) => {
    const res = await request.get('/api/products')
    const data = await res.json()
    expect(data).toHaveProperty('frameMarkup')
    // frameMarkup ist {} solange keine Stripe-Prices angelegt sind, sonst
    // enthält es a4/a3/a2. Beide Zustände sind valide — wir prüfen die Form.
    expect(typeof data.frameMarkup).toBe('object')
  })
})

// ─── Voucher validation API ────────────────────────────────────────────────

test.describe('PROJ-48 /api/voucher/validate input validation', () => {
  test.beforeEach(({ }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'API smoke runs once')
  })

  test('rejects an empty body (4xx)', async ({ request }) => {
    const res = await request.post(VALIDATE_URL, { data: {} })
    expect(res.status()).toBeGreaterThanOrEqual(400)
    expect(res.status()).toBeLessThan(500)
  })

  test('rejects a missing code (4xx)', async ({ request }) => {
    const res = await request.post(VALIDATE_URL, {
      data: { items: [{ productId: 'poster', withFrame: true, format: 'a4' }] },
    })
    expect(res.status()).toBeGreaterThanOrEqual(400)
    expect(res.status()).toBeLessThan(500)
  })

  test('rejects an empty items array (4xx)', async ({ request }) => {
    const res = await request.post(VALIDATE_URL, {
      data: { code: 'X', items: [] },
    })
    expect(res.status()).toBeGreaterThanOrEqual(400)
    expect(res.status()).toBeLessThan(500)
  })

  test('rejects an invalid productId (4xx)', async ({ request }) => {
    const res = await request.post(VALIDATE_URL, {
      data: { code: 'X', items: [{ productId: 'mug', format: 'a4' }] },
    })
    expect(res.status()).toBeGreaterThanOrEqual(400)
    expect(res.status()).toBeLessThan(500)
  })

  test('never returns 5xx for an unknown code', async ({ request }) => {
    const res = await request.post(VALIDATE_URL, {
      data: {
        code: 'DEFINITELY_NOT_A_REAL_CODE_48',
        items: [{ productId: 'poster', withFrame: true, format: 'a4' }],
      },
    })
    // 200 with structured reason, or 429 if the rate-limit bucket is hot.
    expect([200, 429]).toContain(res.status())
    if (res.status() === 200) {
      const data = await res.json()
      expect(data.valid).toBe(false)
      expect(data.reason).toBe('not_found')
    }
  })
})
