'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface CartItem {
  id: string
  slug: string
  name: string
  nameEn?: string | null
  price: number // unit price (uses flashSalePrice when applicable)
  originalPrice?: number
  unit: string
  emoji: string
  gradient: string
  type: string
  quantity: number
  isFlashSale?: boolean
}

interface CartState {
  items: CartItem[]
  couponCode: string | null
  discount: number // percent 0..1
  hasHydrated: boolean
  addItem: (item: Omit<CartItem, 'quantity'>, qty?: number) => void
  removeItem: (id: string) => void
  updateQty: (id: string, qty: number) => void
  clearCart: () => void
  applyCoupon: (code: string, discountPercent: number) => void
  removeCoupon: () => void
  setHasHydrated: (v: boolean) => void
  subtotal: () => number
  shipping: () => number
  total: () => number
  count: () => number
}

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      couponCode: null,
      discount: 0,
      hasHydrated: false,
      addItem: (item, qty = 1) => {
        const items = get().items
        const existing = items.find((i) => i.id === item.id)
        if (existing) {
          set({
            items: items.map((i) =>
              i.id === item.id ? { ...i, quantity: i.quantity + qty } : i
            ),
          })
        } else {
          set({ items: [...items, { ...item, quantity: qty }] })
        }
      },
      removeItem: (id) =>
        set({ items: get().items.filter((i) => i.id !== id) }),
      updateQty: (id, qty) => {
        if (qty <= 0) {
          set({ items: get().items.filter((i) => i.id !== id) })
          return
        }
        set({
          items: get().items.map((i) =>
            i.id === id ? { ...i, quantity: qty } : i
          ),
        })
      },
      clearCart: () => set({ items: [], couponCode: null, discount: 0 }),
      applyCoupon: (code, discountPercent) =>
        set({ couponCode: code, discount: discountPercent }),
      removeCoupon: () => set({ couponCode: null, discount: 0 }),
      setHasHydrated: (v) => set({ hasHydrated: v }),
      subtotal: () =>
        get().items.reduce((s, i) => s + i.price * i.quantity, 0),
      shipping: () => {
        const sub = get().subtotal()
        if (sub === 0) return 0
        return sub >= 500 ? 0 : 40
      },
      total: () => {
        const sub = get().subtotal()
        const disc = sub * get().discount
        return Math.max(0, sub - disc) + get().shipping()
      },
      count: () => get().items.reduce((s, i) => s + i.quantity, 0),
    }),
    {
      name: 'khanom-cart',
      // Flip hasHydrated to true once persisted state has been
      // re-hydrated into memory. Lets the navbar badge hide itself
      // until then to avoid the "0 → N" hydration flash.
      // Guard with `typeof window` so SSR doesn't flip the flag.
      onRehydrateStorage: () => (state) => {
        if (typeof window !== 'undefined' && state) {
          state.setHasHydrated(true)
        }
      },
    }
  )
)
