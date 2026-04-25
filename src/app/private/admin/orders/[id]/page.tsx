import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { LandingNav } from '@/components/landing/LandingNav'
import { AdminOrderDetail } from '@/components/admin/AdminOrderDetail'
import { requireAdmin } from '@/lib/admin-auth'

export const metadata: Metadata = {
  title: 'Bestelldetail | Poster Generator',
}

export default async function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const auth = await requireAdmin()
  if (!auth.ok) {
    if (auth.status === 401) redirect('/login')
    redirect('/')
  }
  const { id } = await params

  return (
    <div className="min-h-screen flex flex-col pt-16 bg-muted">
      <LandingNav />
      <main className="flex-1">
        <div className="max-w-4xl mx-auto px-6 py-10">
          <AdminOrderDetail orderId={id} />
        </div>
      </main>
    </div>
  )
}
