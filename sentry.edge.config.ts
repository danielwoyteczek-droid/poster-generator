/**
 * Sentry edge-runtime init — runs in Vercel Edge Functions, Middleware and
 * Edge Route Handlers. Same DSN as the server config; smaller runtime, so
 * we keep the integration list minimal.
 */
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  enabled: process.env.NODE_ENV === 'production' || process.env.SENTRY_ENABLED === 'true',
})
