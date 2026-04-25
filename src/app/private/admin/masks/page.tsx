import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { LandingNav } from '@/components/landing/LandingNav'
import { AdminMasksList } from '@/components/admin/AdminMasksList'
import { requireAdmin } from '@/lib/admin-auth'

export const metadata: Metadata = {
  title: 'Masken-Bibliothek | Poster Generator',
}

export default async function AdminMasksPage() {
  const auth = await requireAdmin()
  if (!auth.ok) {
    if (auth.status === 401) redirect('/login')
    redirect('/')
  }

  return (
    <div className="min-h-screen flex flex-col pt-16 bg-muted">
      <LandingNav />
      <main className="flex-1">
        <div className="max-w-5xl mx-auto px-6 py-10">
          <h1 className="text-2xl font-semibold text-foreground mb-2">Masken-Bibliothek</h1>
          <p className="text-sm text-muted-foreground mb-8">
            Lade eigene SVG-Masken hoch. Diese sind nur im Admin-Editor sichtbar —
            Kunden sehen sie erst, wenn du ein Preset damit erstellst und veröffentlichst.
          </p>
          <AdminMasksList />
        </div>
      </main>
    </div>
  )
}
