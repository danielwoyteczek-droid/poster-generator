// @vitest-environment node
import { describe, expect, it, vi, beforeEach } from 'vitest'
import sharp from 'sharp'
import { NextRequest } from 'next/server'

// ─── Mocks ─────────────────────────────────────────────────────────────────

const requireAdminMock = vi.fn()
const uploadMock = vi.fn()
const getPublicUrlMock = vi.fn(() => ({ data: { publicUrl: 'https://storage.example.com/mockup-overlays/test-slug/portrait.png' } }))

vi.mock('@/lib/admin-auth', () => ({
  requireAdmin: () => requireAdminMock(),
}))

vi.mock('@/lib/supabase-admin', () => ({
  createAdminClient: () => ({
    storage: {
      from: () => ({
        upload: (path: string, body: Buffer, opts: unknown) => {
          uploadMock(path, body, opts)
          return Promise.resolve({ error: null })
        },
        getPublicUrl: (path: string) => getPublicUrlMock(path),
      }),
    },
  }),
}))

const { POST } = await import('./route')

beforeEach(() => {
  requireAdminMock.mockReset()
  uploadMock.mockReset()
})

// ─── Helpers: Test-PNG mit Magenta-Marker bauen ───────────────────────────

async function buildMagentaPng(width = 1000, height = 1000): Promise<Buffer> {
  const raw = new Uint8Array(width * height * 4)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4
      const inMagenta = x >= 200 && x < 700 && y >= 100 && y < 800
      if (inMagenta) {
        raw[i] = 255; raw[i + 1] = 13; raw[i + 2] = 255
      } else {
        raw[i] = 240; raw[i + 1] = 240; raw[i + 2] = 240
      }
      raw[i + 3] = 255
    }
  }
  return sharp(raw, { raw: { width, height, channels: 4 } }).png().toBuffer()
}

async function buildPlainPng(width = 1000, height = 1000): Promise<Buffer> {
  const raw = new Uint8Array(width * height * 4).fill(200)
  for (let i = 3; i < raw.length; i += 4) raw[i] = 255
  return sharp(raw, { raw: { width, height, channels: 4 } }).png().toBuffer()
}

function makeFormDataRequest(fields: Record<string, string | Blob>): NextRequest {
  const fd = new FormData()
  for (const [k, v] of Object.entries(fields)) {
    if (v instanceof Blob) fd.set(k, v, k === 'file' ? 'overlay.png' : undefined)
    else fd.set(k, v)
  }
  return new NextRequest('http://localhost/api/admin/mockup-sets/upload-overlay', {
    method: 'POST',
    body: fd,
  })
}

// ─── Tests ────────────────────────────────────────────────────────────────

describe('POST /api/admin/mockup-sets/upload-overlay', () => {
  it('lehnt unauthentifizierte Aufrufe ab', async () => {
    requireAdminMock.mockResolvedValue({ ok: false, status: 401 })
    const res = await POST(makeFormDataRequest({}))
    expect(res.status).toBe(401)
  })

  it('akzeptiert PNG mit Magenta-Marker und extrahiert Slot automatisch', async () => {
    requireAdminMock.mockResolvedValue({ ok: true })
    const png = await buildMagentaPng()
    const res = await POST(makeFormDataRequest({
      file: new Blob([png], { type: 'image/png' }),
      slug: 'test-slug',
      orientation: 'portrait',
    }))

    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.url).toContain('mockup-overlays/test-slug/portrait.png')
    expect(json.slot).toMatchObject({
      canvasWidth: 1000,
      canvasHeight: 1000,
    })
    // Mit Dilation: x ≈ 198 (200-2), width ≈ 504 (500+4)
    expect(json.slot.x).toBeGreaterThanOrEqual(198)
    expect(json.slot.x).toBeLessThanOrEqual(200)
    expect(json.slot.width).toBeGreaterThanOrEqual(500)
    expect(json.slot.width).toBeLessThanOrEqual(504)
    expect(uploadMock).toHaveBeenCalledWith(
      'test-slug/portrait.png',
      expect.any(Buffer),
      expect.objectContaining({ contentType: 'image/png', upsert: true }),
    )
  })

  it('lehnt PNG ohne Magenta-Marker ab (wenn kein slot_override gegeben)', async () => {
    requireAdminMock.mockResolvedValue({ ok: true })
    const png = await buildPlainPng()
    const res = await POST(makeFormDataRequest({
      file: new Blob([png], { type: 'image/png' }),
      slug: 'no-marker',
      orientation: 'portrait',
    }))
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.code).toBe('no_magenta')
    expect(uploadMock).not.toHaveBeenCalled()
  })

  it('akzeptiert manuelles Slot-Override ohne Magenta', async () => {
    requireAdminMock.mockResolvedValue({ ok: true })
    const png = await buildPlainPng()
    const res = await POST(makeFormDataRequest({
      file: new Blob([png], { type: 'image/png' }),
      slug: 'manual-slot',
      orientation: 'landscape',
      slot_override: JSON.stringify({ x: 100, y: 100, width: 500, height: 400 }),
    }))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.slot).toEqual({
      x: 100, y: 100, width: 500, height: 400,
      canvasWidth: 1000, canvasHeight: 1000,
    })
  })

  it('lehnt slot_override außerhalb der Canvas-Grenzen ab', async () => {
    requireAdminMock.mockResolvedValue({ ok: true })
    const png = await buildPlainPng()
    const res = await POST(makeFormDataRequest({
      file: new Blob([png], { type: 'image/png' }),
      slug: 'oob',
      orientation: 'portrait',
      slot_override: JSON.stringify({ x: 900, y: 900, width: 500, height: 500 }),
    }))
    expect(res.status).toBe(400)
  })

  it('lehnt ungültige orientation ab', async () => {
    requireAdminMock.mockResolvedValue({ ok: true })
    const png = await buildMagentaPng()
    const res = await POST(makeFormDataRequest({
      file: new Blob([png], { type: 'image/png' }),
      slug: 'x',
      orientation: 'square',
    }))
    expect(res.status).toBe(400)
  })

  it('lehnt ungültigen Slug ab', async () => {
    requireAdminMock.mockResolvedValue({ ok: true })
    const png = await buildMagentaPng()
    const res = await POST(makeFormDataRequest({
      file: new Blob([png], { type: 'image/png' }),
      slug: 'Has Spaces!',
      orientation: 'portrait',
    }))
    expect(res.status).toBe(400)
  })

  it('lehnt Nicht-PNG-Files ab', async () => {
    requireAdminMock.mockResolvedValue({ ok: true })
    const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0])
    const res = await POST(makeFormDataRequest({
      file: new Blob([jpeg], { type: 'image/jpeg' }),
      slug: 'jpeg-test',
      orientation: 'portrait',
    }))
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.code).toBe('not_png')
  })
})
