import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import createIntlMiddleware from 'next-intl/middleware'
import { routing } from './i18n/routing'

const intlMiddleware = createIntlMiddleware(routing)

const PRIVATE_PREFIX = '/private'
const ADMIN_PREFIX = '/private/admin'

/**
 * Next.js 16 renames `middleware.ts` to `proxy.ts`. The behaviour is the same:
 * runs on every matched request before the route handler.
 *
 * Decision tree:
 * 1. Static / framework paths (/api, /auth, /_next, files with an extension,
 *    /studio) → pass through untouched.
 * 2. /private and /private/admin → run the existing Supabase auth gate
 *    BEFORE intl can redirect, so the login flow is preserved.
 * 3. Everything else → next-intl middleware: detects locale (cookie or
 *    Accept-Language), rewrites/redirects to /{locale}/...
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  const skipsLocale =
    pathname.startsWith('/api') ||
    pathname.startsWith('/auth') ||
    pathname.startsWith('/studio') ||
    pathname.startsWith('/_next') ||
    /\.[a-z0-9]+$/i.test(pathname)

  if (pathname.startsWith(PRIVATE_PREFIX)) {
    let supabaseResponse = NextResponse.next({ request })

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return request.cookies.getAll() },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
            supabaseResponse = NextResponse.next({ request })
            cookiesToSet.forEach(({ name, value, options }) =>
              supabaseResponse.cookies.set(name, value, options)
            )
          },
        },
      },
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      const url = request.nextUrl.clone()
      url.pathname = '/de/login'
      url.searchParams.set('next', pathname)
      return NextResponse.redirect(url)
    }

    if (pathname.startsWith(ADMIN_PREFIX)) {
      const role = user?.user_metadata?.role
      if (role !== 'admin') return new NextResponse(null, { status: 403 })
    }

    return supabaseResponse
  }

  if (skipsLocale) return NextResponse.next({ request })

  return intlMiddleware(request)
}

export const config = {
  matcher: '/((?!_next|_vercel|.*\\..*).*)',
}
