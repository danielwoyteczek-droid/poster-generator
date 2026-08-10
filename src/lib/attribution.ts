'use client'

const COOKIE_NAME = '__ps_attribution'
const MAX_AGE_DAYS = 90

const UTM_KEYS = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_content',
  'utm_term',
  'gclid',
] as const

type UtmKey = (typeof UTM_KEYS)[number]

export interface AttributionPayload {
  utm_source?: string
  utm_medium?: string
  utm_campaign?: string
  utm_content?: string
  utm_term?: string
  gclid?: string
  landing_page: string
  referrer: string | null
  first_seen_at: string
}

function setCookie(value: string) {
  const maxAge = MAX_AGE_DAYS * 24 * 3600
  const secure = location.protocol === 'https:' ? '; Secure' : ''
  document.cookie = `${COOKIE_NAME}=${value}; max-age=${maxAge}; path=/; SameSite=Lax${secure}`
}

function readCookieRaw(): string | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=([^;]+)`))
  return match ? match[1] : null
}

/**
 * Capture utm_* and gclid from the current URL on first pageview of a
 * session. Last-touch by default: any visit that arrives WITH attribution
 * params overwrites the cookie. Direct follow-up visits leave the cookie
 * alone (so we don't accidentally null out an ad-sourced last touch).
 */
export function captureAttributionFromUrl(): void {
  if (typeof window === 'undefined') return
  const params = new URLSearchParams(window.location.search)
  const incoming: Partial<Record<UtmKey, string>> = {}
  for (const key of UTM_KEYS) {
    const v = params.get(key)
    if (v) incoming[key] = v
  }
  if (Object.keys(incoming).length === 0) return

  const payload: AttributionPayload = {
    ...incoming,
    landing_page: window.location.pathname + window.location.search,
    referrer: document.referrer || null,
    first_seen_at: new Date().toISOString(),
  }
  setCookie(encodeURIComponent(JSON.stringify(payload)))
}

export function readAttributionCookie(): AttributionPayload | null {
  const raw = readCookieRaw()
  if (!raw) return null
  try {
    const parsed = JSON.parse(decodeURIComponent(raw))
    if (!parsed || typeof parsed !== 'object') return null
    if (typeof parsed.landing_page !== 'string') return null
    if (typeof parsed.first_seen_at !== 'string') return null
    return parsed as AttributionPayload
  } catch {
    return null
  }
}
