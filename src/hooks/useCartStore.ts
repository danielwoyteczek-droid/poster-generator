import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { ProductId } from '@/lib/products'
import type { PrintFormat } from '@/lib/print-formats'

export type PosterType = 'map' | 'star-map'

export interface CartItem {
  id: string
  productId: ProductId
  format: PrintFormat
  posterType: PosterType
  title: string
  priceCents: number
  previewDataUrl: string
  snapshot: Record<string, unknown>
  projectId: string | null
  addedAt: number
}

interface CartStore {
  items: CartItem[]
  addItem: (item: Omit<CartItem, 'id' | 'addedAt'>) => void
  removeItem: (id: string) => void
  clearCart: () => void
  itemCount: () => number
  totalCents: () => number
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (item) =>
        set((state) => ({
          items: [
            ...state.items,
            { ...item, id: crypto.randomUUID(), addedAt: Date.now() },
          ],
        })),
      removeItem: (id) =>
        set((state) => ({ items: state.items.filter((i) => i.id !== id) })),
      clearCart: () => set({ items: [] }),
      itemCount: () => get().items.length,
      totalCents: () => get().items.reduce((sum, i) => sum + i.priceCents, 0),
    }),
    {
      name: 'poster-cart',
      storage: createJSONStorage(() => localStorage),
    },
  ),
)
