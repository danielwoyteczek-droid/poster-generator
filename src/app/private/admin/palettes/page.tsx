import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { LandingNav } from '@/components/landing/LandingNav'
import { AdminPalettesList } from '@/components/admin/AdminPalettesList'
import { requireAdmin } from '@/lib/admin-auth'

export const metadata: Metadata = {
  title: 'Farbpaletten | Poster Generator',
}

export default async function AdminPalettesPage() {
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
          <h1 className="text-2xl font-semibold text-foreground mb-2">Farbpaletten</h1>
          <p className="text-sm text-muted-foreground mb-8">
            Paletten die der Editor und die Design-Presets nutzen. Drafts sind nur hier
            sichtbar; veröffentlichte Paletten erscheinen im Kunden-Editor.
          </p>
          <AdminPalettesList />
        </div>
      </main>
    </div>
  )
}
