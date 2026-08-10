/**
 * PROJ-49: Etsy Open API v3 client.
 *
 * Etsy has no official Node SDK, so this wraps fetch with three concerns
 * we need everywhere:
 *
 *   1. OAuth-Bearer-Auth with auto-refresh against the singleton token row
 *      in `etsy_oauth_tokens`. Access-Token lives 1h; refresh-token lives
 *      90 days but rotates on every refresh — we always write the new
 *      refresh-token back to the DB.
 *
 *   2. Token-bucket rate-limit (10 req/s steady, 10,000/day) with simple
 *      sleep-on-429 backoff. Day-budget is opportunistic — we trust Etsy's
 *      X-RateLimit-Remaining header more than counting locally.
 *
 *   3. Friendly typed errors: EtsyAuthError (need re-authorize),
 *      EtsyRateLimitError (transient, retry), EtsyApiError (everything else).
 *
 * Usage:
 *   const client = await createEtsyClient()
 *   const receipts = await client.get<EtsyReceiptsResponse>(
 *     `/shops/${shopId}/receipts`,
 *     { was_paid: 'true', was_shipped: 'false', limit: 100 },
 *   )
 *
 * The client is stateless across cron invocations — each call re-reads
 * the singleton token row. In a single process we keep the access-token
 * in memory until expiry.
 */

import { createAdminClient } from '@/lib/supabase-admin'

const ETSY_API_BASE = 'https://api.etsy.com/v3/application'
const ETSY_TOKEN_URL = 'https://api.etsy.com/v3/public/oauth/token'

// Etsy doc says steady rate is 10 req/s. We stay safely below at 6 req/s
// to leave headroom for parallel browser-tab admin calls.
const REQUEST_SPACING_MS = 170

export class EtsyAuthError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'EtsyAuthError'
  }
}

export class EtsyRateLimitError extends Error {
  constructor(
    message: string,
    public retryAfterSeconds: number,
  ) {
    super(message)
    this.name = 'EtsyRateLimitError'
  }
}

export class EtsyApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public body: string,
  ) {
    super(message)
    this.name = 'EtsyApiError'
  }
}

interface TokenRow {
  refresh_token: string
  shop_id: number | null
  scopes: string[]
}

interface AccessTokenState {
  accessToken: string
  expiresAtMs: number
  refreshToken: string
}

let cachedAccessToken: AccessTokenState | null = null
let lastRequestAtMs = 0

function getApiKey(): string {
  const key = process.env.ETSY_OAUTH_CLIENT_ID?.trim()
  if (!key) {
    throw new EtsyAuthError(
      'ETSY_OAUTH_CLIENT_ID not configured. See .env.local.example.',
    )
  }
  return key
}

async function loadTokenRow(): Promise<TokenRow> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('etsy_oauth_tokens')
    .select('refresh_token, shop_id, scopes')
    .eq('id', 'singleton')
    .maybeSingle()
  if (error) throw new EtsyAuthError(`Token-Row read failed: ${error.message}`)
  if (!data) {
    throw new EtsyAuthError(
      'No Etsy-OAuth-Token configured. Run /private/admin/etsy/oauth setup first.',
    )
  }
  return data as TokenRow
}

async function persistRefreshedToken(newRefreshToken: string) {
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('etsy_oauth_tokens')
    .update({
      refresh_token: newRefreshToken,
      refreshed_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
    })
    .eq('id', 'singleton')
  if (error) {
    throw new EtsyAuthError(`Token-Row write failed: ${error.message}`)
  }
}

/**
 * Exchanges a refresh-token for a fresh access-token. Etsy rotates the
 * refresh-token on every call — the response always contains a new one,
 * which we MUST persist or we'll lose access on the next call.
 */
async function refreshAccessToken(refreshToken: string): Promise<AccessTokenState> {
  const apiKey = getApiKey()
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    client_id: apiKey,
    refresh_token: refreshToken,
  })

  const res = await fetch(ETSY_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  })

  const text = await res.text()
  if (!res.ok) {
    throw new EtsyAuthError(
      `OAuth refresh failed (HTTP ${res.status}): ${text.slice(0, 400)}`,
    )
  }

  let parsed: {
    access_token: string
    expires_in: number
    refresh_token: string
  }
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new EtsyAuthError(`OAuth refresh returned non-JSON: ${text.slice(0, 200)}`)
  }

  await persistRefreshedToken(parsed.refresh_token)

  return {
    accessToken: parsed.access_token,
    // Sub 60s safety margin so we never race the expiry boundary.
    expiresAtMs: Date.now() + parsed.expires_in * 1000 - 60_000,
    refreshToken: parsed.refresh_token,
  }
}

async function getAccessToken(): Promise<string> {
  if (cachedAccessToken && cachedAccessToken.expiresAtMs > Date.now()) {
    return cachedAccessToken.accessToken
  }
  const row = await loadTokenRow()
  cachedAccessToken = await refreshAccessToken(row.refresh_token)
  return cachedAccessToken.accessToken
}

async function throttle() {
  const now = Date.now()
  const elapsed = now - lastRequestAtMs
  if (elapsed < REQUEST_SPACING_MS) {
    await new Promise((r) => setTimeout(r, REQUEST_SPACING_MS - elapsed))
  }
  lastRequestAtMs = Date.now()
}

