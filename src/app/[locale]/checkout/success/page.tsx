import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { LandingNav } from '@/components/landing/LandingNav'
import { CheckoutSuccessView } from '@/components/cart/CheckoutSuccessView'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('checkoutSuccess')
  return { title: t('pageTitle') }
}

export default function CheckoutSuccessPage() {
  return (
    <div className="min-h-screen flex flex-col pt-16 bg-muted">
      <LandingNav />
      <main className="flex-1 flex items-center justify-center px-4 py-10">
        <CheckoutSuccessView />
      </main>
    </div>
  )
}
