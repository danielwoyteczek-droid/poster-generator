'use client'

import { useLocale, useTranslations } from 'next-intl'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { formatPrice } from '@/lib/products'
import {
  SHIPPING_COUNTRIES,
  type ShippingQuote,
  type ShippingCountry,
} from '@/lib/shipping'

/**
 * PROJ-26: Lieferland und Versandkosten im Warenkorb.
 *
 * Das Land muss VOR dem Checkout feststehen. Stripe legt `shipping_options`
 * beim Anlegen der Session fest, die Adresse gibt der Kunde aber erst danach
 * ein — der Versandpreis liesse sich also nicht mehr ans Land anpassen. Wir
 * fragen das Land deshalb hier ab und übergeben genau einen Tarif.
 *
 * Nebeneffekt, der die Sache ohnehin verbessert: Der Kunde sieht den
 * Gesamtbetrag, bevor er zu Stripe springt, statt dort überrascht zu werden.
 */
export function ShippingSelector({
  country,
  onCountryChange,
  quote,
}: {
  country: ShippingCountry
  onCountryChange: (country: ShippingCountry) => void
  quote: ShippingQuote | null
}) {
  const t = useTranslations('shipping')
  const locale = useLocale()

  // Ländernamen aus der Plattform statt aus eigenen Übersetzungstabellen —
  // sie sind vollständig, korrekt und in jeder Locale vorhanden.
  const names = new Intl.DisplayNames([locale], { type: 'region' })

  // Reiner Download-Warenkorb: keine Lieferung, keine Auswahl.
  if (!quote || quote.freeReason === 'digital_only') return null

  return (
    <div className="space-y-2 pt-3 border-t border-border">
      <Label
        htmlFor="shipping-country"
        className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70"
      >
        {t('countryLabel')}
      </Label>

      <Select value={country} onValueChange={(v) => onCountryChange(v as ShippingCountry)}>
        <SelectTrigger id="shipping-country">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {SHIPPING_COUNTRIES.map((code) => (
            <SelectItem key={code} value={code}>
              {names.of(code) ?? code}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">
          {quote.method ? t(`method.${quote.method}`) : t('shippingLabel')}
        </span>
        <span className="font-medium tabular-nums">
          {quote.cents === 0 ? t('free') : formatPrice(quote.cents)}
        </span>
      </div>

      {quote.freeReason === 'threshold' && (
        <p className="text-xs text-emerald-700">{t('freeReached')}</p>
      )}

      {quote.freeReason === null &&
        quote.remainingToFreeCents !== null &&
        quote.remainingToFreeCents > 0 && (
          <p className="text-xs text-muted-foreground">
            {t('remainingToFree', { amount: formatPrice(quote.remainingToFreeCents) })}
          </p>
        )}

      {quote.zone === 'eu' && (
        <p className="text-xs text-muted-foreground">{t('euFlatNote')}</p>
      )}
    </div>
  )
}
