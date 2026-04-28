/**
 * Helpers für den Headless-Render-Modus (PROJ-30).
 *
 * Der Worker ruft Editor-Routen mit `?headless=1` plus dem Header
 * `X-Render-Token` auf. Middleware prüft den Token und blockt fremde
 * Aufrufer mit 403, damit `?headless=1` nicht versehentlich für
 * normale User-Browser ein Chrome-Less-Layout produziert.
 */

export const HEADLESS_TOKEN_HEADER = 'x-render-token'
export const HEADLESS_QUERY_PARAM = 'headless'
export const HEADLESS_QUERY_VALUE = '1'

export function isHeadlessUrl(url: URL): boolean {
  return url.searchParams.get(HEADLESS_QUERY_PARAM) === HEADLESS_QUERY_VALUE
}

export function getExpectedHeadlessToken(): string | undefined {
  return process.env.RENDER_HEADLESS_TOKEN
}

/**
 * Konstant-zeitiger String-Vergleich zur Token-Validierung.
 * Bei unterschiedlich langen Strings → false ohne weitere Prüfung.
 */
export function validateHeadlessToken(provided: string | null | undefined): boolean {
  const expected = getExpectedHeadlessToken()
  if (!expected || !provided) return false
  if (provided.length !== expected.length) return false

  let mismatch = 0
  for (let i = 0; i < provided.length; i++) {
    mismatch |= provided.charCodeAt(i) ^ expected.charCodeAt(i)
  }
  return mismatch === 0
}
