'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useLocale } from 'next-intl'
import { ExternalLink, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { useB2BSubscription } from '@/hooks/useB2BSubscription'
import { isTrialTier, stripTrialPrefix } from '@/lib/b2b-subscription'

/**
 * PROJ-50: Subscription-Panel fuer /account. Zeigt aktueller Tier, Credits,
 * Rollover, Renewal-Datum. Stripe Customer Portal-Link fuer Plan-Wechsel /
 * Kuendigung / Karte-Update.
 */
export function SubscriptionPanel() {
  const router = useRouter()
  const locale = useLocale()
  const { status, loading, error } = useB2BSubscription()
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

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <div className="h-6 w-40 bg-muted rounded animate-pulse" />
        </CardHeader>
        <CardContent>
          <div className="h-20 bg-muted rounded animate-pulse" />
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="w-4 h-4" />
        <AlertTitle>Status konnte nicht geladen werden</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  if (!status) {
    return null
  }

  const baseTier = stripTrialPrefix(status.tier)
  const isTrial = isTrialTier(status.tier)
  const tierLabel = baseTier === 'free' ? 'Free' : baseTier[0].toUpperCase() + baseTier.slice(1)

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2">
              {tierLabel}-Plan
              {isTrial && (
                <Badge variant="outline" className="text-orange-700 border-orange-300 bg-orange-50">
                  Trial
                </Badge>
              )}
              {status.cancelAtPeriodEnd && (
                <Badge variant="outline" className="text-red-700 border-red-300 bg-red-50">
                  Kuendigung ausstehend
                </Badge>
              )}
              {status.status === 'past_due' && (
                <Badge variant="outline" className="text-red-700 border-red-300 bg-red-50">
                  Zahlung fehlgeschlagen
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              {baseTier === 'free'
                ? 'Free-Tier mit 3 Credits pro Monat. Exporte tragen ein Watermark.'
                : `Monatliches Abo mit ${status.monthlyQuota} Credits pro Period.`}
            </CardDescription>
          </div>
          {baseTier !== 'free' && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleOpenPortal}
              disabled={busy}
            >
              <ExternalLink className="w-4 h-4 mr-1.5" />
              {busy ? 'Wird geoeffnet…' : 'Plan verwalten'}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Stat label="Credits diese Period">
            <span className="text-2xl font-semibold">{status.creditsRemaining}</span>
            <span className="text-muted-foreground"> / {status.monthlyQuota}</span>
          </Stat>

          {status.rolloverCredits > 0 && (
            <Stat label="Rollover-Credits">
              <span className="text-2xl font-semibold">{status.rolloverCredits}</span>
              {status.rolloverExpiresAt && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  verfallen{' '}
                  {new Date(status.rolloverExpiresAt).toLocaleDateString('de-DE')}
                </p>
              )}
            </Stat>
          )}

          {status.trialEnd && (
            <Stat label="Trial-Ende">
              <span className="text-lg font-medium">
                {new Date(status.trialEnd).toLocaleDateString('de-DE')}
              </span>
            </Stat>
          )}

          {status.currentPeriodEnd && !status.trialEnd && (
            <Stat label={status.cancelAtPeriodEnd ? 'Abo endet' : 'Naechste Auffrischung'}>
              <span className="text-lg font-medium">
                {new Date(status.currentPeriodEnd).toLocaleDateString('de-DE')}
              </span>
            </Stat>
          )}
        </div>

        {baseTier === 'free' && (
          <div className="mt-6 flex flex-col sm:flex-row gap-2">
            <Button onClick={() => router.push(`/${locale}/business#pricing`)}>
              Auf Pro upgraden
            </Button>
            <p className="text-xs text-muted-foreground self-center">
              Watermark-frei + Commercial License + bis zu 300 Designs/Monat
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">{label}</p>
      <div>{children}</div>
    </div>
  )
}
