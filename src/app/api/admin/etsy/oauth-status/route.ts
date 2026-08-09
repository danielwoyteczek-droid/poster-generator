/**
 * PROJ-49: Returns the current Etsy-OAuth state for the admin UI.
 *
 * The UI uses this to decide between "Connect Etsy" (no token row) and
 * "Connected as {shop_name}" (token row exists).
 */

import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase-admin'

export interface OAuthStatusResponse {
  connected: boolean
  shop_id: number | null
  shop_name: string | null
  authorized_at: string | null
  refreshed_at: string | null
  expires_at: string | null
  scopes: string[]
  /** True if expires_at is within 14 days — UI shows a warning chip. */
  expires_soon: boolean
  /** True if client_id env is missing (setup incomplete). */
  client_id_configured: boolean
}

export async function GET() {
  const auth = await requireAdmin()
  if (!auth.ok) {
    return NextResponse.json({ error: 'Forbidden' }, { status: auth.status })
  }

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('etsy_oauth_tokens')
    .select('shop_id, shop_name, authorized_at, refreshed_at, expires_at, scopes')
    .eq('id', 'singleton')
    .maybeSingle()

  if (error) {
    return NextResponse.json(
      { error: `DB read failed: ${error.message}` },
      { status: 500 },
    )
  }

  const clientIdConfigured = !!process.env.ETSY_OAUTH_CLIENT_ID?.trim()

  if (!data) {
    const payload: OAuthStatusResponse = {
      connected: false,
      shop_id: null,
      shop_name: null,
      authorized_at: null,
      refreshed_at: null,
      expires_at: null,
      scopes: [],
      expires_soon: false,
      client_id_configured: clientIdConfigured,
    }
    return NextResponse.json(payload)
  }

  const expiresAtMs = data.expires_at ? new Date(data.expires_at).getTime() : null
  const expiresSoon =
    expiresAtMs !== null && expiresAtMs - Date.now() < 14 * 24 * 60 * 60 * 1000

  const payload: OAuthStatusResponse = {
    connected: true,
    shop_id: data.shop_id as number | null,
    shop_name: data.shop_name as string | null,
    authorized_at: data.authorized_at as string | null,
    refreshed_at: data.refreshed_at as string | null,
    expires_at: data.expires_at as string | null,
    scopes: (data.scopes as string[] | null) ?? [],
    expires_soon: expiresSoon,
    client_id_configured: clientIdConfigured,
  }
  return NextResponse.json(payload)
}

export async function DELETE() {
  const auth = await requireAdmin()
  if (!auth.ok) {
    return NextResponse.json({ error: 'Forbidden' }, { status: auth.status })
  }
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('etsy_oauth_tokens')
    .delete()
    .eq('id', 'singleton')
  if (error) {
    return NextResponse.json(
      { error: `Disconnect failed: ${error.message}` },
      { status: 500 },
    )
  }
  return NextResponse.json({ ok: true })
}
