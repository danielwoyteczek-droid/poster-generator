import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { LandingNav } from '@/components/landing/LandingNav'
import { AdminAmazonSkus } from '@/components/admin/AdminAmazonSkus'
import { requireAdmin } from '@/lib/admin-auth'

export const metadata: Metadata = {
  title: 'Amazon-SKUs | Poster Generator',
}

export default async function AdminAmazonSkusPage() {
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
            Amazon-SKUs
          </h1>
          <p className="text-sm text-muted-foreground mb-8 max-w-3xl">
            Der Abholer schickt nur die Artikelnummer. Welches Design dahintersteht,
            wird hier entschieden. Eine Bestellung ohne Zuordnung wird nicht gerendert,
            sondern wartet — sie geht nicht verloren. Sobald du ein Design zuordnest,
            werden die wartenden Bestellungen dieser SKU automatisch neu ausgewertet.
          </p>
          <AdminAmazonSkus />
        </div>
      </main>
    </div>
  )
}
