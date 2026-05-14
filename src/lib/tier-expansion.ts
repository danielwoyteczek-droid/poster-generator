import type { PrintFormat } from './print-formats'
import {
  type ProductId,
  getStripePriceId,
  getFrameMarkupPriceId,
} from './products'

/**
 * PROJ-48 — Tier → Stripe-Line-Items.
 *
 * Eine CartItem-Tier-Wahl wird beim Checkout zu 1 oder 2 Stripe-Line-Items
 * expandiert. Reine Helper-Funktion ohne DB-/Network-Zugriff, testbar und
 * sowohl im Server-Checkout (Stripe-Session-Create) als auch im Client-UI
 * (Preisvorschau) nutzbar.
 *
 * Mapping:
 *   download              → [download_<fmt>]
 *   poster, withFrame=false → [poster_<fmt>]
 *   poster, withFrame=true  → [poster_<fmt>, frame_markup_<fmt>]
 */
export interface TierLineItem {
  stripePriceId: string
  quantity: number
}

export function tierToStripeLineItems(
  productId: ProductId,
  withFrame: boolean,
  format: PrintFormat,
): TierLineItem[] {
  const items: TierLineItem[] = []

  const basePriceId = getStripePriceId(productId, format)
  if (!basePriceId) {
    throw new Error(`No Stripe price configured for ${productId}/${format}`)
  }
  items.push({ stripePriceId: basePriceId, quantity: 1 })

  if (productId === 'poster' && withFrame) {
    const markupPriceId = getFrameMarkupPriceId(format)
    if (!markupPriceId) {
      throw new Error(`No frame-markup Stripe price configured for ${format}`)
    }
    items.push({ stripePriceId: markupPriceId, quantity: 1 })
  }

  return items
}

/**
 * Total in cents for a given tier choice, based on already-fetched catalog
 * unit amounts. Used in the cart preview where we don't go through Stripe
 * to compute the total live.
 */
export function tierTotalCents(input: {
  productId: ProductId
  withFrame: boolean
  basePriceCents: number
  frameMarkupCents?: number | null
}): number {
  const base = input.basePriceCents
  if (input.productId === 'poster' && input.withFrame && input.frameMarkupCents) {
    return base + input.frameMarkupCents
  }
  return base
}
