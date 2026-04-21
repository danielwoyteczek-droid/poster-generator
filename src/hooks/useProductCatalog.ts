'use client'

import { useEffect, useState } from 'react'
import type { ProductId } from '@/lib/products'
import type { PrintFormat } from '@/lib/print-formats'

export interface CatalogPrice {
  stripePriceId: string
  unitAmount: number
  currency: string
  compareAtCents?: number
}

export interface CatalogProduct {
  id: ProductId
  label: string
  description: string
  formats: Partial<Record<PrintFormat, CatalogPrice>>
}

interface CatalogState {
  loading: boolean
  error: string | null
  products: CatalogProduct[]
}

let cachedPromise: Promise<CatalogProduct[]> | null = null
let cachedAt = 0
const TTL_MS = 5 * 60 * 1000

async function load(): Promise<CatalogProduct[]> {
  const now = Date.now()
  if (cachedPromise && now - cachedAt < TTL_MS) return cachedPromise
  cachedAt = now
  cachedPromise = fetch('/api/products')
    .then(async (res) => {
      if (!res.ok) throw new Error(`Catalog request failed: ${res.status}`)
      const data = await res.json()
      return (data.products ?? []) as CatalogProduct[]
    })
    .catch((err) => {
      cachedPromise = null
      throw err
    })
  return cachedPromise
}

export function useProductCatalog(): CatalogState {
  const [state, setState] = useState<CatalogState>({ loading: true, error: null, products: [] })

  useEffect(() => {
    let cancelled = false
    load()
      .then((products) => {
        if (!cancelled) setState({ loading: false, error: null, products })
      })
      .catch((err) => {
        if (!cancelled) {
          setState({ loading: false, error: err.message ?? 'Katalog konnte nicht geladen werden', products: [] })
        }
      })
    return () => { cancelled = true }
  }, [])

  return state
}

export function priceFromCatalog(
  products: CatalogProduct[],
  productId: ProductId,
  format: PrintFormat,
): CatalogPrice | null {
  return products.find((p) => p.id === productId)?.formats[format] ?? null
}
