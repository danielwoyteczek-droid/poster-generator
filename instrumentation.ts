/**
 * Next.js 14+ instrumentation hook — bootstraps server + edge Sentry init at
 * runtime. Required for `@sentry/nextjs` to capture exceptions on the
 * server-side; the client config is auto-loaded by Sentry's webpack plugin.
 *
 * See: https://nextjs.org/docs/app/api-reference/file-conventions/instrumentation
 */
import * as Sentry from '@sentry/nextjs'

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config')
  }
  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config')
  }
}

// Forwards request errors (App Router server components, route handlers) to
// Sentry. Matches the `onRequestError` hook signature defined by Next.js.
export const onRequestError = Sentry.captureRequestError
