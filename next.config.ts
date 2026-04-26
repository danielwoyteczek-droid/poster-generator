import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin'
import { withSentryConfig } from '@sentry/nextjs'

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts')

const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : undefined

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      ...(supabaseHost
        ? [{
            protocol: 'https' as const,
            hostname: supabaseHost,
            pathname: '/storage/v1/object/public/**',
          }]
        : []),
      {
        protocol: 'https' as const,
        hostname: 'cdn.sanity.io',
        pathname: '/images/**',
      },
    ],
  },
};

// Wrap with next-intl first (closer to Next), then with Sentry on the outside
// so the Sentry webpack plugin sees the final compiled config.
export default withSentryConfig(withNextIntl(nextConfig), {
  // Sentry organisation + project — come from env vars so we can omit them in
  // local dev (source-map upload is skipped silently in that case). Set in
  // Vercel Project Settings → Environment Variables for production builds.
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,

  // Only print upload logs when running in CI (Vercel sets CI=true).
  silent: !process.env.CI,

  // Catch errors thrown inside <Image> + other server components imported by
  // page-level boundaries (recommended).
  widenClientFileUpload: true,

  // Removes Sentry's own console.log output from client + server bundles.
  disableLogger: true,
})
