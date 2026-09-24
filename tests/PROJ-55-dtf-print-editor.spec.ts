import { test, expect } from '@playwright/test'

/**
 * PROJ-55: DTF-Print-Editor.
 *
 * Geprüft wird, was ohne Anmeldung und ohne echte Zahlung erreichbar ist:
 * der Zugang zum Editor, die Bogen-Grundfunktionen und — mit Nachdruck —
 * die Stellen, an denen der Server dem Client nicht glauben darf. Die
 * Druckfreigabe ist der rechtliche Kern des Produkts; sie muss sich auch
 * mit einem direkten Aufruf an den Checkout nicht umgehen lassen.
 *
 * Bewusst NICHT hier: ein echter Upload und eine echte Bestellung. Dev und
 * Produktion teilen sich eine Datenbank, ein Testlauf schriebe also echte
 * Zeilen und echte Dateien.
 */

const EDITOR_URL = '/de/dtf'

test.describe('PROJ-55 Zugang', () => {
  test('Der Editor ist ohne Anmeldung erreichbar', async ({ page }) => {
    const res = await page.goto(EDITOR_URL)
    expect(res?.status()).toBeLessThan(400)
    // Keine Weiterleitung auf den Login — der Editor ist offen, wie /map.
    await expect(page).toHaveURL(/\/de\/dtf/)
  })

  test('Die Hauptnavigation führt zum DTF-Editor', async ({ page }, testInfo) => {
    await page.goto('/de')
    // Auf dem Handy liegen dieselben Links hinter dem Menü-Knopf; das
    // Sheet ist erst nach dem Öffnen im DOM.
    if (testInfo.project.name !== 'chromium') {
      await page.getByRole('button', { name: 'Menü öffnen' }).click()
    }
    const link = page.getByRole('link', { name: 'DTF-Druck' }).first()
    await expect(link).toHaveAttribute('href', /\/dtf/)
  })
})

test.describe('PROJ-55 Bogen', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(EDITOR_URL)
    await page.waitForLoadState('domcontentloaded')
  })

  test('Drei Bogenformate stehen zur Wahl', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'Desktop-Sidebar')
    await page.getByRole('tab', { name: 'Bogen' }).click()
    for (const label of ['A4', 'A3', '40 × 50 cm']) {
      await expect(page.getByText(label, { exact: true }).first()).toBeVisible()
    }
  })

  test('Die Auflage lässt sich nicht über 99 hinaus erhöhen', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'Desktop-Sidebar')
    await page.getByRole('tab', { name: 'Bogen' }).click()
    const input = page.locator('#dtf-quantity')
    await expect(input).toHaveAttribute('max', '99')

    // Direkt eine zu hohe Zahl eintippen: der Store deckelt, nicht erst der
    // Checkout. Sonst erführe der Kunde es als "Invalid cart" beim Bezahlen.
    await input.fill('500')
    await input.blur()
    await expect(input).toHaveValue('99')

    await expect(page.getByRole('button', { name: 'Auflage erhöhen' })).toBeDisabled()
  })
})

test.describe('PROJ-55 Der Server glaubt dem Client nicht', () => {
  const dtfItem = {
    productId: 'dtf',
    withFrame: false,
    format: 'a4',
    posterType: 'dtf',
    quantity: 1,
    title: 'Bogen 1 (A4)',
    snapshot: { kind: 'dtf-sheet', format: 'a4', quantity: 1, elements: [] },
    projectId: null,
  }

  test('Ohne Druckfreigabe kein DTF-Checkout', async ({ request }) => {
    const res = await request.post('/api/checkout', {
      data: { items: [dtfItem], shippingCountry: 'DE' },
    })
    // Die Freigabe ist der rechtliche Kern — sie darf sich mit einem
    // direkten Aufruf nicht überspringen lassen.
    expect(res.status()).toBe(400)
    expect((await res.json()).error).toMatch(/Freigabe|Rechteinhaber/i)
  })

  test('Ohne Lieferland kein Checkout einer physischen Position', async ({ request }) => {
    const res = await request.post('/api/checkout', {
      data: {
        items: [dtfItem],
        dtfApproval: {
          printApprovedAt: new Date().toISOString(),
          rightsConfirmedAt: new Date().toISOString(),
        },
      },
    })
    // Kein stilles Ausweichen auf Deutschland: Der Tarif und die
    // Adressabfrage bei Stripe haengen beide an diesem Land.
    expect(res.status()).toBe(400)
    expect((await res.json()).error).toMatch(/Lieferland/i)
  })

  test('Fremde Motive kommen nicht in eine Bestellung', async ({ request }) => {
    // Die Bogenbeschreibung ist freies JSON aus dem Warenkorb, und die
    // Druck-Pipeline laedt jede uploadId spaeter mit der Service-Role, also
    // an RLS vorbei. Ohne Pruefung liesse sich fremdes Kundenmaterial
    // drucken und zuschicken. Diese Anfrage hat keine Gast-Sitzung, die ID
    // gehoert ihr also sicher nicht.
    const res = await request.post('/api/checkout', {
      data: {
        items: [
          {
            ...dtfItem,
            snapshot: {
              kind: 'dtf-sheet',
              format: 'a4',
              quantity: 1,
              elements: [
                {
                  id: 'e1',
                  kind: 'image',
                  uploadId: '11111111-1111-4111-8111-111111111111',
                  previewUrl: '',
                  sourceWidthPx: 1000,
                  sourceHeightPx: 1000,
                  xMm: 10,
                  yMm: 10,
                  widthMm: 50,
                  rotationDeg: 0,
                  z: 1,
                },
              ],
            },
          },
        ],
        shippingCountry: 'DE',
        dtfApproval: {
          printApprovedAt: new Date().toISOString(),
          rightsConfirmedAt: new Date().toISOString(),
        },
      },
    })

    expect(res.status()).toBe(400)
    // Die Meldung sagt bewusst nicht, WELCHE ID fehlt -- sonst liesse sich
    // aus der Antwort ablesen, ob eine fremde ID existiert.
    expect((await res.json()).error).toMatch(/zugeordnet|Sitzung/i)
  })

  test('Der Aufräum-Lauf verlangt sein Geheimnis', async ({ request }) => {
    const ohne = await request.post('/api/dtf/cron/cleanup-uploads')
    expect(ohne.status()).toBe(401)

    const falsch = await request.post('/api/dtf/cron/cleanup-uploads', {
      headers: { authorization: 'Bearer falsch' },
    })
    expect(falsch.status()).toBe(401)
  })

  test('Vorschau-URLs gibt es nur zur eigenen Sitzung', async ({ request }) => {
    // Fremde, gültig geformte ID ohne eigene Gast-Sitzung: Die Antwort darf
    // nichts enthalten und nichts über die Existenz der ID verraten.
    const res = await request.post('/api/dtf/uploads/preview-urls', {
      data: { ids: ['11111111-1111-4111-8111-111111111111'] },
    })
    expect(res.status()).toBe(200)
    expect((await res.json()).urls).toEqual({})
  })

  test('Die Vorschau-Route weist unsinnige IDs ab', async ({ request }) => {
    const res = await request.post('/api/dtf/uploads/preview-urls', {
      data: { ids: ['../../etc/passwd'] },
    })
    expect(res.status()).toBe(400)
  })

  test('Die Druckdateien einer Bestellung sind nur für Admins', async ({ request }) => {
    const res = await request.get(
      '/api/admin/orders/00000000-0000-0000-0000-000000000000/dtf-print-files',
    )
    expect(res.status()).toBe(401)
  })
})
