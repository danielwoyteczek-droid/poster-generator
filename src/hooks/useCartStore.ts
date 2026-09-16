import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { ProductId } from '@/lib/products'
import type { PrintFormat } from '@/lib/print-formats'
import type { DtfSheetFormat } from '@/lib/dtf-constants'

export type PosterType = 'map' | 'star-map' | 'photo' | 'dtf'

/**
 * PROJ-55: Formate im Warenkorb. Poster rechnen nach Papierformat
 * (a4 | a3 | a2), DTF nach Bogenmaß (a4 | a3 | 40x50). Die Überschneidung
 * bei A4 und A3 ist zufällig — deshalb die Vereinigung statt einer
 * gemeinsamen Liste. `productId` entscheidet, welche Bedeutung gilt.
 */
export type CartFormat = PrintFormat | DtfSheetFormat

export interface CartItem {
  id: string
  productId: ProductId
  /**
   * PROJ-48: true when the customer picked the "Mit schwarzem Rahmen"
   * upsell. Only meaningful when productId='poster'. For 'download' this
   * is always false. Stored alongside priceCents so the cart total stays
   * consistent without re-fetching the catalog on each render.
   */
  withFrame: boolean
  format: CartFormat
  posterType: PosterType
  /**
   * PROJ-55: Auflage. Für Poster und Downloads immer 1 — jede Position ist
   * dort ein Einzelstück. Für DTF die Anzahl identischer Bögen; sie geht
   * als Menge an Stripe, damit eine Preisänderung im Dashboard sofort für
   * alle Auflagen greift.
   */
  quantity: number
  title: string
  /**
   * Total price for this cart item in cents, including frame markup if
   * applicable. Computed at add-to-cart time, persisted as the source of
   * truth for the cart total.
   */
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

interface LegacyCartItem extends Omit<CartItem, 'productId' | 'withFrame' | 'quantity'> {
  productId: 'download' | 'poster' | 'frame'
  withFrame?: boolean
  /** Fehlt in Körben von vor PROJ-55 — die Migration setzt 1. */
  quantity?: number
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
      // PROJ-55: auf 2 gehoben, weil CartItem.quantity dazugekommen ist.
      // Ohne Versionssprung liefe die Migration nicht und Bestandskörbe
      // hätten quantity=undefined — der Checkout würde dann eine Menge
      // ohne Wert an Stripe schicken.
      version: 2,
      storage: createJSONStorage(() => localStorage),
      // PROJ-48: migrate legacy carts where productId could be 'frame'.
      // Legacy 'frame' items were bundle SKUs (Poster + Rahmen + Download);
      // we keep their stored priceCents unchanged so the customer's total
      // is preserved across the schema flip. Newly added items use the
      // tier model (poster + withFrame + frame_markup_<fmt>).
      migrate: (persisted: unknown, _version: number) => {
        if (!persisted || typeof persisted !== 'object') {
          return { items: [] }
        }
        const state = persisted as { items?: LegacyCartItem[] }
        const items: CartItem[] = (state.items ?? []).map((legacy) => {
          // PROJ-55: Bestandspositionen sind Einzelstücke. Ohne diesen
          // Standardwert ginge quantity=undefined in den Checkout.
          const quantity = legacy.quantity ?? 1
          if (legacy.productId === 'frame') {
            const { productId: _drop, withFrame: _drop2, ...rest } = legacy
            void _drop
            void _drop2
            return { ...rest, quantity, productId: 'poster' as const, withFrame: true }
          }
          return {
            ...legacy,
            quantity,
            productId: legacy.productId,
            withFrame: legacy.withFrame ?? false,
          }
        })
        return { items }
      },
    },
  ),
)
