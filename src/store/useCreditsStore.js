/**
 * useCreditsStore.js
 * src/store/useCreditsStore.js
 *
 * Global credit balance state. Fetched once on mount, updated optimistically
 * after each deduction so the UI reflects the cost immediately without
 * waiting for a server round-trip.
 */

import { create } from "zustand";
import { getCredits } from "../services/credits/creditService";

export const useCreditsStore = create((set) => ({
  balance:         null,
  lifetimeCredits: null,
  loading:         false,

  fetchCredits: async () => {
    set({ loading: true });
    const data = await getCredits();
    set({
      balance:         data?.balance         ?? 0,
      lifetimeCredits: data?.lifetime_credits ?? 0,
      loading:         false,
    });
  },

  /** Optimistic local deduction — keeps UI in sync without a refetch. */
  deductLocal: (amount) =>
    set((state) => ({ balance: Math.max(0, (state.balance ?? 0) - amount) })),

  /** Call after a successful purchase to sync the new balance. */
  setBalance: (balance) => set({ balance }),
}));
