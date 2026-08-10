/**
 * PROJ-49: Etsy OAuth callback — completes the PKCE consent flow.
 *
 * Etsy redirects here with `code` + `state`. We:
 *   1. Verify state matches the cookie we set in /start (CSRF protection).
 *   2. Exchange code + code_verifier for access_token + refresh_token.
 *   3. Probe the /users/me endpoint to discover the shop_id + shop_name.
 *   4. Upsert the singleton row in etsy_oauth_tokens.
 *   5. Redirect to a success page in the admin UI.
 *
 * If anything fails, redirect to an error page with a query param so the
 * admin sees a useful message instead of a raw 500.
 */

import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase-admin'
import {
  ETSY_REQUIRED_SCOPES,
  OAUTH_STATE_COOKIE,
  OAUTH_VERIFIER_COOKIE,
  exchangeAuthorizationCode,
  resolveRedirectUri,
} from '@/lib/etsy/oauth'

interface EtsyMeResponse {
  user_id: number
}

interface EtsyUserShopsResponse {
  results?: Array<{
    shop_id: number
    shop_name: string
  }>
}

function redirectToAdmin(request: Request, params: Record<string, string>): NextResponse {
  const url = new URL('/private/admin/etsy/oauth', request.url)
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v)
  }
  return NextResponse.redirect(url)
}

async function fetchShopInfo(
  apiKey: string,
  accessToken: string,
): Promise<{ shop_id: number; shop_name: string } | null> {
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    'x-api-key': apiKey,
    Accept: 'application/json',
  }
  // Etsy /users/me returns the user_id only; user_id has the same format
  // as the prefix of the access token (numeric user_id.access_token_suffix)
  // but we still hit /users/me to confirm the token works.
  const meRes = await fetch('https://api.etsy.com/v3/application/users/me', {
    headers,
  })
  if (!meRes.ok) return null
  const me = (await meRes.json()) as EtsyMeResponse
  const shopsRes = await fetch(
    `https://api.etsy.com/v3/application/users/${me.user_id}/shops`,
    { headers },
  )
  if (!shopsRes.ok) return null
  const shopsBody = (await shopsRes.json()) as EtsyUserShopsResponse | {
    shop_id: number
    shop_name: string
  }
  // Etsy returns either { results: [...] } or a single shop object depending
  // on the endpoint variant. Handle both.
  if ('results' in shopsBody && Array.isArray(shopsBody.results) && shopsBody.results.length > 0) {
    const shop = shopsBody.results[0]
    return { shop_id: shop.shop_id, shop_name: shop.shop_name }
  }
  if ('shop_id' in shopsBody) {
    return { shop_id: shopsBody.shop_id, shop_name: shopsBody.shop_name }
  }
  return null
}

export async function GET(request: Request) {
  const auth = await requireAdmin()
  if (!auth.ok) {
    return NextResponse.json({ error: 'Forbidden' }, { status: auth.status })
  }

  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')
  const error = url.searchParams.get('error')

  if (error) {
    return redirectToAdmin(request, {
      status: 'error',
      reason: `Etsy meldete: ${error}`,
    })
  }
  if (!code || !state) {
    return redirectToAdmin(request, {
      status: 'error',
      reason: 'Code oder State fehlen in der Callback-URL.',
    })
  }

  const cookieState = request.headers
    .get('cookie')
    ?.split(';')
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${OAUTH_STATE_COOKIE}=`))
    ?.split('=')[1]
  const codeVerifier = request.headers
    .get('cookie')
    ?.split(';')
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${OAUTH_VERIFIER_COOKIE}=`))
    ?.split('=')[1]

  if (!cookieState || cookieState !== state) {
    return redirectToAdmin(request, {
      status: 'error',
      reason: 'State-Cookie stimmt nicht (CSRF). Bitte erneut starten.',
    })
  }
  if (!codeVerifier) {
    return redirectToAdmin(request, {
      status: 'error',
      reason: 'Verifier-Cookie fehlt. Cookie könnte abgelaufen sein — erneut starten.',
    })
  }

  const clientId = process.env.ETSY_OAUTH_CLIENT_ID?.trim()
  if (!clientId) {
    return redirectToAdmin(request, {
      status: 'error',
      reason: 'ETSY_OAUTH_CLIENT_ID nicht konfiguriert.',
    })
  }

  const redirectUri = resolveRedirectUri(request)

  let tokenResponse
  try {
    tokenResponse = await exchangeAuthorizationCode({
      clientId,
      code,
      codeVerifier,
      redirectUri,
    })
  } catch (e) {
    return redirectToAdmin(request, {
      status: 'error',
      reason: `Token-Exchange fehlgeschlagen: ${(e as Error).message.slice(0, 200)}`,
    })
  }

  const shopInfo = await fetchShopInfo(clientId, tokenResponse.access_token)

  const supabase = createAdminClient()
  const { error: upsertError } = await supabase
    .from('etsy_oauth_tokens')
    .upsert(
      {
        id: 'singleton',
        refresh_token: tokenResponse.refresh_token,
        shop_id: shopInfo?.shop_id ?? null,
        shop_name: shopInfo?.shop_name ?? null,
        scopes: [...ETSY_REQUIRED_SCOPES],
        authorized_at: new Date().toISOString(),
        refreshed_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
      },
      { onConflict: 'id' },
    )

  if (upsertError) {
    return redirectToAdmin(request, {
      status: 'error',
      reason: `Token-Speicherung fehlgeschlagen: ${upsertError.message.slice(0, 200)}`,
    })
  }

  const response = redirectToAdmin(request, {
    status: 'success',
    shop_name: shopInfo?.shop_name ?? 'unknown',
  })
  // Clear the in-flight cookies — they're single-use.
  response.cookies.delete(OAUTH_STATE_COOKIE)
  response.cookies.delete(OAUTH_VERIFIER_COOKIE)
  return response
}
