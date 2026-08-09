import { describe, expect, it, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const requireAdminMock = vi.fn()
const updateMock = vi.fn()

vi.mock('@/lib/admin-auth', () => ({
  requireAdmin: () => requireAdminMock(),
}))

vi.mock('@/lib/supabase-admin', () => ({
  createAdminClient: () => ({
    from: () => ({
      update: (payload: unknown) => {
        updateMock(payload)
        return {
          eq: () => ({
            select: () => ({
              single: async () => ({ data: { id: 'mock', ...(payload as object) }, error: null }),
            }),
          }),
        }
      },
    }),
  }),
}))

const { PATCH } = await import('./route')

beforeEach(() => {
  requireAdminMock.mockReset()
  updateMock.mockReset()
})

function makePatch(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/admin/mockup-sets/abc', {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

const ctx = { params: Promise.resolve({ id: 'abc' }) }

describe('PATCH /api/admin/mockup-sets/[id]', () => {
  it('lehnt Provider-Wechsel ab (400)', async () => {
    requireAdminMock.mockResolvedValue({ ok: true })
    const res = await PATCH(makePatch({ provider: 'local' }), ctx)
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toMatch(/provider/i)
    expect(updateMock).not.toHaveBeenCalled()
  })

  it('akzeptiert Updates an erlaubten Feldern (name, description)', async () => {
    requireAdminMock.mockResolvedValue({ ok: true })
    const res = await PATCH(makePatch({ name: 'Neuer Name' }), ctx)
    expect(res.status).toBe(200)
    expect(updateMock).toHaveBeenCalledWith(expect.objectContaining({ name: 'Neuer Name' }))
  })

  it('akzeptiert das Hochzieren auf eine zweite Orientation', async () => {
    requireAdminMock.mockResolvedValue({ ok: true })
    const res = await PATCH(makePatch({
      local_landscape_overlay_url: 'https://example.com/landscape.png',
      local_landscape_slot: {
        x: 200, y: 300, width: 800, height: 600,
        canvasWidth: 1200, canvasHeight: 1200,
      },
    }), ctx)
    expect(res.status).toBe(200)
  })

  it('lehnt unauthentifizierte Aufrufe ab', async () => {
    requireAdminMock.mockResolvedValue({ ok: false, status: 403 })
    const res = await PATCH(makePatch({ name: 'X' }), ctx)
    expect(res.status).toBe(403)
  })

  it('lehnt invalide UUIDs ab', async () => {
    requireAdminMock.mockResolvedValue({ ok: true })
    const res = await PATCH(makePatch({ desktop_template_uuid: 'not-a-uuid' }), ctx)
    expect(res.status).toBe(400)
  })
})
