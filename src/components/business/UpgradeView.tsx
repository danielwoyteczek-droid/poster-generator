'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useLocale } from 'next-intl'
import { Check, ArrowRight } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useAuth } from '@/hooks/useAuth'
import { useB2BSubscription } from '@/hooks/useB2BSubscription'
import {
  CURRENCIES,
  PAID_TIERS,
  TIER_MONTHLY_CREDITS,
  type Currency,
  type PaidTier,
} from '@/lib/b2b-subscription'

const TIER_DESCRIPTIONS: Record<PaidTier, string> = {
  starter: 'Fuer Einsteiger und kleine Etsy-Shops, die testen wollen.',
  pro: 'Fuer aktive Etsy-Kreatoren mit regelmaessigem Volumen.',
  business: 'Fuer Druckereien, Copyshops und High-Volume-Kreatoren.',
}

const TIER_HIGHLIGHTS: Record<PaidTier, string[]> = {
  starter: [
    `${TIER_MONTHLY_CREDITS.starter} neue Designs pro Monat`,
    'Re-Downloads desselben Projekts gratis',
    'Watermark-frei',
    'Commercial License',
    '7-Tage-Trial',
  ],
  pro: [
    `${TIER_MONTHLY_CREDITS.pro} neue Designs pro Monat`,
    'Re-Downloads desselben Projekts gratis',
    'Watermark-frei',
    'Commercial License',
    'Roll-Over fuer unverbrauchte Credits (max. 1 Monat)',
    '7-Tage-Trial',
  ],
  business: [
    `${TIER_MONTHLY_CREDITS.business} neue Designs pro Monat`,
    'Re-Downloads desselben Projekts gratis',
    'Watermark-frei',
    'Commercial License',
    'Roll-Over fuer unverbrauchte Credits (max. 1 Monat)',
    'Prioritaets-Support',
    '7-Tage-Trial',
  ],
}

const CURRENCY_LABELS: Record<Currency, string> = {
  eur: 'EUR (€)',
  usd: 'USD ($)',
  gbp: 'GBP (£)',
}

export function UpgradeView() {
  const router = useRouter()
  const locale = useLocale()
  const { user, loading: authLoading } = useAuth()
  const { status } = useB2BSubscription()
  const [currency, setCurrency] = useState<Currency>('eur')
  const [busyTier, setBusyTier] = useState<PaidTier | null>(null)

  const handleSelect = async (tier: PaidTier) => {
    if (!user) {
      router.push(`/${locale}/login?redirect=/${locale}/business`)
      return
    }
    setBusyTier(tier)
    try {
      const res = await fetch('/api/business/checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ tier, currency, locale }),
      })
      const data = (await res.json()) as { url?: string; error?: string; existing_tier?: string }
      if (res.status === 409 && data.existing_tier) {
        toast.error(
          `Du hast bereits ein aktives ${data.existing_tier}-Abo. Verwende das Stripe Customer Portal zum Plan-Wechsel.`,
        )
        router.push(`/${locale}/account`)
        return
      }
      if (!res.ok || !data.url) {
        throw new Error(data.error ?? `Checkout fehlgeschlagen (${res.status})`)
      }
      window.location.href = data.url
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Checkout fehlgeschlagen')
      setBusyTier(null)
    }
  }

  const hasActiveSub =
    status &&
    status.status !== 'canceled' &&
    !['free'].includes(status.tier)

  return (
    <div className="space-y-8">
      {/* Currency-Switcher */}
      <div className="flex justify-end">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Waehrung:</span>
          <Select value={currency} onValueChange={(v) => setCurrency(v as Currency)}>
            <SelectTrigger className="w-32 h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CURRENCIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {CURRENCY_LABELS[c]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {hasActiveSub && (
        <Card className="border-amber-300 bg-amber-50/50">
          <CardContent className="pt-6">
            <p className="text-sm">
              Du hast bereits ein aktives Abo (
              <span className="font-medium capitalize">{status?.tier}</span>). Plan-Wechsel
              geht ueber das{' '}
              <button
                onClick={() => router.push(`/${locale}/account`)}
                className="underline font-medium hover:text-amber-900"
              >
                Account-Portal
              </button>
              .
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {PAID_TIERS.map((tier) => {
          const isRecommended = tier === 'pro'
          return (
            <Card
              key={tier}
              className={`relative flex flex-col ${
                isRecommended ? 'border-primary shadow-md ring-1 ring-primary' : ''
              }`}
            >
              {isRecommended && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-medium px-3 py-1 rounded-full">
                  Empfohlen
                </div>
              )}
              <CardHeader>
                <CardTitle className="capitalize">{tier}</CardTitle>
                <CardDescription>{TIER_DESCRIPTIONS[tier]}</CardDescription>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col">
                <p className="text-3xl font-bold mb-1">
                  {TIER_MONTHLY_CREDITS[tier]}
                  <span className="text-base font-normal text-muted-foreground ml-1">
                    Credits/Monat
                  </span>
                </p>
                <p className="text-sm text-muted-foreground mb-6">
                  Preis siehe Stripe-Checkout · {CURRENCY_LABELS[currency]}
                </p>
                <ul className="space-y-2 flex-1 mb-6">
                  {TIER_HIGHLIGHTS[tier].map((item) => (
                    <li key={item} className="flex items-start gap-2 text-sm">
                      <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  onClick={() => handleSelect(tier)}
                  disabled={busyTier !== null || authLoading || hasActiveSub === true}
                  variant={isRecommended ? 'default' : 'outline'}
                  className="w-full"
                >
                  {busyTier === tier
                    ? 'Wird geladen…'
                    : hasActiveSub
                      ? 'Bestehendes Abo'
                      : '7-Tage-Trial starten'}
                  {busyTier !== tier && !hasActiveSub && <ArrowRight className="w-4 h-4 ml-1" />}
                </Button>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <p className="text-xs text-muted-foreground text-center max-w-2xl mx-auto">
        Mit Klick auf &quot;Trial starten&quot; wirst du zu Stripe weitergeleitet. Trial-Sign-up
        erfordert eine Kreditkarte, wird aber 7 Tage lang nicht belastet. Stripe Tax berechnet
        automatisch die korrekte USt./VAT fuer dein Land.
      </p>
    </div>
  )
}
