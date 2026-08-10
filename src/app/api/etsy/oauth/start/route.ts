/**
 * PROJ-49: Etsy OAuth start — kicks off the PKCE consent flow.
 *
 * Admin clicks this from /private/admin/etsy/oauth. We:
 *   1. Generate code_verifier + code_challenge + state.
 *   2. Set short-lived httpOnly cookies for state + verifier.
 *   3. Redirect to Etsy's consent page.
 *
 * Etsy will redirect back to /api/etsy/oauth/callback with code + state.
 */

import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import {
  OAUTH_COOKIE_MAX_AGE_SECONDS,
  OAUTH_STATE_COOKIE,
  OAUTH_VERIFIER_COOKIE,
  buildAuthorizeUrl,
  generatePkcePair,
  generateState,
  resolveRedirectUri,
} from '@/lib/etsy/oauth'

export async function GET(request: Request) {
  const auth = await requireAdmin()
  if (!auth.ok) {
    return NextResponse.json({ error: 'Forbidden' }, { status: auth.status })
  }

  const clientId = process.env.ETSY_OAUTH_CLIENT_ID?.trim()
  if (!clientId) {
    return NextResponse.json(
      {
        error:
          'ETSY_OAUTH_CLIENT_ID not configured. See .env.local.example.',
      },
      { status: 500 },
    )
  }

  const { codeVerifier, codeChallenge } = generatePkcePair()
  const state = generateState()
  const redirectUri = resolveRedirectUri(request)

  const authorizeUrl = buildAuthorizeUrl({
    clientId,
    redirectUri,
    state,
    codeChallenge,
  })

  const response = NextResponse.redirect(authorizeUrl)
  response.cookies.set(OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: OAUTH_COOKIE_MAX_AGE_SECONDS,
  })
  response.cookies.set(OAUTH_VERIFIER_COOKIE, codeVerifier, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: OAUTH_COOKIE_MAX_AGE_SECONDS,
  })
  return response
}
