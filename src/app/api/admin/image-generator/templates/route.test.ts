// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const requireAdminMock = vi.fn()
const insertResult = vi.fn()
const insertMock = vi.fn()

vi.mock('@/lib/admin-auth', () => ({ requireAdmin: () => requireAdminMock() }))
vi.mock('@/lib/supabase-admin', () => ({
  createAdminClient: () => ({
    from: () => ({
      insert: (row: unknown) => {
        insertMock(row)
        return { select: () => ({ single: () => insertResult() }) }
      },
    }),
  }),
}))

const { POST } = await import('./route')

const MOCKUP = '22222222-2222-4222-8222-222222222222'

function call(body: unknown) {
  return POST(new NextRequest('http://localhost/api/admin/image-generator/templates', { method: 'POST', body: JSON.stringify(body) }))
}

beforeEach(() => {
  requireAdminMock.mockReset().mockResolvedValue({ ok: true })
  insertMock.mockReset()
  insertResult.mockReset()
})

describe('POST /api/admin/image-generator/templates', () => {
  it('lehnt Nicht-Admins ab', async () => {
    requireAdminMock.mockResolvedValue({ ok: false, status: 403 })
    expect((await call({ name: 'x', entries: [] })).status).toBe(403)
  })

  it('verlangt Name und mindestens ein Mockup', async () => {
    expect((await call({ name: '  ', entries: [{ mockup_set_id: MOCKUP, overlay_id: null }] })).status).toBe(400)
    const res = await call({ name: 'Standard', entries: [] })
    expect(res.status).toBe(400)
    expect((await res.json()).error).toBe('Eine Vorlage braucht mindestens ein Mockup')
    expect(insertMock).not.toHaveBeenCalled()
  })

  it('meldet einen doppelten Namen als 409', async () => {
    insertResult.mockResolvedValue({ data: null, error: { code: '23505', message: 'duplicate' } })
    const res = await call({ name: 'Standard', entries: [{ mockup_set_id: MOCKUP, overlay_id: null }] })
    expect(res.status).toBe(409)
  })

  it('speichert getrimmten Namen und Einträge', async () => {
    const template = { id: 't1', name: 'Standard', entries: [{ mockup_set_id: MOCKUP, overlay_id: null }], updated_at: 'now' }
    insertResult.mockResolvedValue({ data: template, error: null })
    const res = await call({ name: ' Standard ', entries: template.entries })
    expect(res.status).toBe(201)
    expect(insertMock).toHaveBeenCalledWith({ name: 'Standard', entries: template.entries })
    expect((await res.json()).template).toEqual(template)
  })
})
