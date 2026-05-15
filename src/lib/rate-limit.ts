/**
 * PROJ-48 — Rate-Limiter (Sliding Window).
 *
 * Zwei Varianten:
 * - `rateLimitDb` (async, PRODUKTIONS-Pfad für /api/voucher/validate):
 *   DB-gestützt über die `check_rate_limit`-Postgres-Funktion. Alle
 *   Vercel-Instances teilen denselben Zähler — kein Per-Instance-Umgehen.
 *   Fail-open: bei DB-Fehler wird durchgelassen (Stripe validiert ohnehin
 *   autoritativ beim Checkout).
 * - `rateLimit` (sync, in-memory): generischer Sliding-Window-Counter pro
 *   Instance. Bleibt als leichtgewichtige Utility erhalten (getestet),
 *   wird vom Voucher-Endpoint aber nicht mehr genutzt.
 *
 * Sliding-Window: zählt alle Treffer in den letzten `windowMs` Millisekunden.
 * Wenn count >= limit → blockiert.
 */

import { createAdminClient } from './supabase-admin'

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
 * Distributed rate-limit check, backed by the `check_rate_limit` Postgres
 * function. Atomic cleanup + count + conditional insert in one round-trip,
 * shared across all Vercel instances.
 *
 * Fail-open: if the DB call errors, the request is allowed through. The
 * voucher endpoint it guards is non-critical (Stripe re-validates the
 * promotion code authoritatively at checkout), so a Supabase hiccup must
 * not lock legitimate customers out.
 *
 * @param key Identifier (typically `${endpoint}:${ip}`).
 * @param limit Max hits allowed within the window.
 * @param windowMs Window length in milliseconds.
 */
export async function rateLimitDb(
  key: string,
  limit: number,
  windowMs: number,
): Promise<RateLimitResult> {
  try {
    const admin = createAdminClient()
    const { data, error } = await admin.rpc('check_rate_limit', {
      p_bucket_key: key,
      p_limit: limit,
      p_window_seconds: Math.ceil(windowMs / 1000),
    })
    const row = Array.isArray(data) ? data[0] : data
    if (error || !row) {
      console.warn('[rate-limit] DB check failed, failing open:', error?.message)
      return { ok: true, remaining: limit, retryAfterSeconds: 0 }
    }
    return {
      ok: !!row.allowed,
      remaining: Math.max(0, limit - (row.hit_count ?? 0)),
      retryAfterSeconds: row.retry_after_seconds ?? 0,
    }
  } catch (err) {
    console.warn('[rate-limit] DB check threw, failing open:', err)
    return { ok: true, remaining: limit, retryAfterSeconds: 0 }
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
