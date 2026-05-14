'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useLocale } from 'next-intl'
import { Sparkles, ArrowRight, Check } from 'lucide-react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { TIER_MONTHLY_CREDITS, type PaidTier } from '@/lib/b2b-subscription'

interface UpgradeModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /**
   * Variant steuert Copy + Default-CTA-Highlight:
   * - 'free_exhausted': "Credits leer" — Default-Highlight auf Starter
   * - 'watermark_blocker': "Du willst Clean-Export" — Default-Highlight auf Starter
   * - 'cta': "Pro werden"-CTA aus Editor-Header — Default-Highlight auf Pro
   */
  variant?: 'free_exhausted' | 'watermark_blocker' | 'cta'
}

const TIER_HIGHLIGHTS: Record<PaidTier, string[]> = {
  starter: [
    '25 Designs pro Monat',
    'Kein Watermark',
    'Commercial License',
    '7-Tage-Trial kostenlos',
  ],
  pro: [
    '100 Designs pro Monat',
    'Kein Watermark',
    'Commercial License',
    'Roll-Over fuer unverbrauchte Credits',
    '7-Tage-Trial kostenlos',
  ],
  business: [
    '300 Designs pro Monat',
    'Kein Watermark',
    'Commercial License',
    'Roll-Over fuer unverbrauchte Credits',
    'Prioritaets-Support',
    '7-Tage-Trial kostenlos',
  ],
}

export function UpgradeModal({ open, onOpenChange, variant = 'cta' }: UpgradeModalProps) {
  const router = useRouter()
  const locale = useLocale()
  const [busyTier, setBusyTier] = useState<PaidTier | null>(null)

  const recommendedTier: PaidTier = variant === 'cta' ? 'pro' : 'starter'

  const title =
    variant === 'free_exhausted'
      ? 'Deine 3 Free-Credits fuer diesen Monat sind aufgebraucht'
      : variant === 'watermark_blocker'
        ? 'Clean-Exporte ohne Watermark'
        : 'Petite-Moment Pro werden'

  const description =
    variant === 'free_exhausted'
      ? 'Mit einem Pro-Plan exportierst du in den naechsten 30 Tagen ohne Limit weiter. 7-Tage-Trial kostenlos.'
      : variant === 'watermark_blocker'
        ? 'Watermark-frei exportieren + Commercial License fuer Etsy & Co. 7-Tage-Trial kostenlos.'
        : 'Monatliches Abo fuer Druckereien, Etsy-Kreatoren und Pro-User. 7-Tage-Trial, jederzeit kuendbar.'

  const handleSelectTier = async (tier: PaidTier) => {
    setBusyTier(tier)
    try {
      const res = await fetch('/api/business/checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ tier, currency: 'eur', locale }),
      })
      const data = (await res.json()) as { url?: string; error?: string }
      if (!res.ok || !data.url) {
        throw new Error(data.error ?? `Checkout failed (${res.status})`)
      }
      // Redirect zu Stripe Hosted Checkout.
      window.location.href = data.url
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Checkout fehlgeschlagen')
      setBusyTier(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 py-4">
          {(['starter', 'pro', 'business'] as const).map((tier) => {
            const isRecommended = tier === recommendedTier
            return (
              <div
                key={tier}
                className={`flex flex-col rounded-lg border p-4 transition-colors ${
                  isRecommended
                    ? 'border-primary bg-primary/5 shadow-sm'
                    : 'border-border'
                }`}
              >
                {isRecommended && (
                  <span className="text-xs font-medium uppercase tracking-wider text-primary mb-2">
                    Empfohlen
                  </span>
                )}
                <h3 className="text-lg font-semibold capitalize">{tier}</h3>
                <p className="text-2xl font-bold mt-1">
                  {TIER_MONTHLY_CREDITS[tier]}
                  <span className="text-sm font-normal text-muted-foreground">
                    {' '}
                    Credits/Monat
                  </span>
                </p>
                <ul className="mt-3 space-y-1.5 flex-1">
                  {TIER_HIGHLIGHTS[tier].map((item) => (
                    <li key={item} className="flex items-start gap-2 text-sm">
                      <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  onClick={() => handleSelectTier(tier)}
                  disabled={busyTier !== null}
                  variant={isRecommended ? 'default' : 'outline'}
                  className="mt-4 w-full"
                >
                  {busyTier === tier ? 'Wird geladen…' : 'Trial starten'}
                  {busyTier !== tier && <ArrowRight className="w-4 h-4 ml-1" />}
                </Button>
              </div>
            )
          })}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
          <p className="text-xs text-muted-foreground text-center sm:text-left flex-1">
            Preise + Currency-Auswahl auf der vollen{' '}
            <button
              onClick={() => router.push(`/${locale}/business/upgrade`)}
              className="underline hover:text-foreground"
            >
              Pricing-Seite
            </button>
          </p>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Spaeter
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
