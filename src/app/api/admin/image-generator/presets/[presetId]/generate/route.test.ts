// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const requireAdminMock = vi.fn()
const generateImagesMock = vi.fn()

vi.mock('@sentry/nextjs', () => ({ captureException: vi.fn() }))
vi.mock('@/lib/admin-auth', () => ({ requireAdmin: () => requireAdminMock() }))
vi.mock('@/lib/supabase-admin', () => ({ createAdminClient: () => ({}) }))
vi.mock('@/lib/image-generator/server', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/image-generator/server')>()),
  generateImages: (...args: unknown[]) => generateImagesMock(...args),
}))

const { POST } = await import('./route')
const { GeneratorError } = await import('@/lib/image-generator/server')

const PRESET = '11111111-1111-4111-8111-111111111111'
const MOCKUP = '22222222-2222-4222-8222-222222222222'

function call(body: unknown, presetId = PRESET) {
  const req = new NextRequest(`http://localhost/api/admin/image-generator/presets/${presetId}/generate`, {
    method: 'POST',
    body: JSON.stringify(body),
  })
  return POST(req, { params: Promise.resolve({ presetId }) })
}

const validBody = { entries: [{ mockup_set_id: MOCKUP, overlay_id: null }], palette_ids: [] }

beforeEach(() => {
  requireAdminMock.mockReset()
  generateImagesMock.mockReset()
  requireAdminMock.mockResolvedValue({ ok: true })
})

describe('POST /api/admin/image-generator/presets/[presetId]/generate', () => {
  it('lehnt nicht angemeldete Aufrufe ab', async () => {
    requireAdminMock.mockResolvedValue({ ok: false, status: 401 })
    expect((await call(validBody)).status).toBe(401)
    expect(generateImagesMock).not.toHaveBeenCalled()
  })

  it('lehnt Nicht-Admins ab', async () => {
    requireAdminMock.mockResolvedValue({ ok: false, status: 403 })
    expect((await call(validBody)).status).toBe(403)
  })

  it('prüft die Preset-ID', async () => {
    expect((await call(validBody, 'kein-uuid')).status).toBe(400)
  })

  it('verlangt mindestens ein Mockup', async () => {
    const res = await call({ entries: [], palette_ids: [] })
    expect(res.status).toBe(400)
    expect((await res.json()).error).toBe('Mindestens ein Mockup wählen')
  })

  it('lehnt ungültige Mockup-IDs und fehlende Felder ab', async () => {
    expect((await call({ entries: [{ mockup_set_id: 'x', overlay_id: null }], palette_ids: [] })).status).toBe(400)
    expect((await call({ entries: [{ mockup_set_id: MOCKUP }] })).status).toBe(400)
  })

  it('reicht gültige Eingaben durch und liefert das Ergebnis', async () => {
    const result = { images: [], completed_now: 1, worker_triggered: false, worker_error: null }
    generateImagesMock.mockResolvedValue(result)
    const res = await call(validBody)
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual(result)
    expect(generateImagesMock).toHaveBeenCalledWith({}, PRESET, validBody)
  })

  it('übersetzt fachliche Fehler in ihren Status', async () => {
    generateImagesMock.mockRejectedValue(new GeneratorError('Preset nicht gefunden', 404))
    const res = await call(validBody)
    expect(res.status).toBe(404)
    expect((await res.json()).error).toBe('Preset nicht gefunden')
  })

  it('meldet unerwartete Fehler als 500', async () => {
    generateImagesMock.mockRejectedValue(new Error('boom'))
    expect((await call(validBody)).status).toBe(500)
  })
})
