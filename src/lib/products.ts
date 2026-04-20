export type ProductId = 'download' | 'poster' | 'frame'

export interface Product {
  id: ProductId
  label: string
  description: string
  prices: Record<string, number> // format id → price in cents
}

export const PRODUCTS: Product[] = [
  {
    id: 'download',
    label: 'Digitaler Download',
    description: 'PNG + PDF in Druckqualität, sofort verfügbar',
    prices: { a4: 990, a3: 1290, a2: 1690 },
  },
  {
    id: 'poster',
    label: 'Poster',
    description: 'Hochwertiger Druck auf Fotopapier, geliefert per Post. Digitaler Download inklusive.',
    prices: { a4: 2490, a3: 3490, a2: 4990 },
  },
  {
    id: 'frame',
    label: 'Gerahmtes Poster',
    description: 'Poster im weißen Holzrahmen, fertig zum Aufhängen. Digitaler Download inklusive.',
    prices: { a4: 3990, a3: 5490, a2: 7990 },
  },
]

export function formatPrice(cents: number) {
  return (cents / 100).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })
}
