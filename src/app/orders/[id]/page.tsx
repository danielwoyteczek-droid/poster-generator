import type { Metadata } from 'next'
import { LandingNav } from '@/components/landing/LandingNav'
import { OrderView } from '@/components/cart/OrderView'

export const metadata: Metadata = {
  title: 'Deine Bestellung | Poster Generator',
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
    <div className="min-h-screen flex flex-col pt-14 bg-gray-50">
      <LandingNav />
      <main className="flex-1">
        <div className="max-w-3xl mx-auto px-6 py-10">
          <OrderView orderId={id} token={sp.token ?? ''} showSuccessBanner={sp.success === '1'} />
        </div>
      </main>
    </div>
  )
}
