'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { useTranslatedLabel } from '@/lib/i18n-catalog'
import { Download, ImageIcon, Frame, ArrowRight, type LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatPrice } from '@/lib/products'
import {
  frameMarkupFromCatalog,
  priceFromCatalog,
  useProductCatalog,
  type CatalogPrice,
} from '@/hooks/useProductCatalog'
import type { PrintFormat } from '@/lib/print-formats'
import { DiscountBadge } from '@/components/ui/discount-badge'
import { cn } from '@/lib/utils'

const FORMATS: Array<{ id: PrintFormat; label: string }> = [
  { id: 'a4', label: 'A4' },
  { id: 'a3', label: 'A3' },
  { id: 'a2', label: 'A2' },
]

interface PricingCard {
  key: string
  icon: LucideIcon
  labelKey: string
  defaultLabel: string
  descriptionKey: string
  defaultDescription: string
  price: CatalogPrice | null
}

export function PricingSection() {
  const t = useTranslations('pricing')
  const productLabel = useTranslatedLabel('products')
  const [format, setFormat] = useState<PrintFormat>('a4')
  const { products: catalog, frameMarkup, loading } = useProductCatalog()

  const downloadPrice = priceFromCatalog(catalog, 'download', format)
  const posterPrice = priceFromCatalog(catalog, 'poster', format)
  const frameMarkupPrice = frameMarkupFromCatalog(frameMarkup, format)

  // PROJ-48: Rahmen ist Add-on auf das Poster (separates Stripe-Line-Item).
  // Auf der Landing-Page zeigen wir den Bundle-Preis (Poster + Markup) als
  // dritte Karte, damit der „mit Rahmen"-Preisanker sichtbar bleibt. Fällt
  // weg, wenn Marketing die Markup-Prices in Stripe noch nicht gepflegt hat.
  const framedBundlePrice: CatalogPrice | null =
    posterPrice && frameMarkupPrice
      ? {
          stripePriceId: '',
          currency: posterPrice.currency,
          unitAmount: posterPrice.unitAmount + frameMarkupPrice.unitAmount,
          compareAtCents:
            posterPrice.compareAtCents && posterPrice.compareAtCents > posterPrice.unitAmount
              ? posterPrice.compareAtCents +
                (frameMarkupPrice.compareAtCents ?? frameMarkupPrice.unitAmount)
              : undefined,
        }
      : null

  const cards: PricingCard[] = [
    {
      key: 'download',
      icon: Download,
      labelKey: 'downloadLabel',
      defaultLabel: 'Digitaler Download',
      descriptionKey: 'downloadDescription',
      defaultDescription: 'PNG + PDF in Druckqualität, sofort verfügbar',
      price: downloadPrice,
    },
    {
      key: 'poster',
      icon: ImageIcon,
      labelKey: 'posterLabel',
      defaultLabel: 'Poster',
      descriptionKey: 'posterDescription',
      defaultDescription: 'Hochwertiger Druck auf Fotopapier, geliefert per Post. Digitaler Download inklusive.',
      price: posterPrice,
    },
    ...(framedBundlePrice
      ? [
          {
            key: 'posterFramed',
            icon: Frame,
            labelKey: 'posterFramedLabel',
            defaultLabel: 'Gerahmtes Poster (schwarz)',
            descriptionKey: 'posterFramedDescription',
            defaultDescription:
              'Poster im hochwertigen schwarzen Aluminiumrahmen, fertig zum Aufhängen. Digitaler Download inklusive.',
            price: framedBundlePrice,
          } satisfies PricingCard,
        ]
      : []),
  ]

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
          {cards.map((card, idx) => {
            const Icon = card.icon
            const isHighlighted = idx === 1
            const { price } = card

            return (
              <div
                key={card.key}
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
                  {productLabel(card.labelKey, card.defaultLabel)}
                </h3>
                <p className={cn('text-sm mt-1 mb-6', isHighlighted ? 'text-primary-foreground/60' : 'text-muted-foreground')}>
                  {productLabel(card.descriptionKey, card.defaultDescription)}
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
