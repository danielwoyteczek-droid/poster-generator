import { describe, expect, it, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

/**
 * Schwerpunkt: Eingabevalidierung und dass die Route die Datei NICHT selbst
 * entgegennimmt, sondern signierte Upload-URLs ausstellt. Der Weg über den
 * Server wäre bei bis zu 50 MB gar nicht möglich — Serverless-Funktionen
 * nehmen nur rund 4,5 MB Body an.
 */

const ownerMock = vi.fn()
const insertMock = vi.fn()
const deleteEqMock = vi.fn()
const signedUploadMock = vi.fn()
const rateLimitMock = vi.fn()

vi.mock('@/lib/dtf-guest-session', async () => {
  const actual = await vi.importActual<typeof import('@/lib/dtf-guest-session')>(
    '@/lib/dtf-guest-session',
  )
  return { ...actual, getUploadOwner: () => ownerMock() }
})

vi.mock('@/lib/supabase-admin', () => ({
  createAdminClient: () => ({
    from: () => ({
      insert: (payload: unknown) => insertMock(payload),
      delete: () => ({ eq: (col: string, val: string) => deleteEqMock(col, val) }),
      select: () => ({
        eq: () => ({
          order: () => ({ limit: async () => ({ data: [], error: null }) }),
        }),
      }),
    }),
    storage: {
      from: () => ({
        createSignedUploadUrl: (path: string) => signedUploadMock(path),
        createSignedUrls: async () => ({ data: [], error: null }),
      }),
    },
  }),
}))

vi.mock('@/lib/rate-limit', () => ({
  rateLimitDb: async (...args: unknown[]) => rateLimitMock(...args),
  getClientIp: () => '203.0.113.7',
}))

const { POST } = await import('./route')

const GUEST = '22222222-2222-4222-8222-222222222222'

beforeEach(() => {
  ownerMock.mockReset()
  insertMock.mockReset()
  deleteEqMock.mockReset()
  signedUploadMock.mockReset()
  rateLimitMock.mockReset()

  rateLimitMock.mockResolvedValue({ ok: true, remaining: 10, retryAfterSeconds: 0 })
  ownerMock.mockResolvedValue({ kind: 'guest', guestSessionId: GUEST })
  insertMock.mockResolvedValue({ error: null })
  deleteEqMock.mockResolvedValue({ error: null })
  signedUploadMock.mockImplementation(async (path: string) => ({
    data: { signedUrl: `https://storage.example/put/${path}`, token: 'tok' },
    error: null,
  }))
})

function post(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/dtf/uploads', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

const VALID = { filename: 'motiv.png', mimeType: 'image/png', byteSize: 12_000_000 }

describe('POST /api/dtf/uploads', () => {
  it('stellt zwei signierte Upload-URLs aus und legt die Zeile an', async () => {
    const res = await POST(post(VALID))
    expect(res.status).toBe(200)

    const json = await res.json()
    expect(json.original.uploadUrl).toContain('original.png')
    expect(json.preview.uploadUrl).toContain('preview.jpg')

    // Original und Vorschau liegen unter der Gast-Sitzung, nicht flach im Bucket.
    expect(json.original.path).toMatch(new RegExp(`^guest/${GUEST}/`))

    const inserted = insertMock.mock.calls[0][0]
    expect(inserted.guest_session_id).toBe(GUEST)
    expect(inserted.user_id).toBeNull()
    expect(inserted.status).toBe('pending')
    // Die Maße sind noch unbekannt — sie kommen erst beim Abschließen.
    expect(inserted.width_px).toBeUndefined()
  })

  it('legt für angemeldete Nutzer unter der User-ID ab', async () => {
    const userId = '11111111-1111-4111-8111-111111111111'
    ownerMock.mockResolvedValue({ kind: 'user', userId })
    const res = await POST(post(VALID))
    expect(res.status).toBe(200)
    expect((await res.json()).original.path).toMatch(new RegExp(`^u/${userId}/`))
    expect(insertMock.mock.calls[0][0].user_id).toBe(userId)
  })

  it('lehnt Dateien über 50 MB ab (400)', async () => {
    const res = await POST(post({ ...VALID, byteSize: 51 * 1024 * 1024 }))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toMatch(/zu groß|50 MB/i)
    expect(insertMock).not.toHaveBeenCalled()
  })

  it('lehnt andere Dateitypen ab (400)', async () => {
    const res = await POST(post({ ...VALID, mimeType: 'image/webp' }))
    expect(res.status).toBe(400)
    expect(insertMock).not.toHaveBeenCalled()
  })

  it('lehnt Größe 0 ab (400)', async () => {
    const res = await POST(post({ ...VALID, byteSize: 0 }))
    expect(res.status).toBe(400)
  })

  it('greift beim Rate-Limit (429) und legt nichts an', async () => {
    rateLimitMock.mockResolvedValue({ ok: false, remaining: 0, retryAfterSeconds: 42 })
    const res = await POST(post(VALID))
    expect(res.status).toBe(429)
    expect(res.headers.get('Retry-After')).toBe('42')
    expect(insertMock).not.toHaveBeenCalled()
  })

  it('räumt die Zeile wieder ab, wenn das Signieren scheitert', async () => {
    // Sonst bliebe eine Karteileiche zurück, für die es nie eine Datei gibt.
    signedUploadMock.mockResolvedValue({ data: null, error: { message: 'boom' } })
    const res = await POST(post(VALID))
    expect(res.status).toBe(500)
    expect(deleteEqMock).toHaveBeenCalledWith('id', expect.any(String))
  })

  it('lehnt kaputtes JSON ab (400)', async () => {
    const req = new NextRequest('http://localhost/api/dtf/uploads', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{kaputt',
    })
    expect((await POST(req)).status).toBe(400)
  })
})
