import type { Metadata } from 'next'
import { Suspense } from 'react'
import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { ProjectDashboard } from '@/components/projects/ProjectDashboard'
import { LandingNav } from '@/components/landing/LandingNav'
import { ConfirmedToast } from '@/components/ConfirmedToast'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('projects')
  return { title: t('pageTitle') }
}

export default async function PrivatePage() {
  const t = await getTranslations('projects')
  return (
    <div className="h-screen flex flex-col overflow-hidden pt-16">
      <LandingNav />
      <Suspense fallback={null}>
        <ConfirmedToast />
      </Suspense>
      <main className="flex-1 overflow-y-auto bg-muted">
        <div className="max-w-5xl mx-auto px-6 py-10">
          <div className="flex items-center gap-6 mb-8 border-b border-border">
            <Link
              href="/private"
              className="pb-3 text-sm font-medium text-foreground border-b-2 border-primary -mb-px"
            >
              {t('tabPosters')}
            </Link>
            <Link
              href="/private/orders"
              className="pb-3 text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              {t('tabOrders')}
            </Link>
          </div>
          <ProjectDashboard />
        </div>
      </main>
    </div>
  )
}
