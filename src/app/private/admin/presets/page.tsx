import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Upload, Image as ImageIcon } from 'lucide-react'
import { LandingNav } from '@/components/landing/LandingNav'
import { AdminPresetsList } from '@/components/admin/AdminPresetsList'
import { Button } from '@/components/ui/button'
import { requireAdmin } from '@/lib/admin-auth'

export const metadata: Metadata = {
  title: 'Design-Presets | Poster Generator',
}

export default async function AdminPresetsPage() {
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
          <div className="flex items-center justify-between gap-3 flex-wrap mb-8">
            <h1 className="text-2xl font-semibold text-foreground">Design-Presets</h1>
            <div className="flex gap-2">
              <Link href="/private/admin/mockup-sets">
                <Button variant="outline" size="sm">
                  <ImageIcon className="w-3.5 h-3.5 mr-1.5" />
                  Mockup-Sets
                </Button>
              </Link>
              <Link href="/private/admin/presets/import">
                <Button variant="outline" size="sm">
                  <Upload className="w-3.5 h-3.5 mr-1.5" />
                  CSV-Import
                </Button>
              </Link>
            </div>
          </div>
          <AdminPresetsList />
        </div>
      </main>
    </div>
  )
}
