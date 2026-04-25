'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { X, ShoppingCart, CreditCard, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useCartStore } from '@/hooks/useCartStore'
import { trackBeginCheckout } from '@/lib/analytics'
import { PRODUCTS, formatPrice } from '@/lib/products'
import { PRINT_FORMAT_OPTIONS } from '@/lib/print-formats'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'

function productLabel(productId: string) {
  return PRODUCTS.find((p) => p.id === productId)?.label ?? productId
}

function formatLabel(format: string) {
  return PRINT_FORMAT_OPTIONS.find((f) => f.id === format)?.label ?? format.toUpperCase()
}

export function CartView() {
  const t = useTranslations('cart')
  const [hydrated, setHydrated] = useState(false)
  const [isCheckingOut, setIsCheckingOut] = useState(false)
  const [digitalConsent, setDigitalConsent] = useState(false)
  const items = useCartStore((s) => s.items)
  const removeItem = useCartStore((s) => s.removeItem)
  const totalCents = useCartStore((s) => s.totalCents())
  const hasDigital = items.some((i) => i.productId === 'download')

  useEffect(() => { setHydrated(true) }, [])

  const handleCheckout = async () => {
    if (hasDigital && !digitalConsent) {
      toast.error(t('digitalConsentRequired'))
      return
    }
    setIsCheckingOut(true)
    trackBeginCheckout(items.map((i) => ({
      id: i.id,
      title: i.title,
      productId: i.productId,
      format: i.format,
      priceCents: i.priceCents,
      posterType: i.posterType,
    })))
    try {
      const payload = {
        items: items.map(({ productId, format, posterType, title, snapshot, projectId }) => ({
          productId, format, posterType, title, snapshot, projectId,
        })),
        digitalConsent: hasDigital ? digitalConsent : undefined,
      }
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok || !data.url) {
        throw new Error(data.error || t('checkoutFailed'))
      }
      window.location.href = data.url
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('checkoutFailed'))
      setIsCheckingOut(false)
    }
  }

  if (!hydrated) {
    return <div className="text-sm text-muted-foreground/70">{t('loading')}</div>
  }

  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-white px-6 py-16 text-center">
        <ShoppingCart className="w-10 h-10 mx-auto text-muted-foreground/40 mb-4" />
        <p className="text-muted-foreground mb-6">{t('empty')}</p>
        <div className="flex gap-3 justify-center">
          <Button asChild variant="outline">
            <Link href="/map">{t('createCityPoster')}</Link>
          </Button>
          <Button asChild>
            <Link href="/star-map">{t('createStarPoster')}</Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.id} className="flex gap-4 p-4 rounded-xl bg-white border border-border">
            <div className="w-24 h-32 shrink-0 rounded-md overflow-hidden bg-muted flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.previewDataUrl}
                alt={item.title}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex-1 min-w-0 flex flex-col">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground/70 uppercase tracking-wider">
                    {item.posterType === 'star-map' ? t('starPoster') : t('cityPoster')}
                  </p>
                  <h3 className="text-sm font-semibold text-foreground truncate mt-0.5">{item.title}</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    {productLabel(item.productId)} · {formatLabel(item.format)}
                  </p>
                  {item.productId !== 'download' && (
                    <p className="text-xs text-green-700 mt-1.5 font-medium">
                      {t('downloadIncluded')}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => removeItem(item.id)}
                  className="text-muted-foreground/70 hover:text-foreground/70 p-1 -m-1"
                  aria-label={t('removeAria')}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="mt-auto text-sm font-semibold text-foreground">
                {formatPrice(item.priceCents)}
              </div>
            </div>
          </div>
        ))}
      </div>

      <aside className="lg:sticky lg:top-20 h-fit rounded-xl bg-white border border-border p-5 space-y-4">
        <h2 className="text-sm font-semibold text-foreground">{t('summaryTitle')}</h2>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between text-muted-foreground">
            <span>{t('items')}</span>
            <span>{items.length}</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>{t('subtotal')}</span>
            <span>{formatPrice(totalCents)}</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>{t('shipping')}</span>
            <span>{t('shippingValue')}</span>
          </div>
          <div className="border-t border-border pt-2 flex justify-between text-base font-semibold text-foreground">
            <span>{t('total')}</span>
            <span>{formatPrice(totalCents)}</span>
          </div>
        </div>
        {hasDigital && (
          <label className="flex items-start gap-2.5 p-3 rounded-md bg-amber-50 border border-amber-200 cursor-pointer">
            <Checkbox
              id="digital-consent"
              checked={digitalConsent}
              onCheckedChange={(v) => setDigitalConsent(v === true)}
              className="mt-0.5"
            />
            <span className="text-xs text-amber-900 leading-relaxed">
              {t('digitalConsent')}
            </span>
          </label>
        )}

        <Button
          className="w-full"
          size="lg"
          onClick={handleCheckout}
          disabled={isCheckingOut || (hasDigital && !digitalConsent)}
        >
          {isCheckingOut ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <CreditCard className="w-4 h-4 mr-2" />
          )}
          {isCheckingOut ? t('checkoutRedirecting') : t('checkoutCta')}
        </Button>
        <p className="text-xs text-muted-foreground/70 leading-relaxed">
          {t('secureNote')}
        </p>
      </aside>
    </div>
  )
}
