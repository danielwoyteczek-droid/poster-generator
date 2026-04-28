import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { LandingNav } from '@/components/landing/LandingNav'
import { AdminCompositionsList } from '@/components/admin/AdminCompositionsList'
import { requireAdmin } from '@/lib/admin-auth'

export const metadata: Metadata = {
  title: 'Compositions | Poster Generator',
}

export default async function CompositionsPage() {
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
          <h1 className="text-2xl font-semibold text-foreground mb-2">Compositions</h1>
          <p className="text-sm text-muted-foreground mb-8 max-w-3xl">
            Mockup-Compositions kombinieren mehrere Presets in EINEM Mockup-Set mit mehreren Slots
            (z. B. Diptychon Berlin + Hamburg). Eignen sich für „Andere/Mixed"-Sektionen, wo ein
            einzelner Anlass-Tag nicht passt.
          </p>
          <AdminCompositionsList />
        </div>
      </main>
    </div>
  )
}
