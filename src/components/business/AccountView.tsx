'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useLocale } from 'next-intl'
import { useAuth } from '@/hooks/useAuth'
import { SubscriptionPanel } from './SubscriptionPanel'
import { UsageLedger } from './UsageLedger'
import { InvoicesList } from './InvoicesList'

/**
 * PROJ-50: Client-Wrapper fuer die Account-Page. Trennt Auth-Gating
 * vom Server-Component und buendelt die drei B2B-Panels.
 */
export function AccountView() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const locale = useLocale()

  useEffect(() => {
    if (!loading && !user) {
      router.replace(`/${locale}/login?redirect=/${locale}/account`)
    }
  }, [loading, user, router, locale])

  if (loading || !user) {
    return (
      <div className="space-y-4">
        <div className="h-32 bg-card rounded-lg border animate-pulse" />
        <div className="h-64 bg-card rounded-lg border animate-pulse" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <SubscriptionPanel />
      <UsageLedger />
      <InvoicesList />
    </div>
  )
}
