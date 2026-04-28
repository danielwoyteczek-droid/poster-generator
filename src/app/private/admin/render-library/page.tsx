import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { LandingNav } from '@/components/landing/LandingNav'
import { AdminRenderLibrary } from '@/components/admin/AdminRenderLibrary'
import { requireAdmin } from '@/lib/admin-auth'

export const metadata: Metadata = {
  title: 'Render-Library | Poster Generator',
}

export default async function RenderLibraryPage() {
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
          <h1 className="text-2xl font-semibold text-foreground mb-2">Render-Library</h1>
          <p className="text-sm text-muted-foreground mb-8 max-w-3xl">
            Alle fertigen Mockup-Composites (Preset × Mockup-Set × Variante) — filterbar, copy-URL, click für Lightbox.
            Diese Bilder werden auf den Anlass-Landing-Pages und in der Galerie ausgespielt.
          </p>
          <AdminRenderLibrary />
        </div>
      </main>
    </div>
  )
}
