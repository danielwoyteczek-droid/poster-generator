import type { Metadata } from 'next'
import { LandingNav } from '@/components/landing/LandingNav'
import { UpgradeView } from '@/components/business/UpgradeView'

export const metadata: Metadata = {
  title: 'Pro werden · Petite-Moment',
  description:
    'Waehle deinen Pro-Plan: Starter, Pro oder Business. Alle inkl. Commercial License und 7-Tage-Trial.',
}

/**
 * PROJ-50: /[locale]/business/upgrade — Tier-Vergleichs-Page mit
 * Stripe-Checkout-Trigger. Erfordert nicht zwingend Login (Login-Wall
 * tritt erst beim Checkout-Klick).
 */
export default function UpgradePage() {
  return (
    <div className="min-h-screen flex flex-col pt-16 bg-muted">
      <LandingNav />
      <main className="flex-1">
        <div className="max-w-5xl mx-auto px-6 py-10">
          <div className="text-center mb-10">
            <h1 className="text-3xl font-bold text-foreground mb-3">
              Waehle deinen Pro-Plan
            </h1>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Alle Plans inklusive Commercial License, Watermark-frei, 7-Tage-Trial.
              Monatlich kuendbar — keine Mindestlaufzeit.
            </p>
          </div>
          <UpgradeView />
        </div>
      </main>
    </div>
  )
}
