import type { Metadata } from 'next'
import { LandingNav } from '@/components/landing/LandingNav'
import { CheckoutSuccessView } from '@/components/cart/CheckoutSuccessView'

export const metadata: Metadata = {
  title: 'Zahlung erfolgreich | Poster Generator',
}

export default function CheckoutSuccessPage() {
  return (
    <div className="min-h-screen flex flex-col pt-14 bg-gray-50">
      <LandingNav />
      <main className="flex-1 flex items-center justify-center px-4 py-10">
        <CheckoutSuccessView />
      </main>
    </div>
  )
}
