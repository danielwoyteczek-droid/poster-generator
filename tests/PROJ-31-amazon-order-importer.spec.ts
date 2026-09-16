import { test, expect } from '@playwright/test'

/**
 * PROJ-31: Amazon-Custom-Anpassungsdaten-Importer.
 *
 * Nur, was ohne Admin-Anmeldung prüfbar ist: Das Repo hat keine
 * E2E-Anmeldung, und Dev und Prod teilen sich eine Datenbank — ein Test,
 * der den Eingang mit gültigem Geheimnis aufruft, schriebe echte Zeilen.
 * Geprüft wird deshalb der Zugriffsschutz: Die Queue enthält Käufereingaben
 * (Namen, Wunschadresse), und der Eingang darf nur vom Abholer kommen.
 */

const FAKE_ID = '00000000-0000-0000-0000-000000000000'

test.describe('PROJ-31 Zugriffsschutz der Admin-Schnittstellen', () => {
  const readRoutes = [
    '/api/admin/amazon/orders',
    `/api/admin/amazon/orders/${FAKE_ID}`,
    `/api/admin/amazon/orders/${FAKE_ID}/editor`,
    '/api/admin/amazon/skus',
  ]

  for (const route of readRoutes) {
    test(`Ohne Anmeldung liefert ${route} keine Bestelldaten`, async ({ request }) => {
      const res = await request.get(route)
      expect(res.status()).toBe(401)
      const body = await res.json()
      expect(body).not.toHaveProperty('items')
      expect(body).not.toHaveProperty('customization_item')
    })
  }

  test('Ohne Anmeldung lässt sich keine Bestellung als gedruckt abhaken oder korrigieren', async ({ request }) => {
    for (const data of [
      { action: 'mark_printed' },
      { action: 'correct_field', key: 'names', value: 'x' },
      { action: 'reset_field', key: 'names' },
      { action: 'print_file_created' },
    ]) {
      const res = await request.patch(`/api/admin/amazon/orders/${FAKE_ID}`, { data })
      expect(res.status()).toBe(401)
    }
  })

  test('Ohne Anmeldung lässt sich kein Editor-Zustand zurückschreiben', async ({ request }) => {
    const res = await request.put(`/api/admin/amazon/orders/${FAKE_ID}/editor`, {
      data: { editor_state: { textBlocks: [], viewState: {} } },
    })
    expect(res.status()).toBe(401)
  })

  test('Ohne Anmeldung lässt sich keine SKU-Zuordnung oder Notiz ändern', async ({ request }) => {
    const res = await request.patch(`/api/admin/amazon/skus/${FAKE_ID}`, {
      data: { notes: 'x', reresolve: false },
    })
    expect(res.status()).toBe(401)
  })
})

test.describe('PROJ-31 Admin-Seiten', () => {
  for (const path of [
    '/private/admin/amazon/orders',
    '/private/admin/amazon/skus',
    `/private/admin/amazon/orders/${FAKE_ID}/vorschau`,
  ]) {
    test(`${path} leitet ohne Anmeldung zum Login`, async ({ request }) => {
      const res = await request.get(path, { maxRedirects: 0 })
      expect([302, 307]).toContain(res.status())
      expect(res.headers()['location']).toContain('/login')
    })
  }
})

test.describe('PROJ-31 Eingang vom Abholer', () => {
  const body = { items: [] }

  test('ohne Geheimnis wird abgewiesen', async ({ request }) => {
    const res = await request.post('/api/amazon/ingest', { data: body })
    expect(res.status()).toBe(401)
    expect((await res.json()).accepted).toBe(0)
  })

  test('mit falschem Geheimnis wird abgewiesen', async ({ request }) => {
    const res = await request.post('/api/amazon/ingest', {
      data: body,
      headers: { Authorization: 'Bearer falsches-geheimnis' },
    })
    expect(res.status()).toBe(401)
  })

  test('mit leerem Bearer wird abgewiesen', async ({ request }) => {
    const res = await request.post('/api/amazon/ingest', {
      data: body,
      headers: { Authorization: 'Bearer ' },
    })
    expect(res.status()).toBe(401)
  })

  test('nimmt nur POST an', async ({ request }) => {
    const res = await request.get('/api/amazon/ingest')
    expect(res.status()).toBe(405)
  })
})
