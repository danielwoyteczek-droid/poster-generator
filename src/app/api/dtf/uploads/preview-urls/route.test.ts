import { describe, expect, it, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

/**
 * Schwerpunkt: Die Route darf nur Vorschauen herausgeben, die dem Aufrufer
 * gehören. Sie ist die Quelle der Bilder im Freigabe-Dialog — gäbe sie
 * fremde URLs aus, liesse sich mit geratenen IDs fremdes Kundenmaterial
 * abziehen.
 */

const ownerMock = vi.fn()
const eqMock = vi.fn()
const inMock = vi.fn()
const signedUrlsMock = vi.fn()
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
      select: () => ({
        in: (col: string, ids: string[]) => {
          inMock(col, ids)
          return {
            eq: () => ({
              limit: () => ({
                // Die Besitz-Einschränkung kommt als zweites `.eq()` —
                // dieser Zweig bildet die Kette bis zum Ergebnis nach.
                eq: (col2: string, val: string) => eqMock(col2, val),
              }),
            }),
          }
        },
      }),
    }),
    storage: {
      from: () => ({
        createSignedUrls: (paths: string[], ttl: number) => signedUrlsMock(paths, ttl),
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
const ID_A = '11111111-1111-4111-8111-111111111111'
const ID_B = '33333333-3333-4333-8333-333333333333'

function req(body: unknown) {
  return new NextRequest('http://localhost:3000/api/dtf/uploads/preview-urls', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  ownerMock.mockReset()
  eqMock.mockReset()
  inMock.mockReset()
  signedUrlsMock.mockReset()
  rateLimitMock.mockReset()
  rateLimitMock.mockResolvedValue({ ok: true, remaining: 10, retryAfterSeconds: 0 })
  ownerMock.mockResolvedValue({ kind: 'guest', guestSessionId: GUEST })
})

describe('POST /api/dtf/uploads/preview-urls', () => {
  it('schränkt die Abfrage auf die Sitzung des Aufrufers ein', async () => {
    eqMock.mockResolvedValue({ data: [{ id: ID_A, preview_path: 'anon/a.png' }], error: null })
    signedUrlsMock.mockResolvedValue({
      data: [{ path: 'anon/a.png', signedUrl: 'https://signed/a' }],
      error: null,
    })

    const res = await POST(req({ ids: [ID_A] }))

    expect(res.status).toBe(200)
    expect(eqMock).toHaveBeenCalledWith('guest_session_id', GUEST)
    await expect(res.json()).resolves.toEqual({ urls: { [ID_A]: 'https://signed/a' } })
  })

  it('liefert fremde IDs schlicht nicht aus, statt sie zu melden', async () => {
    // Die Abfrage findet nur die eigene Zeile — die fremde ID fällt an der
    // Besitz-Einschränkung heraus und darf in der Antwort nicht auftauchen.
    eqMock.mockResolvedValue({ data: [{ id: ID_A, preview_path: 'anon/a.png' }], error: null })
    signedUrlsMock.mockResolvedValue({
      data: [{ path: 'anon/a.png', signedUrl: 'https://signed/a' }],
      error: null,
    })

    const res = await POST(req({ ids: [ID_A, ID_B] }))
    const payload = (await res.json()) as { urls: Record<string, string> }

    expect(res.status).toBe(200)
    expect(payload.urls).toHaveProperty(ID_A)
    expect(payload.urls).not.toHaveProperty(ID_B)
  })

  it('gibt ohne Sitzung nichts heraus', async () => {
    ownerMock.mockResolvedValue(null)

    const res = await POST(req({ ids: [ID_A] }))

    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toEqual({ urls: {} })
    expect(inMock).not.toHaveBeenCalled()
  })

  it('weist eine ID ab, die keine UUID ist', async () => {
    const res = await POST(req({ ids: ['../../etc/passwd'] }))

    expect(res.status).toBe(400)
    expect(inMock).not.toHaveBeenCalled()
  })

  it('weist eine leere Liste ab', async () => {
    const res = await POST(req({ ids: [] }))
    expect(res.status).toBe(400)
  })

  it('bremst zu viele Anfragen', async () => {
    rateLimitMock.mockResolvedValue({ ok: false, remaining: 0, retryAfterSeconds: 42 })

    const res = await POST(req({ ids: [ID_A] }))

    expect(res.status).toBe(429)
    expect(res.headers.get('Retry-After')).toBe('42')
  })
})
