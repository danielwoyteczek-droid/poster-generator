'use client'

import { useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'

export function ConfirmedToast() {
  const t = useTranslations('projects')
  const searchParams = useSearchParams()
  const router = useRouter()

  useEffect(() => {
    if (searchParams.get('confirmed') === '1') {
      toast.success(t('emailConfirmedToast'))
      // Clean up the query param so refresh doesn't re-trigger the toast
      router.replace('/private')
    }
  }, [searchParams, router, t])

  return null
}
