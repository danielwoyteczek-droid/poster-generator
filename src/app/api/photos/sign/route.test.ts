import { describe, expect, it, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

/**
 * Der Kern dieser Route ist die Besitzprüfung. Sie ersetzt die entfernten
 * anon-Policies auf `user-photos`, die jedem Gast Zugriff auf alle
 * Gast-Uploads gaben — die Tests hier sind der Nachweis, dass die Lücke
 * wirklich zu ist.
 */

const getUserMock = vi.fn()
const removeMock = vi.fn()
const createSignedUrlMock = vi.fn()

vi.mock('@/lib/supabase-server', () => ({
  createClient: async () => ({ auth: { getUser: () => getUserMock() } }),
}))

vi.mock('@/lib/supabase-admin', () => ({
  createAdminClient: () => ({
    storage: {
      from: () => ({
        remove: (paths: string[]) => removeMock(paths),
        createSignedUrl: (path: string, ttl: number) => createSignedUrlMock(path, ttl),
      }),
    },
  }),
}))

vi.mock('@/lib/rate-limit', () => ({
  rateLimitDb: async () => ({ ok: true, remaining: 10, retryAfterSeconds: 0 }),
  getClientIp: () => '203.0.113.1',
}))

const { POST } = await import('./route')

const USER_ID = '11111111-1111-4111-8111-111111111111'
const GUEST_A = '22222222-2222-4222-8222-222222222222'
const GUEST_B = '33333333-3333-4333-8333-333333333333'

beforeEach(() => {
  getUserMock.mockReset()
  removeMock.mockReset()
  createSignedUrlMock.mockReset()
  getUserMock.mockResolvedValue({ data: { user: null } })
  createSignedUrlMock.mockResolvedValue({
    data: { signedUrl: 'https://storage.example/signed' },
    error: null,
  })
  removeMock.mockResolvedValue({ error: null })
})

function post(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/photos/sign', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/photos/sign — angemeldete Nutzer', () => {
  it('signiert ein Foto im eigenen Ordner', async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: USER_ID } } })
    const res = await POST(post({ storagePath: `${USER_ID}/2026-08/x.jpg` }))
    expect(res.status).toBe(200)
    expect((await res.json()).signedUrl).toBe('https://storage.example/signed')
  })

  it('verweigert den Ordner eines anderen Nutzers (403)', async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: USER_ID } } })
    const res = await POST(post({ storagePath: `${GUEST_A}/2026-08/x.jpg` }))
    expect(res.status).toBe(403)
    expect(createSignedUrlMock).not.toHaveBeenCalled()
  })

  it('verweigert Gast-Ordner, auch mit passender Gast-ID im Body', async () => {
    // Ein angemeldeter Nutzer darf sich nicht per mitgeschickter Gast-ID
    // Zugriff auf die anon-Ablage verschaffen.
    getUserMock.mockResolvedValue({ data: { user: { id: USER_ID } } })
    const res = await POST(
      post({ storagePath: `anon/${GUEST_A}/x.jpg`, guestSessionId: GUEST_A }),
    )
    expect(res.status).toBe(403)
  })
})

describe('POST /api/photos/sign — Gäste', () => {
  it('signiert ein Foto der eigenen Sitzung', async () => {
    const res = await POST(
      post({ storagePath: `anon/${GUEST_A}/2026-08/x.jpg`, guestSessionId: GUEST_A }),
    )
    expect(res.status).toBe(200)
  })

  it('verweigert die Sitzung eines anderen Gastes (403)', async () => {
    const res = await POST(
      post({ storagePath: `anon/${GUEST_B}/2026-08/x.jpg`, guestSessionId: GUEST_A }),
    )
    expect(res.status).toBe(403)
    expect(createSignedUrlMock).not.toHaveBeenCalled()
  })

  it('verweigert ohne Sitzungs-ID (403)', async () => {
    const res = await POST(post({ storagePath: `anon/${GUEST_A}/x.jpg` }))
    expect(res.status).toBe(403)
  })

  it('lässt sich nicht durch einen Präfix-Trick austricksen', async () => {
    // Mit `startsWith` hätte `anon/2222…2222` auch `anon/2222…2222-evil`
    // freigegeben. Die Prüfung arbeitet deshalb auf Pfadsegmenten.
    const res = await POST(
      post({ storagePath: `anon/${GUEST_A}-evil/x.jpg`, guestSessionId: GUEST_A }),
    )
    expect(res.status).toBe(403)
  })

  it('verweigert Pfad-Traversal', async () => {
    const res = await POST(
      post({ storagePath: `anon/${GUEST_A}/../${GUEST_B}/x.jpg`, guestSessionId: GUEST_A }),
    )
    expect(res.status).toBe(403)
  })
})

describe('POST /api/photos/sign — Löschen', () => {
  it('löscht das eigene Foto', async () => {
    const path = `anon/${GUEST_A}/x.jpg`
    const res = await POST(post({ storagePath: path, guestSessionId: GUEST_A, action: 'delete' }))
    expect(res.status).toBe(200)
    expect(removeMock).toHaveBeenCalledWith([path])
  })

  it('löscht kein fremdes Foto', async () => {
    const res = await POST(
      post({ storagePath: `anon/${GUEST_B}/x.jpg`, guestSessionId: GUEST_A, action: 'delete' }),
    )
    expect(res.status).toBe(403)
    expect(removeMock).not.toHaveBeenCalled()
  })
})

describe('POST /api/photos/sign — Eingabevalidierung', () => {
  it('lehnt fehlenden Pfad ab (400)', async () => {
    const res = await POST(post({ guestSessionId: GUEST_A }))
    expect(res.status).toBe(400)
  })

  it('lehnt eine Gast-ID ab, die keine UUID ist (400)', async () => {
    const res = await POST(post({ storagePath: 'anon/x/y.jpg', guestSessionId: 'nicht-uuid' }))
    expect(res.status).toBe(400)
  })

  it('lehnt kaputtes JSON ab (400)', async () => {
    const req = new NextRequest('http://localhost/api/photos/sign', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{kaputt',
    })
    expect((await POST(req)).status).toBe(400)
  })
})
