'use client'

import { useState } from 'react'
import { Mail, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@/lib/supabase-browser'

export function EmailConfirmBanner() {
  const { user, loading, emailConfirmed } = useAuth()
  const [sending, setSending] = useState(false)

  if (loading || !user || emailConfirmed) return null
  if (!user.email) return null

  const handleResend = async () => {
    setSending(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: user.email!,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })
      if (error) throw error
      toast.success('Bestätigungs-E-Mail wurde erneut gesendet')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Versand fehlgeschlagen')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="fixed top-14 inset-x-0 z-40 bg-amber-50 border-b border-amber-200">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-10 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-amber-900 min-w-0">
          <Mail className="w-4 h-4 shrink-0" />
          <span className="truncate">
            Bitte bestätige deine E-Mail-Adresse (<strong>{user.email}</strong>).
          </span>
        </div>
        <button
          type="button"
          onClick={handleResend}
          disabled={sending}
          className="text-xs font-semibold text-amber-900 hover:text-amber-700 underline underline-offset-2 shrink-0 disabled:opacity-50"
        >
          {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin inline" /> : 'E-Mail erneut senden'}
        </button>
      </div>
    </div>
  )
}
