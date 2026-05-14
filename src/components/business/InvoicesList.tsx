'use client'

import { useState } from 'react'
import { ExternalLink } from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useB2BSubscription } from '@/hooks/useB2BSubscription'
import { stripTrialPrefix } from '@/lib/b2b-subscription'

/**
 * PROJ-50: Stripe-Hosted-Invoices fuer den eingeloggten User. Statt eine
 * eigene Invoice-Tabelle zu pflegen (Stripe ist Source-of-Truth), oeffnen
 * wir das Customer-Portal — Stripe hat dort eine eingebaute Rechnungs-
 * History inkl. PDF-Download.
 */
export function InvoicesList() {
  const { status, loading } = useB2BSubscription()
  const [busy, setBusy] = useState(false)

  const handleOpenPortal = async () => {
    setBusy(true)
    try {
      const res = await fetch('/api/business/portal-session', {
        method: 'POST',
        credentials: 'include',
      })
      const data = (await res.json()) as { url?: string; error?: string }
      if (!res.ok || !data.url) {
        throw new Error(data.error ?? 'Portal konnte nicht geoeffnet werden')
      }
      window.location.href = data.url
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Portal-Fehler')
      setBusy(false)
    }
  }

  if (loading) return null
  if (!status) return null

  const baseTier = stripTrialPrefix(status.tier)
  // Free-User haben keine Rechnungen.
  if (baseTier === 'free') return null

  return (
    <Card>
      <CardHeader>
        <CardTitle>Rechnungen</CardTitle>
        <CardDescription>
          Alle Rechnungen werden von Stripe gehostet inkl. PDF-Download.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button variant="outline" onClick={handleOpenPortal} disabled={busy}>
          <ExternalLink className="w-4 h-4 mr-1.5" />
          {busy ? 'Wird geoeffnet…' : 'Rechnungen in Stripe oeffnen'}
        </Button>
      </CardContent>
    </Card>
  )
}
