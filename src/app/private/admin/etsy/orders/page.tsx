import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { LandingNav } from '@/components/landing/LandingNav'
import { AdminEtsyOrdersList } from '@/components/admin/AdminEtsyOrdersList'
import { requireAdmin } from '@/lib/admin-auth'

export const metadata: Metadata = {
  title: 'Etsy Bestellungen | Poster Generator',
}

export default async function AdminEtsyOrdersPage() {
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
            Etsy-Bestellungen
          </h1>
          <p className="text-sm text-muted-foreground mb-8">
            Roh-Eingang vom Etsy-Polling. Phase 1+2 zeigt geparste
            Personalisierungs-Daten; Materialisierung in interne{' '}
            <code>orders</code> kommt in Phase 2.5 (PROJ-30 Render-Trigger).
          </p>
          <AdminEtsyOrdersList />
        </div>
      </main>
    </div>
  )
}
