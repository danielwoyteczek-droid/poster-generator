import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { LandingNav } from '@/components/landing/LandingNav'
import { CsvImportForm } from '@/components/admin/CsvImportForm'
import { requireAdmin } from '@/lib/admin-auth'

export const metadata: Metadata = {
  title: 'Presets per CSV importieren | Poster Generator',
}

export default async function CsvImportPage() {
  const auth = await requireAdmin()
  if (!auth.ok) {
    if (auth.status === 401) redirect('/login')
    redirect('/')
  }

  return (
    <div className="min-h-screen flex flex-col pt-16 bg-muted">
      <LandingNav />
      <main className="flex-1">
        <div className="max-w-4xl mx-auto px-6 py-10">
          <h1 className="text-2xl font-semibold text-foreground mb-2">Presets per CSV importieren</h1>
          <p className="text-sm text-muted-foreground mb-8 max-w-3xl">
            Bulk-Anlage von Presets durch Klonen eines Master-Presets. Jede CSV-Zeile = 1 neues Preset
            mit der Design-Config des Masters, aber eigener Location + Texten.
          </p>
          <CsvImportForm />
        </div>
      </main>
    </div>
  )
}
