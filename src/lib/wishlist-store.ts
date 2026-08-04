'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface WishlistState {
  ids: string[]
  // sessionKey is generated client-side and persisted to localStorage so
  // the same anonymous browser keeps the same wishlist key. It MUST be
  // null during SSR / first client render to avoid hydration mismatch
  // (Math.random() and Date.now() produce different values on server vs
  // client). Components that need sessionKey should guard with
  // `if (!hasHydrated) return null`.
  sessionKey: string | null
  hasHydrated: boolean
  setHasHydrated: (v: boolean) => void
  toggle: (id: string) => void
  has: (id: string) => boolean
  clear: () => void
}

function genSessionKey() {
  return 'sk_' + Math.random().toString(36).slice(2) + Date.now().toString(36)
}

export const useWishlist = create<WishlistState>()(
  persist(
    (set, get) => ({
      ids: [],
      // Start null; the real value is assigned in onRehydrateStorage
      // (which runs only on the client) so SSR + first client render
      // both emit null.
      sessionKey: null,
      hasHydrated: false,
      setHasHydrated: (v) => set({ hasHydrated: v }),
      toggle: (id) => {
        const ids = get().ids
        if (ids.includes(id)) {
          set({ ids: ids.filter((x) => x !== id) })
        } else {
          set({ ids: [...ids, id] })
        }
      },
      has: (id) => get().ids.includes(id),
      clear: () => set({ ids: [] }),
    }),
    {
      name: 'khanom-wishlist',
      onRehydrateStorage: () => (state) => {
        // Re-hydration only happens on the client, so localStorage is
        // safe to read here. Reuse the previously-generated key if we
        // already persisted one; otherwise mint a fresh key and stash
        // it for next time.
        if (typeof window !== 'undefined' && state) {
          let key = window.localStorage.getItem('khanom-sk')
          if (!key) {
            key = genSessionKey()
            window.localStorage.setItem('khanom-sk', key)
          }
          state.sessionKey = key
          state.setHasHydrated(true)
        }
      },
    }
  )
)
