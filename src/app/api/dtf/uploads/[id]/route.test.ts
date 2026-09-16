import { describe, expect, it, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

/**
 * Schwerpunkte:
 *  - Besitzprüfung: fremde Uploads liefern 404, nicht 403 (kein Hinweis
 *    darauf, ob die ID existiert)
 *  - Abschluss nur, wenn Original UND Vorschau wirklich in Storage liegen —
 *    sonst zeigte der Editor ein Motiv, das beim Drucken fehlt
 *  - Bestellte Motive lassen sich nicht löschen
 */

const ownerMock = vi.fn()
const rowMock = vi.fn()
const updateMock = vi.fn()
const deleteMock = vi.fn()
const listMock = vi.fn()
const removeMock = vi.fn()

vi.mock('@/lib/dtf-guest-session', async () => {
  const actual = await vi.importActual<typeof import('@/lib/dtf-guest-session')>(
    '@/lib/dtf-guest-session',
  )
  return { ...actual, getUploadOwner: () => ownerMock() }
})

vi.mock('@/lib/supabase-admin', () => ({
  createAdminClient: () => ({
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: async () => rowMock() }) }),
      update: (payload: unknown) => ({ eq: async () => updateMock(payload) }),
      delete: () => ({ eq: async () => deleteMock() }),
    }),
    storage: {
      from: () => ({
        list: (prefix: string) => listMock(prefix),
        remove: (paths: string[]) => removeMock(paths),
      }),
    },
  }),
}))

const { PATCH, DELETE } = await import('./route')

const ID = '44444444-4444-4444-8444-444444444444'
const GUEST_A = '22222222-2222-4222-8222-222222222222'
const GUEST_B = '33333333-3333-4333-8333-333333333333'
const BASE_PATH = `guest/${GUEST_A}/${ID}/original.png`

const ctx = { params: Promise.resolve({ id: ID }) }

beforeEach(() => {
  ownerMock.mockReset()
  rowMock.mockReset()
  updateMock.mockReset()
  deleteMock.mockReset()
  listMock.mockReset()
  removeMock.mockReset()

  ownerMock.mockResolvedValue({ kind: 'guest', guestSessionId: GUEST_A })
  rowMock.mockResolvedValue({
    data: {
      id: ID,
      user_id: null,
      guest_session_id: GUEST_A,
      original_path: BASE_PATH,
      preview_path: null,
      status: 'pending',
      is_ordered: false,
    },
    error: null,
  })
  updateMock.mockResolvedValue({ error: null })
  deleteMock.mockResolvedValue({ error: null })
  listMock.mockResolvedValue({
    data: [{ name: 'original.png' }, { name: 'preview.jpg' }],
    error: null,
  })
  removeMock.mockResolvedValue({ error: null })
})

function patch(body: unknown): NextRequest {
  return new NextRequest(`http://localhost/api/dtf/uploads/${ID}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('PATCH /api/dtf/uploads/[id] — Abschluss', () => {
  it('setzt auf ready und speichert die Maße des Originals', async () => {
    const res = await PATCH(patch({ widthPx: 5906, heightPx: 4724 }), ctx)
    expect(res.status).toBe(200)
    const payload = updateMock.mock.calls[0][0]
    expect(payload.status).toBe('ready')
    expect(payload.width_px).toBe(5906)
    expect(payload.preview_path).toBe(`guest/${GUEST_A}/${ID}/preview.jpg`)
  })

  it('liefert 404 für einen fremden Upload', async () => {
    ownerMock.mockResolvedValue({ kind: 'guest', guestSessionId: GUEST_B })
    const res = await PATCH(patch({ widthPx: 100, heightPx: 100 }), ctx)
    expect(res.status).toBe(404)
    expect(updateMock).not.toHaveBeenCalled()
  })

  it('verweigert den Abschluss, wenn die Vorschau fehlt (409)', async () => {
    listMock.mockResolvedValue({ data: [{ name: 'original.png' }], error: null })
    const res = await PATCH(patch({ widthPx: 100, heightPx: 100 }), ctx)
    expect(res.status).toBe(409)
    expect(updateMock).toHaveBeenCalledWith({ status: 'failed' })
  })

  it('verweigert den Abschluss, wenn das Original fehlt (409)', async () => {
    listMock.mockResolvedValue({ data: [{ name: 'preview.jpg' }], error: null })
    const res = await PATCH(patch({ widthPx: 100, heightPx: 100 }), ctx)
    expect(res.status).toBe(409)
    expect(updateMock).toHaveBeenCalledWith({ status: 'failed' })
  })

  it('lehnt fehlende Maße ab (400)', async () => {
    expect((await PATCH(patch({ widthPx: 100 }), ctx)).status).toBe(400)
  })

  it('lehnt negative Maße ab (400)', async () => {
    expect((await PATCH(patch({ widthPx: -5, heightPx: 100 }), ctx)).status).toBe(400)
  })

  it('lehnt eine ungültige ID ab (400)', async () => {
    const res = await PATCH(patch({ widthPx: 10, heightPx: 10 }), {
      params: Promise.resolve({ id: 'keine-uuid' }),
    })
    expect(res.status).toBe(400)
  })

  it('liefert 401 ohne Sitzung', async () => {
    ownerMock.mockResolvedValue(null)
    expect((await PATCH(patch({ widthPx: 10, heightPx: 10 }), ctx)).status).toBe(401)
  })
})

describe('DELETE /api/dtf/uploads/[id]', () => {
  function del() {
    return new NextRequest(`http://localhost/api/dtf/uploads/${ID}`, { method: 'DELETE' })
  }

  it('löscht Zeile und Storage-Objekte', async () => {
    rowMock.mockResolvedValue({
      data: {
        id: ID,
        user_id: null,
        guest_session_id: GUEST_A,
        original_path: BASE_PATH,
        preview_path: `guest/${GUEST_A}/${ID}/preview.jpg`,
        is_ordered: false,
      },
      error: null,
    })
    const res = await DELETE(del(), ctx)
    expect(res.status).toBe(200)
    expect(removeMock.mock.calls[0][0]).toHaveLength(2)
    expect(deleteMock).toHaveBeenCalled()
  })

  it('verweigert das Löschen bestellter Motive (409)', async () => {
    rowMock.mockResolvedValue({
      data: {
        id: ID,
        user_id: null,
        guest_session_id: GUEST_A,
        original_path: BASE_PATH,
        preview_path: null,
        is_ordered: true,
      },
      error: null,
    })
    const res = await DELETE(del(), ctx)
    expect(res.status).toBe(409)
    expect(removeMock).not.toHaveBeenCalled()
    expect(deleteMock).not.toHaveBeenCalled()
  })

  it('liefert 404 für einen fremden Upload', async () => {
    ownerMock.mockResolvedValue({ kind: 'guest', guestSessionId: GUEST_B })
    const res = await DELETE(del(), ctx)
    expect(res.status).toBe(404)
    expect(deleteMock).not.toHaveBeenCalled()
  })

  it('entfernt die Zeile auch, wenn Storage meckert', async () => {
    // Sonst bliebe das Motiv für den Kunden sichtbar, obwohl er es gelöscht hat.
    removeMock.mockResolvedValue({ error: { message: 'storage weg' } })
    const res = await DELETE(del(), ctx)
    expect(res.status).toBe(200)
    expect(deleteMock).toHaveBeenCalled()
  })
})
