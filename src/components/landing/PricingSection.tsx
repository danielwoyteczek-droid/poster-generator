'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { Download, ImageIcon, Frame, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PRODUCTS, formatPrice } from '@/lib/products'
import { priceFromCatalog, useProductCatalog } from '@/hooks/useProductCatalog'
import type { PrintFormat } from '@/lib/print-formats'
import { DiscountBadge } from '@/components/ui/discount-badge'
import { cn } from '@/lib/utils'

const FORMATS: Array<{ id: PrintFormat; label: string }> = [
  { id: 'a4', label: 'A4' },
  { id: 'a3', label: 'A3' },
]

const PRODUCT_ICONS = {
  download: Download,
  poster: ImageIcon,
  frame: Frame,
}

export function PricingSection() {
  const t = useTranslations('pricing')
  const [format, setFormat] = useState<PrintFormat>('a4')
  const { products: catalog, loading } = useProductCatalog()

  return (
    <section id="pricing" className="py-24 bg-background">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-serif font-medium text-foreground">
            {t('heading')}
          </h2>
          <p className="mt-4 text-muted-foreground text-lg max-w-xl mx-auto">
            {t('subtitle')}
          </p>

          <div className="mt-8 inline-flex rounded-full border border-border p-1 bg-muted">
            {FORMATS.map((f) => (
              <button
                key={f.id}
                onClick={() => setFormat(f.id)}
                className={cn(
                  'px-5 py-2 text-sm font-medium rounded-full transition-colors',
                  format === f.id
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {PRODUCTS.map((product, idx) => {
            const Icon = PRODUCT_ICONS[product.id as keyof typeof PRODUCT_ICONS]
            const isHighlighted = idx === 1
            const price = priceFromCatalog(catalog, product.id, format)

            return (
              <div
                key={product.id}
                className={cn(
                  'rounded-2xl border p-6 flex flex-col',
                  isHighlighted
                    ? 'border-primary bg-primary text-primary-foreground shadow-xl'
                    : 'border-border bg-background',
                )}
              >
                <div className={cn(
                  'w-10 h-10 rounded-lg flex items-center justify-center mb-4',
                  isHighlighted ? 'bg-primary-foreground/10' : 'bg-muted',
                )}>
                  <Icon className={cn('w-5 h-5', isHighlighted ? 'text-primary-foreground' : 'text-foreground')} />
                </div>

                <h3 className={cn('font-semibold text-lg', isHighlighted ? 'text-primary-foreground' : 'text-foreground')}>
                  {product.label}
                </h3>
                <p className={cn('text-sm mt-1 mb-6', isHighlighted ? 'text-primary-foreground/60' : 'text-muted-foreground')}>
                  {product.description}
                </p>

                <div className="mt-auto">
                  <div className={cn('mb-6', isHighlighted ? 'text-primary-foreground' : 'text-foreground')}>
                    {price?.compareAtCents && price.compareAtCents > price.unitAmount && (
                      <div className="flex items-center gap-2 mb-1">
                        <span className={cn('text-sm line-through', isHighlighted ? 'text-primary-foreground/50' : 'text-muted-foreground/70')}>
                          {formatPrice(price.compareAtCents)}
                        </span>
                        <DiscountBadge unitAmount={price.unitAmount} compareAtCents={price.compareAtCents} />
                      </div>
                    )}
                    <div className="text-3xl font-bold">
                      {price ? formatPrice(price.unitAmount) : loading ? '…' : '–'}
                    </div>
                  </div>
                  <Button
                    asChild
                    className={cn(
                      'w-full',
                      isHighlighted ? 'bg-background text-foreground hover:bg-muted' : '',
                    )}
                    variant={isHighlighted ? 'secondary' : 'outline'}
                  >
                    <Link href="/map">
                      {t('ctaCreate')}
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Link>
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
