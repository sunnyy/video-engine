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

export const useCreditsStore = create((set, get) => ({
  balance:         null,
  lifetimeCredits: null,
  loading:         false,
  fetched:         false,

  fetchCredits: async () => {
    if (get().fetched || get().loading) return;
    set({ loading: true });
    const data = await getCredits();
    set({
      balance:         data?.balance         ?? 0,
      lifetimeCredits: data?.lifetime_credits ?? 0,
      loading:         false,
      fetched:         true,
    });
  },

  /** Force a fresh fetch (e.g. after purchase). */
  refetchCredits: async () => {
    set({ fetched: false, loading: true });
    const data = await getCredits();
    set({
      balance:         data?.balance         ?? 0,
      lifetimeCredits: data?.lifetime_credits ?? 0,
      loading:         false,
      fetched:         true,
    });
  },

  /** Optimistic local deduction — keeps UI in sync without a refetch. */
  deductLocal: (amount) =>
    set((state) => ({ balance: Math.max(0, (state.balance ?? 0) - amount) })),

  /** Call after a successful purchase to sync the new balance. */
  setBalance: (balance) => set({ balance }),

  /**
   * Polls up to 4 times (0s, 2s, 4s, 6s) waiting for the signup webhook to
   * credit the account. Used immediately after a brand-new Google signup so
   * the dashboard doesn't flash 0 while the webhook is in-flight.
   */
  fetchCreditsForNewUser: async () => {
    set({ fetched: false, loading: true });
    for (let i = 0; i < 4; i++) {
      if (i > 0) await new Promise(r => setTimeout(r, 2000));
      const data = await getCredits();
      const bal = data?.balance ?? 0;
      const done = bal > 0 || i === 3;
      set({
        balance:         bal,
        lifetimeCredits: data?.lifetime_credits ?? 0,
        loading:         !done,
        fetched:         done,
      });
      if (bal > 0) return;
    }
  },
}));
