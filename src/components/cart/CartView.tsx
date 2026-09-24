'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useLocale, useTranslations } from 'next-intl'
import { useTranslatedLabel } from '@/lib/i18n-catalog'
import { X, ShoppingCart, CreditCard, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useCartStore } from '@/hooks/useCartStore'
import { useVoucherStore } from '@/hooks/useVoucherStore'
import { useProductCatalog, frameMarkupFromCatalog } from '@/hooks/useProductCatalog'
import { trackBeginCheckout } from '@/lib/analytics'
import { readAttributionCookie } from '@/lib/attribution'
import { formatPrice, getItemFallbackLabel, getItemLabelKey, displayFormatLabel } from '@/lib/products'
import { PRINT_FORMAT_OPTIONS, type PrintFormat } from '@/lib/print-formats'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { VoucherInput } from './VoucherInput'
import { DtfApprovalDialog, readDtfSnapshot } from './DtfApprovalDialog'
import { DtfSheetPreview } from './DtfSheetPreview'
import { ShippingSelector } from './ShippingSelector'
import { quoteShipping, SHIPPING_COUNTRIES, type ShippingCountry } from '@/lib/shipping'

export function CartView() {
  const t = useTranslations('cart')
  const tShipping = useTranslations('shipping')
  const locale = useLocale()
  const productI18n = useTranslatedLabel('products')
  const productLabel = (item: { productId: string; withFrame?: boolean }) =>
    productI18n(
      getItemLabelKey(item as { productId: 'download' | 'poster' | 'frame'; withFrame?: boolean }),
      getItemFallbackLabel(item as { productId: 'download' | 'poster' | 'frame'; withFrame?: boolean }),
    )
  const [hydrated, setHydrated] = useState(false)
  const [isCheckingOut, setIsCheckingOut] = useState(false)
  const [digitalConsent, setDigitalConsent] = useState(false)
  const items = useCartStore((s) => s.items)
  const removeItem = useCartStore((s) => s.removeItem)
  const subtotalCents = useCartStore((s) => s.totalCents())
  const voucher = useVoucherStore((s) => s.applied)
  const applyVoucher = useVoucherStore((s) => s.apply)
  const removeVoucher = useVoucherStore((s) => s.remove)
  const { frameMarkup } = useProductCatalog()
  const hasDigital = items.some((i) => i.productId === 'download')
  // PROJ-26: Nur physische Positionen brauchen ein Lieferland. Ein rein
  // digitaler Warenkorb soll nicht daran haengen.
  const hasPhysical = items.some((i) => i.productId !== 'download')
  const hasDtf = items.some((i) => i.productId === 'dtf')
  const [approvalOpen, setApprovalOpen] = useState(false)

  // PROJ-48: discount-cents is a preview computed against the current cart.
  // If the voucher no longer applies (subtotal dropped below min_amount, or
  // the only frame-line was removed), the cap keeps the total non-negative.
  // The Stripe Session is authoritative at checkout — webhook overwrites
  // discount_cents on the order from total_details.amount_discount.
  const discountCents = voucher
    ? Math.min(voucher.discountCents, subtotalCents)
    : 0
  const discountedCents = Math.max(0, subtotalCents - discountCents)

  /**
   * PROJ-26: Lieferland. Vorbelegt aus der Locale — wer die Seite auf
   * Französisch liest, liefert vermutlich nach Frankreich. Fällt auf
   * Deutschland zurück, wenn die Locale kein beliefertes Land ergibt.
   */
  const [country, setCountry] = useState<ShippingCountry | null>(() => {
    const guess = locale.toUpperCase()
    // Ergibt die Locale kein beliefertes Land -- 'en' tut das nicht --, wird
    // NICHT geraten. Ein stilles 'DE' berechnete deutschen Versand und
    // liesse Stripe danach nur eine deutsche Adresse zu; wer aus Irland
    // bestellt, kaeme dort nicht weiter. Lieber einmal fragen.
    return (SHIPPING_COUNTRIES as readonly string[]).includes(guess)
      ? (guess as ShippingCountry)
      : null
  })

  // Der Freibetrag prüft gegen den Wert VOR Rabatt. Sonst würde ein
  // Gutschein zusätzlich den Versand finanzieren.
  const shippingQuote = country
    ? quoteShipping(
        items.map((i) => ({
          productId: i.productId,
          format: i.format,
          withFrame: i.withFrame,
          quantity: i.quantity,
        })),
        country,
        subtotalCents,
      )
    : null

  const shippingCents = shippingQuote?.cents ?? 0
  const totalCents = discountedCents + shippingCents

  useEffect(() => { setHydrated(true) }, [])

  // PROJ-48 (QA Bug #2): the voucher now persists in localStorage (visible
  // across tabs + after reload). To avoid showing a stale code from an
  // earlier visit, re-validate it once when the cart mounts. If it no
  // longer applies to the current cart, drop it silently. Runs exactly
  // once — not on every cart edit — to stay within the validate rate-limit.
  const revalidatedRef = useRef(false)
  useEffect(() => {
    if (!hydrated || revalidatedRef.current) return
    if (!voucher || items.length === 0) return
    revalidatedRef.current = true
    void (async () => {
      try {
        const res = await fetch('/api/voucher/validate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            code: voucher.code,
            items: items.map((i) => ({
              productId: i.productId,
              withFrame: !!i.withFrame,
              format: i.format,
            })),
          }),
        })
        // 429 / network error → keep the voucher, don't penalise the customer.
        if (!res.ok) return
        const data = await res.json()
        if (data.valid) {
          applyVoucher(data.voucher) // refresh discountCents against current cart
        } else {
          removeVoucher()
        }
      } catch {
        // network error — leave the voucher as-is
      }
    })()
  }, [hydrated, voucher, items, applyVoucher, removeVoucher])

  /**
   * PROJ-55: Enthält der Warenkorb DTF-Positionen, schiebt sich vor den
   * Checkout ein Freigabe-Dialog. Der Bestellablauf selbst bleibt
   * unverändert — nach dem Bestätigen läuft exakt derselbe Aufruf wie
   * bisher, nur um zwei Zeitstempel ergänzt. Ohne DTF im Warenkorb
   * erscheint der Dialog nicht und der Weg ist identisch zu vorher.
   */
  const handleCheckoutClick = () => {
    if (hasDigital && !digitalConsent) {
      toast.error(t('digitalConsentRequired'))
      return
    }
    if (hasDtf) {
      setApprovalOpen(true)
      return
    }
    void handleCheckout()
  }

  const handleCheckout = async (approval?: {
    printApprovedAt: string
    rightsConfirmedAt: string
  }) => {
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
      quantity: i.quantity,
      posterType: i.posterType,
    })))
    try {
      const payload = {
        items: items.map(({ productId, withFrame, format, posterType, quantity, title, snapshot, projectId }) => ({
          productId, withFrame: !!withFrame, format, posterType, quantity, title, snapshot, projectId,
        })),
        digitalConsent: hasDigital ? digitalConsent : undefined,
        // PROJ-55: nur gesetzt, wenn der Freigabe-Dialog durchlaufen wurde.
        dtfApproval: approval,
        voucher: voucher
          ? { code: voucher.code, promotionCodeId: voucher.promotionCodeId }
          : undefined,
        attribution: readAttributionCookie() ?? undefined,
        // PROJ-26: Das Lieferland muss VOR dem Anlegen der Session
        // feststehen — Stripe kann den Versandpreis später nicht mehr an
        // die eingegebene Adresse anpassen.
        shippingCountry: country,
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
        {items.map((item) => {
          // PROJ-48: bei Frame-Tier den Aufpreis als eigene Sub-Zeile anzeigen,
          // damit der Customer sieht, was er für den Rahmen extra zahlt — und
          // ein „Gratis Rahmen"-Coupon sichtbar zuordenbar ist. Markup ziehen
          // wir aus dem Catalog; der CartItem.priceCents bleibt unverändert.
          const frameMarkupPrice =
            item.productId === 'poster' && item.withFrame
              ? frameMarkupFromCatalog(frameMarkup, item.format as PrintFormat)
              : null
          const baseCents = frameMarkupPrice
            ? Math.max(0, item.priceCents - frameMarkupPrice.unitAmount)
            : item.priceCents

          // PROJ-55: DTF-Positionen tragen keine fertige Bilddatei, sondern
          // die Bogenbeschreibung. Sie wird hier aus denselben Daten
          // gezeichnet wie im Editor und im Freigabe-Dialog.
          const dtf = readDtfSnapshot(item)

          return (
          <div key={item.id} className="flex gap-4 p-4 rounded-xl bg-white border border-border">
            {dtf ? (
              <DtfSheetPreview format={dtf.format} elements={dtf.elements} widthPx={96} />
            ) : (
              <div className="w-24 h-32 shrink-0 rounded-md overflow-hidden bg-muted flex items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.previewDataUrl}
                  alt={item.title}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <div className="flex-1 min-w-0 flex flex-col">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground/70 uppercase tracking-wider">
                    {/* Foto-Poster liefen hier bisher unter „Stadtposter" —
                        der Zweig kannte nur Stern und Sonst. Mit DTF als
                        drittem Fall fiel es auf, also gleich mitkorrigiert. */}
                    {item.posterType === 'star-map'
                      ? t('starPoster')
                      : item.posterType === 'photo'
                        ? t('photoPoster')
                        : item.posterType === 'dtf'
                          ? t('dtfPrint')
                          : t('cityPoster')}
                  </p>
                  <h3 className="text-sm font-semibold text-foreground truncate mt-0.5">{item.title}</h3>
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

              <div className="mt-2 space-y-1 text-xs">
                <div className="flex justify-between gap-2 text-muted-foreground">
                  <span className="truncate">
                    {productI18n(
                      `${item.productId}Label`,
                      getItemFallbackLabel({ productId: item.productId, withFrame: false }),
                    )} · {displayFormatLabel(item.format)}
                    {/* Auflage nur zeigen, wenn sie etwas aussagt. Bei
                        Postern ist sie immer 1 und wäre nur Rauschen. */}
                    {item.quantity > 1 && ` · ${item.quantity}×`}
                  </span>
                  <span className="text-foreground/80 font-medium shrink-0">
                    {formatPrice(baseCents)}
                  </span>
                </div>
                {dtf && item.quantity > 1 && (
                  <div className="flex justify-between gap-2 text-muted-foreground/70">
                    <span className="truncate">
                      {t('dtfUnitPrice', {
                        price: formatPrice(Math.round(item.priceCents / item.quantity)),
                      })}
                    </span>
                  </div>
                )}
                {dtf && (
                  <div className="text-muted-foreground/70">
                    {t('dtfMotifCount', { count: dtf.elements.length })}
                  </div>
                )}
                {frameMarkupPrice && (
                  <div className="flex justify-between gap-2 text-muted-foreground">
                    <span className="truncate">
                      ↳ {t('frameAddonLineLabel')}
                    </span>
                    <span className="text-foreground/80 font-medium shrink-0">
                      +{formatPrice(frameMarkupPrice.unitAmount)}
                    </span>
                  </div>
                )}
                {item.productId !== 'download' && (
                  <p className="text-green-700 font-medium pt-0.5">
                    {t('downloadIncluded')}
                  </p>
                )}
              </div>

              <div className="mt-auto pt-2 flex justify-between items-baseline border-t border-border/60">
                <span className="text-xs text-muted-foreground uppercase tracking-wider">
                  {productLabel(item)}
                </span>
                <span className="text-sm font-semibold text-foreground">
                  {formatPrice(item.priceCents)}
                </span>
              </div>
            </div>
          </div>
          )
        })}
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
            <span>{formatPrice(subtotalCents)}</span>
          </div>
          {voucher && discountCents > 0 && (
            <div className="flex justify-between text-green-700 font-medium">
              <span className="truncate">{t('discountLabel', { code: voucher.code })}</span>
              <span>−{formatPrice(discountCents)}</span>
            </div>
          )}
          {/* PROJ-26: Bis hierher stand hier ein fester Text („kostenlos").
              Jetzt der berechnete Betrag; bei reinen Downloads entfällt die
              Zeile ganz. */}
          {shippingQuote && shippingQuote.freeReason !== 'digital_only' && (
            <div className="flex justify-between text-muted-foreground">
              <span>{t('shipping')}</span>
              <span>
                {shippingCents === 0 ? tShipping('free') : formatPrice(shippingCents)}
              </span>
            </div>
          )}
          <div className="border-t border-border pt-2 flex justify-between text-base font-semibold text-foreground">
            <span>{t('total')}</span>
            <span>{formatPrice(totalCents)}</span>
          </div>

          <ShippingSelector
            country={country}
            onCountryChange={setCountry}
            quote={shippingQuote}
          />
        </div>

        <VoucherInput />

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
          onClick={handleCheckoutClick}
          disabled={isCheckingOut || (hasDigital && !digitalConsent) || (hasPhysical && !country)}
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

      {/* PROJ-55: Erscheint nur bei DTF-Positionen. Bestätigt der Kunde,
          läuft danach derselbe Checkout wie sonst — nur mit den beiden
          Zeitstempeln im Aufruf. */}
      {hasDtf && (
        <DtfApprovalDialog
          open={approvalOpen}
          onOpenChange={setApprovalOpen}
          items={items}
          isSubmitting={isCheckingOut}
          onConfirm={(approval) => {
            setApprovalOpen(false)
            void handleCheckout(approval)
          }}
        />
      )}
    </div>
  )
}
