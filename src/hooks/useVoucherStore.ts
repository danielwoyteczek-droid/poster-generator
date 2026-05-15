import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { AppliedVoucher } from '@/lib/voucher-validation'

/**
 * PROJ-48 — Voucher-State im Cart.
 *
 * Eigener Store (statt Erweiterung von useCartStore), aber gleiches
 * Persistenz-Medium: localStorage. So sieht der Customer den angewendeten
 * Code auch in einem zweiten Tab und nach Reload — konsistent damit, dass
 * der Warenkorb selbst ebenfalls in localStorage liegt.
 *
 * QA Bug #2: zuvor sessionStorage → war tab-lokal. Der ursprüngliche Grund
 * (keine "verwaisten" Codes bei späteren Besuchen) ist anders gelöst:
 * - CartView re-validiert den Voucher beim Mount gegen /api/voucher/validate
 *   und verwirft ihn still, wenn er nicht mehr gilt.
 * - OrderView leert den Voucher nach erfolgreichem Checkout.
 */
interface VoucherStore {
  applied: AppliedVoucher | null
  apply: (voucher: AppliedVoucher) => void
  remove: () => void
}

const ssrSafeLocalStorage = () => {
  if (typeof window === 'undefined') return undefined
  return window.localStorage
}

export const useVoucherStore = create<VoucherStore>()(
  persist(
    (set) => ({
      applied: null,
      apply: (voucher) => set({ applied: voucher }),
      remove: () => set({ applied: null }),
    }),
    {
      name: 'poster-voucher',
      storage: createJSONStorage(() => ssrSafeLocalStorage() ?? ({
        getItem: () => null,
        setItem: () => {},
        removeItem: () => {},
      } as unknown as Storage)),
    },
  ),
)
