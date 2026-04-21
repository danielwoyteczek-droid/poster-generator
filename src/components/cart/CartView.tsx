'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
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
      toast.error('Bitte stimme der sofortigen Ausführung zu, damit der Download bereitgestellt werden kann.')
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
        throw new Error(data.error || 'Checkout fehlgeschlagen')
      }
      window.location.href = data.url
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Checkout fehlgeschlagen')
      setIsCheckingOut(false)
    }
  }

  if (!hydrated) {
    return <div className="text-sm text-gray-400">Lädt…</div>
  }

  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 bg-white px-6 py-16 text-center">
        <ShoppingCart className="w-10 h-10 mx-auto text-gray-300 mb-4" />
        <p className="text-gray-600 mb-6">Dein Warenkorb ist leer.</p>
        <div className="flex gap-3 justify-center">
          <Button asChild variant="outline">
            <Link href="/map">Stadtposter erstellen</Link>
          </Button>
          <Button asChild>
            <Link href="/star-map">Sternenposter erstellen</Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.id} className="flex gap-4 p-4 rounded-xl bg-white border border-gray-200">
            <div className="w-24 h-32 shrink-0 rounded-md overflow-hidden bg-gray-100 flex items-center justify-center">
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
                  <p className="text-xs text-gray-400 uppercase tracking-wider">
                    {item.posterType === 'star-map' ? 'Sternenposter' : 'Stadtposter'}
                  </p>
                  <h3 className="text-sm font-semibold text-gray-900 truncate mt-0.5">{item.title}</h3>
                  <p className="text-xs text-gray-500 mt-1">
                    {productLabel(item.productId)} · {formatLabel(item.format)}
                  </p>
                  {item.productId !== 'download' && (
                    <p className="text-xs text-green-700 mt-1.5 font-medium">
                      + Digitaler Download (PNG & PDF) inklusive
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => removeItem(item.id)}
                  className="text-gray-400 hover:text-gray-700 p-1 -m-1"
                  aria-label="Entfernen"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="mt-auto text-sm font-semibold text-gray-900">
                {formatPrice(item.priceCents)}
              </div>
            </div>
          </div>
        ))}
      </div>

      <aside className="lg:sticky lg:top-20 h-fit rounded-xl bg-white border border-gray-200 p-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-900">Zusammenfassung</h2>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between text-gray-600">
            <span>Artikel</span>
            <span>{items.length}</span>
          </div>
          <div className="flex justify-between text-gray-600">
            <span>Zwischensumme</span>
            <span>{formatPrice(totalCents)}</span>
          </div>
          <div className="flex justify-between text-gray-600">
            <span>Versand</span>
            <span>wird im Checkout berechnet</span>
          </div>
          <div className="border-t border-gray-200 pt-2 flex justify-between text-base font-semibold text-gray-900">
            <span>Gesamt</span>
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
              Ich stimme ausdrücklich zu, dass mit der Ausführung des Vertrags vor Ablauf der
              Widerrufsfrist begonnen wird. Ich bestätige meine Kenntnis davon, dass ich durch
              meine Zustimmung mit Beginn der Ausführung des Vertrags ein etwaiges Widerrufsrecht
              verliere.
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
          {isCheckingOut ? 'Weiterleitung…' : 'Zur Kasse'}
        </Button>
        <p className="text-xs text-gray-400 leading-relaxed">
          Sichere Zahlung über Stripe. Keine Registrierung nötig.
        </p>
      </aside>
    </div>
  )
}
