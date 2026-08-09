import { describe, expect, it, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// ─── Mocks ─────────────────────────────────────────────────────────────────

const requireAdminMock = vi.fn()
const insertMock = vi.fn()

vi.mock('@/lib/admin-auth', () => ({
  requireAdmin: () => requireAdminMock(),
}))

vi.mock('@/lib/supabase-admin', () => ({
  createAdminClient: () => ({
    from: () => ({
      insert: (payload: unknown) => {
        insertMock(payload)
        return {
          select: () => ({
            single: async () => ({ data: { id: 'mock-id', ...(payload as object) }, error: null }),
          }),
        }
      },
      select: () => ({
        order: async () => ({ data: [], error: null }),
      }),
    }),
  }),
}))

// Import erst NACH den vi.mock-Aufrufen.
const { POST } = await import('./route')

beforeEach(() => {
  requireAdminMock.mockReset()
  insertMock.mockReset()
})

function makePost(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/admin/mockup-sets', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

// ─── Tests ────────────────────────────────────────────────────────────────

describe('POST /api/admin/mockup-sets', () => {
  it('lehnt unauthentifizierte Aufrufe ab (401)', async () => {
    requireAdminMock.mockResolvedValue({ ok: false, status: 401 })
    const res = await POST(makePost({}))
    expect(res.status).toBe(401)
  })

  it('akzeptiert ein gültiges dynamic_mockups-Set', async () => {
    requireAdminMock.mockResolvedValue({ ok: true })
    const payload = {
      provider: 'dynamic_mockups',
      slug: 'test-frame',
      name: 'Test Frame',
      desktop_template_uuid: '12345678-1234-4567-89ab-123456789012',
      desktop_smart_object_uuid: '12345678-1234-4567-89ab-123456789013',
      mobile_template_uuid: '12345678-1234-4567-89ab-123456789014',
      mobile_smart_object_uuid: '12345678-1234-4567-89ab-123456789015',
    }
    const res = await POST(makePost(payload))
    expect(res.status).toBe(201)
    expect(insertMock).toHaveBeenCalledWith(expect.objectContaining({ provider: 'dynamic_mockups' }))
  })

  it('akzeptiert ein gültiges local-Set mit Portrait-Overlay', async () => {
    requireAdminMock.mockResolvedValue({ ok: true })
    const payload = {
      provider: 'local',
      slug: 'local-frame',
      name: 'Local Frame',
      local_portrait_overlay_url: 'https://storage.example.com/mockup-overlays/local-frame/portrait.png',
      local_portrait_slot: {
        x: 388, y: 235, width: 727, height: 1033,
        canvasWidth: 1500, canvasHeight: 1500,
      },
    }
    const res = await POST(makePost(payload))
    expect(res.status).toBe(201)
    expect(insertMock).toHaveBeenCalledWith(expect.objectContaining({ provider: 'local' }))
  })

  it('lehnt local-Set ohne mindestens eine Orientierung ab', async () => {
    requireAdminMock.mockResolvedValue({ ok: true })
    const payload = {
      provider: 'local',
      slug: 'no-orientation',
      name: 'No Orientation',
    }
    const res = await POST(makePost(payload))
    expect(res.status).toBe(400)
    expect(insertMock).not.toHaveBeenCalled()
  })

  it('lehnt local-Set ab, bei dem Overlay-URL ohne Slot gesetzt ist', async () => {
    requireAdminMock.mockResolvedValue({ ok: true })
    const payload = {
      provider: 'local',
      slug: 'half-config',
      name: 'Half',
      local_portrait_overlay_url: 'https://example.com/x.png',
      // local_portrait_slot fehlt absichtlich
    }
    const res = await POST(makePost(payload))
    expect(res.status).toBe(400)
  })

  it('lehnt dynamic_mockups-Set ohne UUIDs ab', async () => {
    requireAdminMock.mockResolvedValue({ ok: true })
    const payload = {
      provider: 'dynamic_mockups',
      slug: 'no-uuids',
      name: 'No UUIDs',
    }
    const res = await POST(makePost(payload))
    expect(res.status).toBe(400)
  })

  it('lehnt unbekannten Provider ab', async () => {
    requireAdminMock.mockResolvedValue({ ok: true })
    const res = await POST(makePost({ provider: 'cloudinary', slug: 'x', name: 'Y' }))
    expect(res.status).toBe(400)
  })
})
