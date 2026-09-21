// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'
import sharp from 'sharp'
import { NextRequest } from 'next/server'

const requireAdminMock = vi.fn()
const uploadMock = vi.fn()
const insertMock = vi.fn()

vi.mock('@sentry/nextjs', () => ({ captureException: vi.fn() }))
vi.mock('@/lib/admin-auth', () => ({ requireAdmin: () => requireAdminMock() }))
vi.mock('@/lib/supabase-admin', () => ({
  createAdminClient: () => ({
    storage: {
      from: () => ({
        upload: (path: string) => { uploadMock(path); return Promise.resolve({ error: null }) },
        getPublicUrl: (path: string) => ({ data: { publicUrl: `https://cdn.example/${path}` } }),
        remove: () => Promise.resolve({}),
      }),
    },
    from: () => ({
      insert: (row: Record<string, unknown>) => {
        insertMock(row)
        return { select: () => ({ single: () => Promise.resolve({ data: { ...row, created_at: 'now' }, error: null }) }) }
      },
    }),
  }),
}))

const { POST } = await import('./route')

async function png(alpha: boolean): Promise<Uint8Array> {
  const buf = await sharp({
    create: { width: 900, height: 1200, channels: alpha ? 4 : 3, background: alpha ? { r: 0, g: 0, b: 0, alpha: 0 } : { r: 255, g: 255, b: 255 } },
  }).png().toBuffer()
  return new Uint8Array(buf)
}

function call(fields: Record<string, string | Blob>) {
  const fd = new FormData()
  for (const [k, v] of Object.entries(fields)) {
    if (v instanceof Blob) fd.set(k, v, 'overlay.png')
    else fd.set(k, v)
  }
  return POST(new NextRequest('http://localhost/api/admin/image-generator/overlays', { method: 'POST', body: fd }))
}

beforeEach(() => {
  requireAdminMock.mockReset().mockResolvedValue({ ok: true })
  uploadMock.mockReset()
  insertMock.mockReset()
})

describe('POST /api/admin/image-generator/overlays', () => {
  it('lehnt nicht angemeldete Aufrufe ab', async () => {
    requireAdminMock.mockResolvedValue({ ok: false, status: 401 })
    expect((await call({})).status).toBe(401)
  })

  it('verlangt Datei, Name und gültige Ausrichtung', async () => {
    const file = new Blob([await png(true)], { type: 'image/png' })
    expect((await call({ name: 'Pfeil', orientation: 'portrait' })).status).toBe(400)
    expect((await call({ file, orientation: 'portrait' })).status).toBe(400)
    expect((await call({ file, name: 'Pfeil', orientation: 'diagonal' })).status).toBe(400)
    expect(uploadMock).not.toHaveBeenCalled()
  })

  it('lehnt PNGs ohne Transparenz ab', async () => {
    const res = await call({ file: new Blob([await png(false)], { type: 'image/png' }), name: 'Voll', orientation: 'portrait' })
    expect(res.status).toBe(400)
    expect((await res.json()).error).toMatch(/Transparenz/)
  })

  it('speichert Datei und Bibliothekseintrag', async () => {
    const res = await call({ file: new Blob([await png(true)], { type: 'image/png' }), name: ' Pfeil ', orientation: 'landscape' })
    expect(res.status).toBe(201)
    const { overlay } = await res.json()
    expect(overlay).toMatchObject({ name: 'Pfeil', orientation: 'landscape', width: 900, height: 1200 })
    expect(uploadMock.mock.calls[0][0]).toMatch(/^image-overlays\/[0-9a-f-]+\.png$/)
    expect(insertMock).toHaveBeenCalledTimes(1)
  })
})
