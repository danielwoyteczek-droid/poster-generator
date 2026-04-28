import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { LandingNav } from '@/components/landing/LandingNav'
import { AdminMockupSetsList } from '@/components/admin/AdminMockupSetsList'
import { requireAdmin } from '@/lib/admin-auth'

export const metadata: Metadata = {
  title: 'Mockup-Sets | Poster Generator',
}

export default async function AdminMockupSetsPage() {
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
          <h1 className="text-2xl font-semibold text-foreground mb-2">Mockup-Sets</h1>
          <p className="text-sm text-muted-foreground mb-8 max-w-3xl">
            Mockup-Sets verbinden eine Dynamic-Mockups-PSD (extern gehostet) mit unserem Render-Worker.
            PSD im <a href="https://app.dynamicmockups.com" target="_blank" rel="noreferrer" className="underline">Dynamic-Mockups-Dashboard</a> hochladen,
            UUIDs aus dem „Use API"-Snippet kopieren und hier eintragen.
          </p>
          <AdminMockupSetsList />
        </div>
      </main>
    </div>
  )
}
