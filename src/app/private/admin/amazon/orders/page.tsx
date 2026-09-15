import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { LandingNav } from '@/components/landing/LandingNav'
import { AdminAmazonOrders } from '@/components/admin/AdminAmazonOrders'
import { requireAdmin } from '@/lib/admin-auth'

export const metadata: Metadata = {
  title: 'Amazon-Bestellungen | Poster Generator',
}

export default async function AdminAmazonOrdersPage() {
  const auth = await requireAdmin()
  if (!auth.ok) {
    if (auth.status === 401) redirect('/login')
    redirect('/')
  }

  return (
    <div className="min-h-screen flex flex-col pt-16 bg-muted">
      <LandingNav />
      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-6 py-10">
          <h1 className="text-2xl font-semibold text-foreground mb-2">
            Amazon-Bestellungen
          </h1>
          <p className="text-sm text-muted-foreground mb-8 max-w-3xl">
            Was der Abholer aus JTL geliefert hat, eine Zeile je Bestellposition.
            Beim Öffnen steht der Filter auf offen — Erledigtes musst du bewusst holen.
            Käufertexte stehen nur in der Detailansicht.
          </p>
          <AdminAmazonOrders />
        </div>
      </main>
    </div>
  )
}
