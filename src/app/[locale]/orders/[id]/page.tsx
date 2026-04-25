import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { LandingNav } from '@/components/landing/LandingNav'
import { OrderView } from '@/components/cart/OrderView'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('order')
  return { title: t('pageTitle') }
}

export default async function OrderPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ token?: string; success?: string }>
}) {
  const { id } = await params
  const sp = await searchParams

  return (
    <div className="min-h-screen flex flex-col pt-16 bg-muted">
      <LandingNav />
      <main className="flex-1">
        <div className="max-w-3xl mx-auto px-6 py-10">
          <OrderView orderId={id} token={sp.token ?? ''} showSuccessBanner={sp.success === '1'} />
        </div>
      </main>
    </div>
  )
}
