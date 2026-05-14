'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Tag, X, Loader2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useCartStore } from '@/hooks/useCartStore'
import { useVoucherStore } from '@/hooks/useVoucherStore'
import { formatPrice } from '@/lib/products'
import type {
  VoucherInvalidReason,
  VoucherValidationResult,
} from '@/lib/voucher-validation'

/**
 * PROJ-48 — Cart Voucher Input.
 *
 * Eingabefeld + Validate-Button. Bei gültigem Code: zeigt die
 * angewendete Voucher-Pill mit Discount-Betrag und X-Button zum
 * Entfernen. Bei ungültigem Code: lokalisierte Fehlermeldung.
 *
 * Die eigentliche Discount-Anzeige in der Summary läuft über CartView,
 * nicht hier — das hält die Komponente fokussiert auf Input + Status.
 */
export function VoucherInput() {
  const t = useTranslations('cart')
  const items = useCartStore((s) => s.items)
  const applied = useVoucherStore((s) => s.applied)
  const apply = useVoucherStore((s) => s.apply)
  const remove = useVoucherStore((s) => s.remove)

  const [code, setCode] = useState('')
  const [isValidating, setIsValidating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleApply = async () => {
    const trimmed = code.trim()
    if (!trimmed) return
    setIsValidating(true)
    setError(null)
    try {
      const res = await fetch('/api/voucher/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: trimmed,
          items: items.map((i) => ({
            productId: i.productId,
            withFrame: !!i.withFrame,
            format: i.format,
          })),
        }),
      })

      if (res.status === 429) {
        setError(t('voucherRateLimited'))
        return
      }

      const data = (await res.json()) as VoucherValidationResult
      if (!res.ok) {
        setError(t('voucherGenericError'))
        return
      }

      if (data.valid) {
        apply(data.voucher)
        setCode('')
      } else {
        setError(t(reasonKey(data.reason)))
      }
    } catch (err) {
      console.error('[voucher] validation failed:', err)
      setError(t('voucherGenericError'))
    } finally {
      setIsValidating(false)
    }
  }

  if (applied) {
    return (
      <div className="rounded-md bg-green-50 border border-green-200 px-3 py-2.5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Tag className="w-4 h-4 text-green-700 shrink-0" />
          <div className="min-w-0">
            <div className="text-xs font-semibold text-green-900 truncate">
              {applied.code}
            </div>
            <div className="text-xs text-green-800">
              {t('voucherDiscountApplied', { amount: formatPrice(applied.discountCents) })}
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={remove}
          aria-label={t('voucherRemoveAria')}
          className="text-green-700 hover:text-green-900 p-1 -m-1 shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-1.5">
      <div className="flex gap-2">
        <Input
          type="text"
          value={code}
          onChange={(e) => {
            setCode(e.target.value)
            if (error) setError(null)
          }}
          placeholder={t('voucherPlaceholder')}
          disabled={isValidating}
          className="flex-1 h-9 text-sm uppercase tracking-wider"
          maxLength={64}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              handleApply()
            }
          }}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleApply}
          disabled={!code.trim() || isValidating}
          className="h-9 shrink-0"
        >
          {isValidating ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            t('voucherApply')
          )}
        </Button>
      </div>
      {error && (
        <p className="text-xs text-red-700 leading-snug" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}

function reasonKey(reason: VoucherInvalidReason): string {
  switch (reason) {
    case 'not_found':
      return 'voucherErrorNotFound'
    case 'expired':
      return 'voucherErrorExpired'
    case 'max_reached':
      return 'voucherErrorMaxReached'
    case 'min_not_met':
      return 'voucherErrorMinNotMet'
    case 'not_applicable':
      return 'voucherErrorNotApplicable'
    case 'currency_mismatch':
      return 'voucherErrorCurrencyMismatch'
    default:
      return 'voucherGenericError'
  }
}
