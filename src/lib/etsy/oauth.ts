/**
 * PROJ-49: Etsy OAuth2 PKCE helpers.
 *
 * Etsy uses OAuth2 with PKCE (Proof Key for Code Exchange). The flow:
 *   1. Generate code_verifier (random) + code_challenge (SHA-256 base64url).
 *   2. Redirect operator to Etsy authorize URL with code_challenge + state.
 *   3. Etsy redirects back with authorization-code + state.
 *   4. POST to token endpoint with code + code_verifier → access_token,
 *      refresh_token (90d), expires_in.
 *
 * We store code_verifier + state in short-lived httpOnly cookies between
 * /oauth/start and /oauth/callback. No DB row needed for the in-flight
 * state — cookies are scoped to the operator's browser session.
 */

import crypto from 'node:crypto'

export const ETSY_AUTHORIZE_URL = 'https://www.etsy.com/oauth/connect'
export const ETSY_TOKEN_URL = 'https://api.etsy.com/v3/public/oauth/token'

export const ETSY_REQUIRED_SCOPES = [
  'listings_r',
  'listings_w',
  'listings_d',
  'transactions_r',
  'transactions_w',
  'shops_r',
  'address_r',
] as const

export const OAUTH_STATE_COOKIE = 'etsy_oauth_state'
export const OAUTH_VERIFIER_COOKIE = 'etsy_oauth_verifier'
// Cookies expire after 10 minutes — operator has plenty of time to consent.
export const OAUTH_COOKIE_MAX_AGE_SECONDS = 600

function base64url(buf: Buffer): string {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function generatePkcePair(): { codeVerifier: string; codeChallenge: string } {
  const codeVerifier = base64url(crypto.randomBytes(32))
  const codeChallenge = base64url(
    crypto.createHash('sha256').update(codeVerifier).digest(),
  )
  return { codeVerifier, codeChallenge }
}

export function generateState(): string {
  return base64url(crypto.randomBytes(16))
}

export function buildAuthorizeUrl(params: {
  clientId: string
  redirectUri: string
  state: string
  codeChallenge: string
  scopes?: readonly string[]
}): string {
  const scopes = (params.scopes ?? ETSY_REQUIRED_SCOPES).join(' ')
  const url = new URL(ETSY_AUTHORIZE_URL)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('client_id', params.clientId)
  url.searchParams.set('redirect_uri', params.redirectUri)
  url.searchParams.set('scope', scopes)
  url.searchParams.set('state', params.state)
  url.searchParams.set('code_challenge', params.codeChallenge)
  url.searchParams.set('code_challenge_method', 'S256')
  return url.toString()
}

export interface EtsyTokenResponse {
  access_token: string
  refresh_token: string
  expires_in: number
  token_type: string
}

export async function exchangeAuthorizationCode(params: {
  clientId: string
  code: string
  codeVerifier: string
  redirectUri: string
}): Promise<EtsyTokenResponse> {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: params.clientId,
    code: params.code,
    code_verifier: params.codeVerifier,
    redirect_uri: params.redirectUri,
  })

  const res = await fetch(ETSY_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  })

  const text = await res.text()
  if (!res.ok) {
    throw new Error(
      `Etsy token-exchange failed (HTTP ${res.status}): ${text.slice(0, 400)}`,
    )
  }
  try {
    return JSON.parse(text) as EtsyTokenResponse
  } catch {
    throw new Error(`Etsy token-exchange returned non-JSON: ${text.slice(0, 200)}`)
  }
}

/**
 * Resolves the redirect URI used for the OAuth flow. We accept an
 * explicit env-var override; otherwise fall back to the request's own
 * origin so the same code works on localhost + production without
 * config changes.
 */
export function resolveRedirectUri(request: Request): string {
  const override = process.env.ETSY_OAUTH_REDIRECT_URI?.trim()
  if (override) return override
  const url = new URL(request.url)
  return `${url.origin}/api/etsy/oauth/callback`
}
