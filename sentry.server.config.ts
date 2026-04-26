/**
 * Sentry server-side init — runs in Node.js for App Router server components,
 * API routes and middleware. Catches uncaught exceptions, route handler
 * errors, and tracked transactions for server-rendered pages.
 */
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  enabled: process.env.NODE_ENV === 'production' || process.env.SENTRY_ENABLED === 'true',
})
