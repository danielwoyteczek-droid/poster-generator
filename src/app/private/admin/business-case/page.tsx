import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { LandingNav } from '@/components/landing/LandingNav'
import { BusinessCenterShell } from '@/components/admin/BusinessCenterShell'
import { requireAdmin } from '@/lib/admin-auth'

export const metadata: Metadata = {
  title: 'Business Center | Poster Generator',
}

export default async function AdminBusinessCasePage() {
  const auth = await requireAdmin()
  if (!auth.ok) {
    if (auth.status === 401) redirect('/login')
    redirect('/')
  }

  return (
    <div className="min-h-screen flex flex-col pt-16 bg-muted">
      <LandingNav />
      <main className="flex-1">
        <div className="max-w-6xl mx-auto px-6 py-10">
          <h1 className="text-2xl font-semibold text-foreground mb-2">Business Center</h1>
          <p className="text-sm text-muted-foreground mb-8">
            Internes Operator-Tool für Business-Case-Modellierung. Mehrere benannte
            Szenarien anlegen, vergleichen und als verbindlichen Plan verabschieden.
            Ist-Daten kommen in Phase 2 aus echten Bestellungen.
          </p>
          <BusinessCenterShell />
        </div>
      </main>
    </div>
  )
}
