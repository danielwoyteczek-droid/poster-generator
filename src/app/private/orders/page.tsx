import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { LandingNav } from '@/components/landing/LandingNav'
import { UserOrdersList } from '@/components/cart/UserOrdersList'
import { createClient } from '@/lib/supabase-server'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('projects')
  return { title: t('ordersPageTitle') }
}

export default async function PrivateOrdersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const t = await getTranslations('projects')

  return (
    <div className="min-h-screen flex flex-col pt-16 bg-muted">
      <LandingNav />
      <main className="flex-1">
        <div className="max-w-5xl mx-auto px-6 py-10">
          <div className="flex items-center gap-6 mb-8 border-b border-border">
            <Link
              href="/private"
              className="pb-3 text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              {t('tabPosters')}
            </Link>
            <Link
              href="/private/orders"
              className="pb-3 text-sm font-medium text-foreground border-b-2 border-primary -mb-px"
            >
              {t('tabOrders')}
            </Link>
          </div>
          <UserOrdersList />
        </div>
      </main>
    </div>
  )
}
