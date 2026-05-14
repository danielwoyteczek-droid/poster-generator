import type { PrintFormat } from './print-formats'

/**
 * PROJ-48 — Tier-Pricing-Refactor
 *
 * Top-Level-Produkte sind nur noch Download oder Poster. Der Rahmen ist
 * Sub-Option des Posters (CartItem.withFrame=true) und wird beim Checkout
 * als zusätzliches Stripe-Line-Item expandiert. Siehe tier-expansion.ts.
 *
 * Legacy: Bestandsorders enthalten `productId='frame'` und werden im
 * View-Layer auf "Gerahmtes Poster" gemappt; das ist bewusst nicht
 * Bestandteil des aktuellen ProductId-Typs, da neue Inserts diesen
 * Wert nicht mehr erzeugen.
 */
export type ProductId = 'download' | 'poster'

export interface Product {
  id: ProductId
  label: string
  description: string
  /**
   * Stripe Price ID per print format. For `download` we reuse the same ID
   * across all formats, because a digital download is not size-dependent.
   */
  stripePriceIds: Partial<Record<PrintFormat, string>>
}

export const PRODUCTS: Product[] = [
  {
    id: 'download',
    label: 'Digitaler Download',
    description: 'PNG + PDF in Druckqualität, sofort verfügbar',
    stripePriceIds: {
      a4: 'price_1TVqmH36Wy7c8yXh6FITJb0R',
      a3: 'price_1TVqmH36Wy7c8yXh6FITJb0R',
      a2: 'price_1TVqmH36Wy7c8yXh6FITJb0R',
    },
  },
  {
    id: 'poster',
    label: 'Poster',
    description: 'Hochwertiger Druck auf Fotopapier, geliefert per Post. Digitaler Download inklusive.',
    stripePriceIds: {
      a4: 'price_1TOhUz36Wy7c8yXhJ7FkDl0y',
      a3: 'price_1TOdjF36Wy7c8yXhlt3gYZTR',
      a2: 'price_1TVqvf36Wy7c8yXhYZlw9JmR',
    },
  },
]

/**
 * Stripe Price IDs für den Rahmen-Aufpreis (Frame-Markup-Add-on).
 *
 * Diese Prices repräsentieren NUR den Rahmen-Anteil — nicht das ganze
 * Bundle. Beim Checkout wird `frame_markup_<fmt>` zusätzlich zu
 * `poster_<fmt>` als separates Line-Item an Stripe übergeben, wenn der
 * Customer `Mit schwarzem Rahmen` aktiviert hat.
 *
 * → Marketing: bitte 3 Prices im Stripe-Dashboard anlegen und die IDs
 * unten ersetzen. Solange die Werte leer bleiben, blendet das Frontend
 * die Rahmen-Checkbox automatisch aus (stripe-catalog skippt fehlende
 * IDs, Picker prüft auf vorhandene Markup-Price).
 */
export const FRAME_MARKUP_PRICE_IDS: Partial<Record<PrintFormat, string>> = {
  a4: 'price_1TWwYu36Wy7c8yXhWrenqUC5', // €10
  a3: 'price_1TWwYu36Wy7c8yXhBTXSZmyz', // €15
  a2: 'price_1TWwYu36Wy7c8yXhhXKHNo79', // €20
}

export function getStripePriceId(productId: ProductId, format: PrintFormat): string | null {
  const product = PRODUCTS.find((p) => p.id === productId)
  return product?.stripePriceIds[format] ?? null
}

export function getFrameMarkupPriceId(format: PrintFormat): string | null {
  return FRAME_MARKUP_PRICE_IDS[format] || null
}

export function formatPrice(cents: number) {
  return (cents / 100).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })
}

/**
 * Resolve the i18n key under the `products` namespace for a given cart/order
 * item. Handles both the new tier shape (productId='poster' + withFrame) and
 * legacy orders where productId could be 'frame'.
 *
 * Returns keys like `downloadLabel`, `posterLabel`, `posterFramedLabel`,
 * `frameLabel` (legacy). Callers use `useTranslatedLabel('products')` or the
 * server-side PRODUCT_LABELS table.
 */
export function getItemLabelKey(item: {
  productId: 'download' | 'poster' | 'frame'
  withFrame?: boolean
}): string {
  if (item.productId === 'frame') return 'frameLabel'
  if (item.productId === 'poster' && item.withFrame) return 'posterFramedLabel'
  return `${item.productId}Label`
}

/**
 * Static fallback labels (German) for the same logic. Used when no i18n
 * runtime is available — server-side email rendering relies on this.
 */
export function getItemFallbackLabel(item: {
  productId: 'download' | 'poster' | 'frame'
  withFrame?: boolean
}): string {
  if (item.productId === 'frame') return 'Gerahmtes Poster (schwarz)'
  if (item.productId === 'poster' && item.withFrame) return 'Gerahmtes Poster (schwarz)'
  if (item.productId === 'poster') return 'Poster'
  if (item.productId === 'download') return 'Digitaler Download'
  return item.productId
}
