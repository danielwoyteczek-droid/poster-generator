'use client'

import { useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { toast } from 'sonner'

export function ConfirmedToast() {
  const searchParams = useSearchParams()
  const router = useRouter()

  useEffect(() => {
    if (searchParams.get('confirmed') === '1') {
      toast.success('E-Mail-Adresse bestätigt. Willkommen!')
      // Clean up the query param so refresh doesn't re-trigger the toast
      router.replace('/private')
    }
  }, [searchParams, router])

  return null
}
