'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useCartStore } from '@/hooks/useCartStore'

export function CheckoutSuccessView() {
  const t = useTranslations('checkoutSuccess')
  const clearCart = useCartStore((s) => s.clearCart)

  useEffect(() => {
    clearCart()
  }, [clearCart])

  return (
    <div className="max-w-md w-full bg-white rounded-xl border border-border p-8 text-center">
      <CheckCircle2 className="w-14 h-16 text-green-500 mx-auto mb-4" />
      <h1 className="text-2xl font-semibold text-foreground mb-2">{t('thankYou')}</h1>
      <p className="text-muted-foreground leading-relaxed mb-6">
        {t('body')}
      </p>
      <div className="flex flex-col sm:flex-row gap-2 justify-center">
        <Button asChild variant="outline">
          <Link href="/">{t('homeCta')}</Link>
        </Button>
        <Button asChild>
          <Link href="/map">{t('createAnotherCta')}</Link>
        </Button>
      </div>
    </div>
  )
}
