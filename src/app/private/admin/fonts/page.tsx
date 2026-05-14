import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { LandingNav } from '@/components/landing/LandingNav'
import { AdminFontsList } from '@/components/admin/AdminFontsList'
import { requireAdmin } from '@/lib/admin-auth'

export const metadata: Metadata = {
  title: 'Fonts | Poster Generator',
}

export default async function AdminFontsPage() {
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
          <h1 className="text-2xl font-semibold text-foreground mb-2">Fonts</h1>
          <p className="text-sm text-muted-foreground mb-8">
            Schriften, die der Customer im Editor wählen kann. Drafts sind nur hier sichtbar; veröffentlichte Fonts erscheinen im
            Kunden-Editor (sobald Phase 2 die hartkodierte Liste durch <code>useFonts()</code> ersetzt).
          </p>
          <AdminFontsList />
        </div>
      </main>
    </div>
  )
}
