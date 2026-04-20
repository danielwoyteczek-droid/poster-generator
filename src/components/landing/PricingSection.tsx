'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Download, ImageIcon, Frame, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PRODUCTS, formatPrice } from '@/lib/products'
import { cn } from '@/lib/utils'

const FORMATS = [
  { id: 'a4', label: 'A4' },
  { id: 'a3', label: 'A3' },
  { id: 'a2', label: 'A2' },
]

const PRODUCT_ICONS = {
  download: Download,
  poster: ImageIcon,
  frame: Frame,
}

export function PricingSection() {
  const [format, setFormat] = useState('a4')

  return (
    <section id="pricing" className="py-24 bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">
            Einfache Preise
          </h2>
          <p className="mt-4 text-gray-500 text-lg max-w-xl mx-auto">
            Wähle dein Format und das passende Produkt.
          </p>

          {/* Format toggle */}
          <div className="mt-8 inline-flex rounded-lg border border-gray-200 p-1 bg-gray-50">
            {FORMATS.map((f) => (
              <button
                key={f.id}
                onClick={() => setFormat(f.id)}
                className={cn(
                  'px-5 py-2 text-sm font-medium rounded-md transition-colors',
                  format === f.id
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700',
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

            return (
              <div
                key={product.id}
                className={cn(
                  'rounded-2xl border p-6 flex flex-col',
                  isHighlighted
                    ? 'border-gray-900 bg-gray-900 text-white shadow-xl'
                    : 'border-gray-200 bg-white',
                )}
              >
                <div className={cn(
                  'w-10 h-10 rounded-lg flex items-center justify-center mb-4',
                  isHighlighted ? 'bg-white/10' : 'bg-gray-100',
                )}>
                  <Icon className={cn('w-5 h-5', isHighlighted ? 'text-white' : 'text-gray-900')} />
                </div>

                <h3 className={cn('font-semibold text-lg', isHighlighted ? 'text-white' : 'text-gray-900')}>
                  {product.label}
                </h3>
                <p className={cn('text-sm mt-1 mb-6', isHighlighted ? 'text-white/60' : 'text-gray-500')}>
                  {product.description}
                </p>

                <div className="mt-auto">
                  <div className={cn('text-3xl font-bold mb-6', isHighlighted ? 'text-white' : 'text-gray-900')}>
                    {formatPrice(product.prices[format])}
                  </div>
                  <Button
                    asChild
                    className={cn(
                      'w-full',
                      isHighlighted
                        ? 'bg-white text-gray-900 hover:bg-gray-100'
                        : '',
                    )}
                    variant={isHighlighted ? 'secondary' : 'outline'}
                  >
                    <Link href="/map">
                      Jetzt erstellen
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
