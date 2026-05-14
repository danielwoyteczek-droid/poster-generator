import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { AppliedVoucher } from '@/lib/voucher-validation'

/**
 * PROJ-48 — Voucher-State im Cart.
 *
 * Eigener Store (statt Erweiterung von useCartStore), weil:
 * - Voucher persistiert in sessionStorage (überlebt Reload, stirbt mit Browser-Close)
 * - CartItems persistieren in localStorage (überlebt alles)
 *
 * sessionStorage ist der dokumentierte Mittelweg laut Spec/Architektur:
 * Customer verliert den Code nicht bei versehentlichem Reload, aber wir
 * vermeiden Stale-Code-Anwendungen bei späteren Browser-Wiederbesuchen.
 *
 * Während Server-Side-Rendering ist sessionStorage nicht verfügbar; das
 * createJSONStorage-Helper handhabt das defensiv (no-op storage in SSR).
 */
interface VoucherStore {
  applied: AppliedVoucher | null
  apply: (voucher: AppliedVoucher) => void
  remove: () => void
}

const ssrSafeSessionStorage = () => {
  if (typeof window === 'undefined') return undefined
  return window.sessionStorage
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
      storage: createJSONStorage(() => ssrSafeSessionStorage() ?? ({
        getItem: () => null,
        setItem: () => {},
        removeItem: () => {},
      } as unknown as Storage)),
    },
  ),
)
