import type { Metadata } from 'next'
import { Suspense } from 'react'
import Link from 'next/link'
import { ProjectDashboard } from '@/components/projects/ProjectDashboard'
import { LandingNav } from '@/components/landing/LandingNav'
import { ConfirmedToast } from '@/components/ConfirmedToast'

export const metadata: Metadata = {
  title: 'Meine Poster | Poster Generator',
}

export default function PrivatePage() {
  return (
    <div className="h-screen flex flex-col overflow-hidden pt-14">
      <LandingNav />
      <Suspense fallback={null}>
        <ConfirmedToast />
      </Suspense>
      <main className="flex-1 overflow-y-auto bg-gray-50">
        <div className="max-w-5xl mx-auto px-6 py-10">
          <div className="flex items-center gap-6 mb-8 border-b border-gray-200">
            <Link
              href="/private"
              className="pb-3 text-sm font-medium text-gray-900 border-b-2 border-gray-900 -mb-px"
            >
              Meine Poster
            </Link>
            <Link
              href="/private/orders"
              className="pb-3 text-sm font-medium text-gray-500 hover:text-gray-900"
            >
              Meine Bestellungen
            </Link>
          </div>
          <ProjectDashboard />
        </div>
      </main>
    </div>
  )
}
