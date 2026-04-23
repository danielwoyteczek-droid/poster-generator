import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { LandingNav } from '@/components/landing/LandingNav'
import { AdminOrdersList } from '@/components/admin/AdminOrdersList'
import { requireAdmin } from '@/lib/admin-auth'

export const metadata: Metadata = {
  title: 'Bestellverwaltung | Poster Generator',
}

export default async function AdminOrdersPage() {
  const auth = await requireAdmin()
  if (!auth.ok) {
    if (auth.status === 401) redirect('/login')
    redirect('/')
  }

  return (
    <div className="min-h-screen flex flex-col pt-16 bg-gray-50">
      <LandingNav />
      <main className="flex-1">
        <div className="max-w-6xl mx-auto px-6 py-10">
          <h1 className="text-2xl font-semibold text-gray-900 mb-8">Bestellverwaltung</h1>
          <AdminOrdersList />
        </div>
      </main>
    </div>
  )
}
