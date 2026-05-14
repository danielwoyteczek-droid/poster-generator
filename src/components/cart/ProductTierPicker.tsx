'use client'

import { useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { useTranslatedLabel } from '@/lib/i18n-catalog'
import {
  Download as DownloadIcon,
  Image as ImageIcon,
  Loader2,
  ShoppingCart,
} from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { formatPrice, type ProductId } from '@/lib/products'
import { tierTotalCents } from '@/lib/tier-expansion'
import type { PrintFormat } from '@/lib/print-formats'
import {
  frameMarkupFromCatalog,
  priceFromCatalog,
  useProductCatalog,
} from '@/hooks/useProductCatalog'
import { DiscountBadge } from '@/components/ui/discount-badge'

export interface TierSelection {
  productId: ProductId
  withFrame: boolean
  /** Total in cents — base + frame markup if active. Source of truth for the cart entry. */
  priceCents: number
  /** Stripe Price ID of the base product (download or poster). */
  basePriceId: string
  /** Stripe Price ID of the frame markup, if withFrame is true. */
  frameMarkupPriceId: string | null
}

interface Props {
  printFormat: PrintFormat
  isAdding: boolean
  onAddToCart: (selection: TierSelection) => void
}

const TIER_ORDER: ProductId[] = ['download', 'poster']

const TIER_ICONS: Record<ProductId, React.ReactNode> = {
  download: <DownloadIcon className="w-5 h-5" />,
  poster: <ImageIcon className="w-5 h-5" />,
}

export function ProductTierPicker({ printFormat, isAdding, onAddToCart }: Props) {
  const t = useTranslations('editor')
  const productLabel = useTranslatedLabel('products')
  // Default: poster preselected — physical product is the anchor, higher conversion.
  const [tier, setTier] = useState<ProductId>('poster')
  const [withFrame, setWithFrame] = useState(false)
  const { products: catalog, frameMarkup, loading: catalogLoading } = useProductCatalog()

  const basePrice = priceFromCatalog(catalog, tier, printFormat)
  const frameMarkupPrice = frameMarkupFromCatalog(frameMarkup, printFormat)

  const total = useMemo(() => {
    if (!basePrice) return null
    return tierTotalCents({
      productId: tier,
      withFrame: tier === 'poster' && withFrame,
      basePriceCents: basePrice.unitAmount,
      frameMarkupCents: frameMarkupPrice?.unitAmount ?? null,
    })
  }, [basePrice, tier, withFrame, frameMarkupPrice])

  // PROJ-48: hide frame addon entirely if Stripe markup price is not yet
  // configured. This lets us ship the tier UI before Marketing creates
  // the frame_markup_<fmt> prices in Stripe without breaking the picker.
  const frameAddonAvailable = tier === 'poster' && !!frameMarkupPrice

  // When tier switches away from poster, reset the frame flag so the next
  // poster click doesn't carry a stale "with frame" state.
  const handleSelectTier = (next: ProductId) => {
    setTier(next)
    if (next !== 'poster') setWithFrame(false)
  }

  const handleConfirm = () => {
    if (!basePrice || total == null) return
    const effectiveFrame = tier === 'poster' && withFrame && !!frameMarkupPrice
    onAddToCart({
      productId: tier,
      withFrame: effectiveFrame,
      priceCents: total,
      basePriceId: basePrice.stripePriceId,
      frameMarkupPriceId: effectiveFrame ? frameMarkupPrice.stripePriceId : null,
    })
  }

  return (
    <div className="space-y-2">
      <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
        {t('exportProductLabel')}
      </Label>

      <div className="space-y-2">
        {TIER_ORDER.map((id) => {
          const price = priceFromCatalog(catalog, id, printFormat)
          const isActive = tier === id
          return (
            <div key={id}>
              <button
                type="button"
                onClick={() => handleSelectTier(id)}
                disabled={!price}
                className={cn(
                  'w-full text-left rounded-lg border-2 px-3 py-2.5 transition-colors',
                  isActive
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-muted-foreground bg-background',
                  !price && 'opacity-50 cursor-not-allowed',
                )}
              >
                <div className="flex items-start gap-2.5">
                  <span
                    className={cn(
                      'mt-0.5 shrink-0',
                      isActive ? 'text-foreground' : 'text-muted-foreground/70',
                    )}
                  >
                    {TIER_ICONS[id]}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium text-foreground">
                        {id === 'poster'
                          ? t('exportTierPosterLabel')
                          : productLabel(`${id}Label`, id)}
                      </span>
                      <span className="flex items-center gap-1.5 shrink-0">
                        {price && (
                          <DiscountBadge
                            unitAmount={price.unitAmount}
                            compareAtCents={price.compareAtCents}
                          />
                        )}
                        {price?.compareAtCents &&
                          price.compareAtCents > price.unitAmount && (
                            <span className="text-xs text-muted-foreground/70 line-through">
                              {formatPrice(price.compareAtCents)}
                            </span>
                          )}
                        <span
                          className={cn(
                            'text-sm font-semibold',
                            isActive ? 'text-foreground' : 'text-muted-foreground',
                          )}
                        >
                          {price
                            ? formatPrice(price.unitAmount)
                            : catalogLoading
                            ? '…'
                            : '–'}
                        </span>
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground/70 mt-0.5 leading-snug">
                      {id === 'poster'
                        ? t('exportTierPosterDescription')
                        : productLabel(`${id}Description`, '')}
                    </p>
                  </div>
                </div>
              </button>

              {id === 'poster' && isActive && frameAddonAvailable && (
                <label
                  htmlFor="frame-addon"
                  className={cn(
                    'mt-2 ml-6 flex items-start gap-2.5 rounded-md border border-border bg-background',
                    'px-3 py-2.5 cursor-pointer hover:border-muted-foreground transition-colors',
                  )}
                >
                  <Checkbox
                    id="frame-addon"
                    checked={withFrame}
                    onCheckedChange={(v) => setWithFrame(v === true)}
                    className="mt-0.5"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium text-foreground">
                        {t('exportTierFrameAddonLabel')}
                      </span>
                      <span className="text-sm font-semibold text-foreground shrink-0">
                        +{formatPrice(frameMarkupPrice.unitAmount)}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground/70 mt-0.5 leading-snug">
                      {t('exportTierFrameAddonDescription')}
                    </p>
                  </div>
                </label>
              )}
            </div>
          )
        })}
      </div>

      <button
        type="button"
        disabled={!basePrice || total == null || isAdding}
        onClick={handleConfirm}
        className="w-full h-10 flex items-center justify-center gap-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed mt-1"
      >
        {isAdding ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <ShoppingCart className="w-4 h-4" />
        )}
        {isAdding
          ? t('exportAddingToCart')
          : total != null
          ? t('exportInCart', { price: formatPrice(total) })
          : t('exportSelectProduct')}
      </button>

      <p className="text-xs text-muted-foreground/70 leading-relaxed">
        {t('exportSecureNote')}
      </p>
    </div>
  )
}
