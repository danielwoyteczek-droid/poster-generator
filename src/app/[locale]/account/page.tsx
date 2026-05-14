import type { Metadata } from 'next'
import { LandingNav } from '@/components/landing/LandingNav'
import { AccountView } from '@/components/business/AccountView'

export const metadata: Metadata = {
  title: 'Mein Konto · Petite-Moment',
}

/**
 * PROJ-50: /[locale]/account — User-Account-Page mit B2B-Subscription-Panel,
 * Usage-Ledger und Stripe-Hosted-Invoices-Link. Bestehende Order-History
 * (B2C-One-Time) lebt unter /orders weiter und wird hier verlinkt.
 */
export default function AccountPage() {
  return (
    <div className="min-h-screen flex flex-col pt-16 bg-muted">
      <LandingNav />
      <main className="flex-1">
        <div className="max-w-5xl mx-auto px-6 py-10">
          <h1 className="text-2xl font-semibold text-foreground mb-8">Mein Konto</h1>
          <AccountView />
        </div>
      </main>
    </div>
  )
}
