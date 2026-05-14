/**
 * PROJ-48 — In-Memory Rate-Limiter (Sliding Window).
 *
 * V1-Implementation: ein Map pro Vercel-Instance, geteilt per Bucket-Key.
 * Vercel-Functions skalieren horizontal, daher kann ein böser Akteur das
 * Limit theoretisch umgehen, indem er Pech mit unterschiedlichen
 * Instances hat. Akzeptabel für V1 — blockiert zufällige Bot-Brute-Force
 * auf Promotion-Code-Namen, kein Hard-Defense gegen koordinierte Angriffe.
 *
 * Bei steigendem Volumen → Upstash-Redis-Limiter mit Customer-Anchor
 * (separates Folge-Feature).
 *
 * Sliding-Window: zählt alle Treffer in den letzten `windowMs` Millisekunden.
 * Wenn count >= limit → blockiert.
 */

interface Bucket {
  hits: number[]
}

const buckets = new Map<string, Bucket>()

export interface RateLimitResult {
  ok: boolean
  remaining: number
  retryAfterSeconds: number
}

/**
 * Test + record one hit against a sliding-window bucket.
 *
 * @param key Identifier (typically `${endpoint}:${ip}`).
 * @param limit Max hits allowed within the window.
 * @param windowMs Window length in milliseconds.
 * @returns `{ ok, remaining, retryAfterSeconds }`. `ok=false` means the
 *          hit was NOT recorded — caller should reject the request.
 */
export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now()
  const cutoff = now - windowMs

  let bucket = buckets.get(key)
  if (!bucket) {
    bucket = { hits: [] }
    buckets.set(key, bucket)
  }

  // Drop expired hits.
  bucket.hits = bucket.hits.filter((t) => t > cutoff)

  if (bucket.hits.length >= limit) {
    // Retry-after = how long until the oldest in-window hit expires.
    const oldest = bucket.hits[0]
    const retryAfterSeconds = Math.max(1, Math.ceil((oldest + windowMs - now) / 1000))
    return { ok: false, remaining: 0, retryAfterSeconds }
  }

  bucket.hits.push(now)
  return {
    ok: true,
    remaining: limit - bucket.hits.length,
    retryAfterSeconds: 0,
  }
}

/**
 * Extract a stable client identifier from a Next.js request. Prefers
 * `x-forwarded-for` (Vercel sets this), falls back to `x-real-ip` and
 * finally a literal "unknown" bucket. Multiple forwarded IPs are
 * comma-separated; we use the first (origin) entry.
 */
export function getClientIp(req: Request): string {
  const fwd = req.headers.get('x-forwarded-for')
  if (fwd) {
    const first = fwd.split(',')[0]?.trim()
    if (first) return first
  }
  const real = req.headers.get('x-real-ip')
  if (real) return real.trim()
  return 'unknown'
}

// Test-only helper. Not exported from the index — only the test file
// imports it directly. Kept here so production code stays self-contained.
export function _resetRateLimitForTests() {
  buckets.clear()
}
