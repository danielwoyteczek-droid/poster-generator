import { createClient } from '@supabase/supabase-js'

// Bypasses RLS — use only in trusted server-side code (webhooks, background jobs).
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  )
}
