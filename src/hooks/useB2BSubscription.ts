'use client'

import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import type { Tier } from '@/lib/b2b-subscription'

export interface SubscriptionStatus {
  tier: Tier
  status: 'active' | 'trialing' | 'past_due' | 'canceled' | 'incomplete' | 'paused'
  creditsRemaining: number
  rolloverCredits: number
  rolloverExpiresAt: string | null
  monthlyQuota: number
  currentPeriodEnd: string | null
  trialEnd: string | null
  cancelAtPeriodEnd: boolean
}

/**
 * PROJ-50: Liefert den aktuellen B2B-Subscription-Status fuer den eingeloggten
 * User. Wird von CreditStatusChip, UpgradeModal, SubscriptionPanel,
 * B2BExportSection konsumiert.
 *
 * Bei nicht-eingeloggten Usern liefert das Hook `status=null` und macht KEINEN
 * API-Call — Visitor-State braucht keinen Subscription-Lookup.
 *
 * `refresh()` triggert ein Refetch (z.B. nach erfolgreichem Export oder nach
 * Stripe-Checkout-Return).
 */
export function useB2BSubscription() {
  const { user, loading: authLoading } = useAuth()
  const [status, setStatus] = useState<SubscriptionStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchStatus = useCallback(async () => {
    if (!user) {
      setStatus(null)
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/business/subscription-status', {
        credentials: 'include',
      })
      if (!res.ok) {
        throw new Error(`Status fetch failed: ${res.status}`)
      }
      const data = (await res.json()) as SubscriptionStatus
      setStatus(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      setStatus(null)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    if (authLoading) return
    void fetchStatus()
  }, [authLoading, fetchStatus])

  return {
    status,
    loading: loading || authLoading,
    error,
    refresh: fetchStatus,
  }
}
