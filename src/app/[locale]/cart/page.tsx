import type { Metadata } from 'next'
import { LandingNav } from '@/components/landing/LandingNav'
import { CartView } from '@/components/cart/CartView'

export const metadata: Metadata = {
  title: 'Warenkorb | Poster Generator',
}

export default function CartPage() {
  return (
    <div className="min-h-screen flex flex-col pt-16 bg-muted">
      <LandingNav />
      <main className="flex-1">
        <div className="max-w-4xl mx-auto px-6 py-10">
          <h1 className="text-2xl font-semibold text-foreground mb-8">Warenkorb</h1>
          <CartView />
        </div>
      </main>
    </div>
  )
}
