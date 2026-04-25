import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { LandingNav } from '@/components/landing/LandingNav'
import { CartView } from '@/components/cart/CartView'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('cart')
  return { title: t('pageTitle') }
}

export default async function CartPage() {
  const t = await getTranslations('cart')
  return (
    <div className="min-h-screen flex flex-col pt-16 bg-muted">
      <LandingNav />
      <main className="flex-1">
        <div className="max-w-4xl mx-auto px-6 py-10">
          <h1 className="text-2xl font-semibold text-foreground mb-8">{t('heading')}</h1>
          <CartView />
        </div>
      </main>
    </div>
  )
}
