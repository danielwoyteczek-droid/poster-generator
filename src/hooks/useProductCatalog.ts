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

export type FrameMarkupTable = Partial<Record<PrintFormat, CatalogPrice>>

interface CatalogState {
  loading: boolean
  error: string | null
  products: CatalogProduct[]
  frameMarkup: FrameMarkupTable
}

interface CatalogResponse {
  products: CatalogProduct[]
  frameMarkup: FrameMarkupTable
}

let cachedPromise: Promise<CatalogResponse> | null = null
let cachedAt = 0
const TTL_MS = 5 * 60 * 1000

async function load(): Promise<CatalogResponse> {
  const now = Date.now()
  if (cachedPromise && now - cachedAt < TTL_MS) return cachedPromise
  cachedAt = now
  cachedPromise = fetch('/api/products')
    .then(async (res) => {
      if (!res.ok) throw new Error(`Catalog request failed: ${res.status}`)
      const data = await res.json()
      return {
        products: (data.products ?? []) as CatalogProduct[],
        frameMarkup: (data.frameMarkup ?? {}) as FrameMarkupTable,
      }
    })
    .catch((err) => {
      cachedPromise = null
      throw err
    })
  return cachedPromise
}

export function useProductCatalog(): CatalogState {
  const [state, setState] = useState<CatalogState>({
    loading: true,
    error: null,
    products: [],
    frameMarkup: {},
  })

  useEffect(() => {
    let cancelled = false
    load()
      .then((res) => {
        if (!cancelled) {
          setState({
            loading: false,
            error: null,
            products: res.products,
            frameMarkup: res.frameMarkup,
          })
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setState({
            loading: false,
            error: err.message ?? 'Katalog konnte nicht geladen werden',
            products: [],
            frameMarkup: {},
          })
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

export function frameMarkupFromCatalog(
  frameMarkup: FrameMarkupTable,
  format: PrintFormat,
): CatalogPrice | null {
  return frameMarkup[format] ?? null
}
