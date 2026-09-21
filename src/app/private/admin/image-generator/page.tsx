import { Suspense } from 'react'
import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { LandingNav } from '@/components/landing/LandingNav'
import { AdminImageGenerator } from '@/components/admin/image-generator/AdminImageGenerator'
import { requireAdmin } from '@/lib/admin-auth'

export const metadata: Metadata = {
  title: 'Image Generator | Poster Generator',
}

export default async function ImageGeneratorPage() {
  const auth = await requireAdmin()
  if (!auth.ok) {
    if (auth.status === 401) redirect('/login')
    redirect('/')
  }

  return (
    <div className="min-h-screen flex flex-col pt-16 bg-muted">
      <LandingNav />
      <main className="flex-1">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
          <div className="mb-6">
            <h1 className="text-2xl font-semibold text-foreground">Image Generator</h1>
            <p className="mt-2 text-sm text-muted-foreground max-w-2xl">
              Preset wählen, Mockups auswählen, erstellen. Alle Bilder landen in der Galerie des Presets.
            </p>
          </div>
          <Suspense fallback={null}>
            <AdminImageGenerator />
          </Suspense>
        </div>
      </main>
    </div>
  )
}
