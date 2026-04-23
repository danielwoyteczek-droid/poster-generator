const STORAGE_KEY = 'petite-moment-guest-session'

/**
 * Returns a stable random UUID stored in localStorage that identifies this
 * browser across reloads without requiring a login. Used as the folder name
 * for guest photo uploads so the URLs aren't discoverable by enumeration.
 */
export function getOrCreateGuestSessionId(): string {
  if (typeof window === 'undefined') return 'server'
  try {
    const existing = localStorage.getItem(STORAGE_KEY)
    if (existing && /^[0-9a-f-]{32,}$/i.test(existing)) return existing
    const next = crypto.randomUUID()
    localStorage.setItem(STORAGE_KEY, next)
    return next
  } catch {
    return crypto.randomUUID()
  }
}
