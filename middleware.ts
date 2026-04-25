import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import createIntlMiddleware from 'next-intl/middleware'
import { routing } from './src/i18n/routing'

const intlMiddleware = createIntlMiddleware(routing)

const PRIVATE_PREFIX = '/private'
const ADMIN_PREFIX = '/private/admin'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // /api, /auth, /private, /studio, /icon.svg etc. stay outside the locale
  // prefix. Everything else flows through next-intl which adds the prefix
  // and writes the NEXT_LOCALE cookie based on Accept-Language.
  const skipsLocale =
    pathname.startsWith('/api') ||
    pathname.startsWith('/auth') ||
    pathname.startsWith('/private') ||
    pathname.startsWith('/studio') ||
    pathname.startsWith('/_next') ||
    /\.[a-z0-9]+$/i.test(pathname)

  // Auth gate for /private (kept identical to pre-i18n behaviour). We
  // need it BEFORE the intl middleware redirects so the login redirect
  // still works.
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
  // Run on every path except the static asset / image-optim paths.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|brand|masks|map-styles).*)'],
}