export interface RateLimitInfo {
  remaining: number | null
  resetAt: Date | null
}

let lastSeenRateLimit: RateLimitInfo = { remaining: null, resetAt: null }

export function getLastSeenRateLimit(): RateLimitInfo {
  return { ...lastSeenRateLimit }
}

function captureRateLimitHeaders(res: Response) {
  const remaining = res.headers.get('x-ratelimit-remaining')
  const reset = res.headers.get('x-ratelimit-limit')
  // Etsy headers: x-limit-per-second-remaining + x-limit-per-day-remaining.
  // We track the more conservative of the two.
  const perDay = res.headers.get('x-limit-per-day-remaining')
  if (perDay !== null) {
    lastSeenRateLimit.remaining = parseInt(perDay, 10)
  } else if (remaining !== null) {
    lastSeenRateLimit.remaining = parseInt(remaining, 10)
  }
  if (reset !== null) {
    // No precise reset timestamp from Etsy; budget resets daily UTC.
    const tomorrow = new Date()
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1)
    tomorrow.setUTCHours(0, 0, 0, 0)
    lastSeenRateLimit.resetAt = tomorrow
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  query?: Record<string, string | number | boolean | undefined>
  body?: unknown
  // Some Etsy endpoints (eg image upload) want multipart instead of JSON.
  bodyType?: 'json' | 'form'
  signal?: AbortSignal
}

export interface EtsyClient {
  request: <T>(path: string, opts?: RequestOptions) => Promise<T>
  get: <T>(path: string, query?: RequestOptions['query']) => Promise<T>
  post: <T>(path: string, body?: unknown, bodyType?: 'json' | 'form') => Promise<T>
  put: <T>(path: string, body?: unknown, bodyType?: 'json' | 'form') => Promise<T>
  delete: <T>(path: string) => Promise<T>
}

export async function createEtsyClient(): Promise<EtsyClient> {
  const apiKey = getApiKey()

  async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
    await throttle()
    const accessToken = await getAccessToken()

    const url = new URL(`${ETSY_API_BASE}${path}`)
    if (opts.query) {
      for (const [k, v] of Object.entries(opts.query)) {
        if (v !== undefined && v !== null) url.searchParams.set(k, String(v))
      }
    }

    const headers: Record<string, string> = {
      Authorization: `Bearer ${accessToken}`,
      'x-api-key': apiKey,
      Accept: 'application/json',
    }

    let bodyInit: BodyInit | undefined
    if (opts.body !== undefined) {
      if (opts.bodyType === 'form') {
        if (opts.body instanceof FormData) {
          bodyInit = opts.body
        } else {
          const form = new URLSearchParams()
          for (const [k, v] of Object.entries(opts.body as Record<string, unknown>)) {
            if (v !== undefined && v !== null) form.set(k, String(v))
          }
          bodyInit = form.toString()
          headers['Content-Type'] = 'application/x-www-form-urlencoded'
        }
      } else {
        bodyInit = JSON.stringify(opts.body)
        headers['Content-Type'] = 'application/json'
      }
    }

    const res = await fetch(url.toString(), {
      method: opts.method ?? 'GET',
      headers,
      body: bodyInit,
      signal: opts.signal,
    })

    captureRateLimitHeaders(res)

    if (res.status === 401 || res.status === 403) {
      // Force token refresh on next call.
      cachedAccessToken = null
      const text = await res.text().catch(() => '')
      throw new EtsyAuthError(
        `Auth failed (HTTP ${res.status}): ${text.slice(0, 400)}`,
      )
    }

    if (res.status === 429) {
      const retryAfter = parseInt(res.headers.get('retry-after') ?? '60', 10)
      throw new EtsyRateLimitError(
        `Etsy rate limit hit, retry in ${retryAfter}s`,
        retryAfter,
      )
    }

    const text = await res.text()

    if (!res.ok) {
      throw new EtsyApiError(
        `Etsy ${opts.method ?? 'GET'} ${path} failed: HTTP ${res.status}`,
        res.status,
        text.slice(0, 1000),
      )
    }

    if (!text) return undefined as T
    try {
      return JSON.parse(text) as T
    } catch {
      throw new EtsyApiError(
        `Etsy returned non-JSON for ${path}`,
        res.status,
        text.slice(0, 1000),
      )
    }
  }

  return {
    request,
    get: <T>(path: string, query?: RequestOptions['query']) =>
      request<T>(path, { method: 'GET', query }),
    post: <T>(path: string, body?: unknown, bodyType?: 'json' | 'form') =>
      request<T>(path, { method: 'POST', body, bodyType }),
    put: <T>(path: string, body?: unknown, bodyType?: 'json' | 'form') =>
      request<T>(path, { method: 'PUT', body, bodyType }),
    delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
  }
}

/**
 * Reset module-level state. Tests call this between cases so the cached
 * access-token doesn't leak across test cases.
 */
export function __resetForTests() {
  cachedAccessToken = null
  lastRequestAtMs = 0
  lastSeenRateLimit = { remaining: null, resetAt: null }
}
