import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { LandingNav } from '@/components/landing/LandingNav'
import { AdminListingImageSetsList } from '@/components/admin/AdminListingImageSetsList'
import { requireAdmin } from '@/lib/admin-auth'

export const metadata: Metadata = {
  title: 'Listing-Image-Sets | Poster Generator',
}

export default async function AdminListingImageSetsPage() {
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
          <div className="mb-8">
            <h1 className="text-2xl font-semibold text-foreground">Listing-Image-Sets</h1>
            <p className="mt-2 text-sm text-muted-foreground max-w-2xl">
              Etsy-Bild-Vorlagen pro Produkttyp. Ein Set definiert die N Bilder eines Etsy-Listings
              (Hero, Personalisierungs-Pfeil, Premium-Detail …) als wiederverwendbares Rezept.
              Wird von der PROJ-53 Mass-Listing-Pipeline angewendet.
            </p>
          </div>
          <AdminListingImageSetsList />
        </div>
      </main>
    </div>
  )
}
