/**
 * Sentry client-side init — runs in the browser. Catches React errors,
 * unhandled promise rejections, and tracked transactions for client routes.
 *
 * The DSN is exposed via NEXT_PUBLIC_SENTRY_DSN so the client bundle can read
 * it. Without a DSN Sentry no-ops, so this file is safe to ship before the
 * Sentry account is wired up — it just won't capture anything yet.
 */
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  // Lower sample rate in production keeps the free-tier quota happy.
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  // Capture replays only on errors — keeps quota low while still giving us
  // a session-replay reproduction for any caught exception.
  replaysOnErrorSampleRate: 1.0,
  replaysSessionSampleRate: 0.0,
  integrations: [
    Sentry.replayIntegration({
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],
  // Skip Sentry in dev unless explicitly enabled — avoids noisy console logs
  // while iterating locally.
  enabled: process.env.NODE_ENV === 'production' || process.env.NEXT_PUBLIC_SENTRY_ENABLED === 'true',
})
