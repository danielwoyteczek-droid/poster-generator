/**
 * PROJ-49: OAuth-Helper unit tests.
 *
 * The OAuth route handlers are integration-heavy (cookies + DB + external
 * fetch) and tested at the integration layer. Here we cover the pure helpers
 * that compose the flow.
 */

import { describe, it, expect } from 'vitest'
import {
  buildAuthorizeUrl,
  generatePkcePair,
  generateState,
  ETSY_REQUIRED_SCOPES,
} from './oauth'

describe('generatePkcePair', () => {
  it('produces a verifier and a challenge', () => {
    const { codeVerifier, codeChallenge } = generatePkcePair()
    expect(codeVerifier.length).toBeGreaterThanOrEqual(43)
    expect(codeVerifier.length).toBeLessThanOrEqual(128)
    expect(codeChallenge.length).toBeGreaterThan(0)
    // URL-safe base64: only A-Za-z0-9_- (no padding)
    expect(codeVerifier).toMatch(/^[A-Za-z0-9_-]+$/)
    expect(codeChallenge).toMatch(/^[A-Za-z0-9_-]+$/)
  })

  it('produces different verifiers on each call', () => {
    const a = generatePkcePair()
    const b = generatePkcePair()
    expect(a.codeVerifier).not.toBe(b.codeVerifier)
    expect(a.codeChallenge).not.toBe(b.codeChallenge)
  })
})

describe('generateState', () => {
  it('produces a URL-safe random string', () => {
    const s = generateState()
    expect(s.length).toBeGreaterThanOrEqual(20)
    expect(s).toMatch(/^[A-Za-z0-9_-]+$/)
  })

  it('produces different states on each call', () => {
    expect(generateState()).not.toBe(generateState())
  })
})

describe('buildAuthorizeUrl', () => {
  it('contains all required params with required scopes', () => {
    const url = new URL(
      buildAuthorizeUrl({
        clientId: 'test-client-id',
        redirectUri: 'http://localhost:3000/api/etsy/oauth/callback',
        state: 'st4te',
        codeChallenge: 'ch4llenge',
      }),
    )
    expect(url.origin + url.pathname).toBe(
      'https://www.etsy.com/oauth/connect',
    )
    expect(url.searchParams.get('response_type')).toBe('code')
    expect(url.searchParams.get('client_id')).toBe('test-client-id')
    expect(url.searchParams.get('redirect_uri')).toBe(
      'http://localhost:3000/api/etsy/oauth/callback',
    )
    expect(url.searchParams.get('state')).toBe('st4te')
    expect(url.searchParams.get('code_challenge')).toBe('ch4llenge')
    expect(url.searchParams.get('code_challenge_method')).toBe('S256')

    const scopes = url.searchParams.get('scope')?.split(' ') ?? []
    for (const required of ETSY_REQUIRED_SCOPES) {
      expect(scopes).toContain(required)
    }
  })

  it('joins scopes with single space', () => {
    const url = new URL(
      buildAuthorizeUrl({
        clientId: 'x',
        redirectUri: 'http://x/cb',
        state: 's',
        codeChallenge: 'c',
        scopes: ['a', 'b', 'c'],
      }),
    )
    expect(url.searchParams.get('scope')).toBe('a b c')
  })
})
