import type { PrintFormat } from './print-formats'

export type ProductId = 'download' | 'poster' | 'frame'

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
      a4: 'price_1TOhVm36Wy7c8yXhQaZ09Je2',
      a3: 'price_1TOhVm36Wy7c8yXhQaZ09Je2',
    },
  },
  {
    id: 'poster',
    label: 'Poster',
    description: 'Hochwertiger Druck auf Fotopapier, geliefert per Post. Digitaler Download inklusive.',
    stripePriceIds: {
      a4: 'price_1TOhUz36Wy7c8yXhJ7FkDl0y',
      a3: 'price_1TOhSU36Wy7c8yXhRbpJiZaU',
    },
  },
  {
    id: 'frame',
    label: 'Gerahmtes Poster (schwarz)',
    description: 'Poster im schwarzen Holzrahmen, fertig zum Aufhängen. Digitaler Download inklusive.',
    stripePriceIds: {
      a4: 'price_1TOhUA36Wy7c8yXhqM6ZwmMp',
      a3: 'price_1TOdjH36Wy7c8yXhumnPN5ed',
    },
  },
]

export function getStripePriceId(productId: ProductId, format: PrintFormat): string | null {
  const product = PRODUCTS.find((p) => p.id === productId)
  return product?.stripePriceIds[format] ?? null
}

export function formatPrice(cents: number) {
  return (cents / 100).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })
}
