import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { LandingNav } from '@/components/landing/LandingNav'
import { UserOrdersList } from '@/components/cart/UserOrdersList'
import { createClient } from '@/lib/supabase-server'

export const metadata: Metadata = {
  title: 'Meine Bestellungen | Poster Generator',
}

export default async function PrivateOrdersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <div className="min-h-screen flex flex-col pt-16 bg-gray-50">
      <LandingNav />
      <main className="flex-1">
        <div className="max-w-5xl mx-auto px-6 py-10">
          <div className="flex items-center gap-6 mb-8 border-b border-gray-200">
            <Link
              href="/private"
              className="pb-3 text-sm font-medium text-gray-500 hover:text-gray-900"
            >
              Meine Poster
            </Link>
            <Link
              href="/private/orders"
              className="pb-3 text-sm font-medium text-gray-900 border-b-2 border-gray-900 -mb-px"
            >
              Meine Bestellungen
            </Link>
          </div>
          <UserOrdersList />
        </div>
      </main>
    </div>
  )
}
