import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { LandingNav } from '@/components/landing/LandingNav'
import { AdminEtsyOAuthPanel } from '@/components/admin/AdminEtsyOAuthPanel'
import { requireAdmin } from '@/lib/admin-auth'

export const metadata: Metadata = {
  title: 'Etsy OAuth | Poster Generator',
}

interface PageProps {
  searchParams: Promise<{ status?: string; reason?: string; shop_name?: string }>
}

export default async function AdminEtsyOAuthPage({ searchParams }: PageProps) {
  const auth = await requireAdmin()
  if (!auth.ok) {
    if (auth.status === 401) redirect('/login')
    redirect('/')
  }
  const params = await searchParams

  return (
    <div className="min-h-screen flex flex-col pt-16 bg-muted">
      <LandingNav />
      <main className="flex-1">
        <div className="max-w-3xl mx-auto px-6 py-10">
          <h1 className="text-2xl font-semibold text-foreground mb-2">Etsy OAuth</h1>
          <p className="text-sm text-muted-foreground mb-8">
            Einmaliger Setup-Flow, der den Etsy-Shop mit dem Backend verbindet.
            Der Refresh-Token wird verschlüsselt-at-rest in Supabase gespeichert
            und alle 60 Min automatisch erneuert.
          </p>
          <AdminEtsyOAuthPanel
            callbackStatus={params.status ?? null}
            callbackReason={params.reason ?? null}
            callbackShopName={params.shop_name ?? null}
          />
        </div>
      </main>
    </div>
  )
}
