/**
 * usePlanStore.js — the user's active plan, client-side, for UI gating (locks/badges).
 * The HARD enforcement is server-side (middleware/planGate.js); this only drives UX so Starter
 * users see an upgrade prompt instead of a raw 403. Admins are treated as Pro+ (match the server).
 */
import { create } from "zustand";
import { serverFetch } from "../services/serverApi";
import { supabase } from "../lib/supabase";

const PRO_PLUS = new Set(["pro", "max"]);

export const usePlanStore = create((set, get) => ({
  planSlug: null,
  isProPlus: false,
  loaded: false,
  loading: false,

  fetchPlan: async (force = false) => {
    if (get().loading) return;
    if (get().loaded && !force) return;
    set({ loading: true });
    try {
      const [{ data: { session } }, res] = await Promise.all([
        supabase.auth.getSession(),
        serverFetch("/api/payments/subscription"),
      ]);
      const isAdmin = session?.user?.app_metadata?.role === "admin";
      const d = await res.json().catch(() => ({}));
      const slug = d?.subscription?.plans?.slug || null;
      set({ planSlug: slug, isProPlus: isAdmin || PRO_PLUS.has(slug), loaded: true, loading: false });
    } catch {
      set({ loaded: true, loading: false });
    }
  },

  reset: () => set({ planSlug: null, isProPlus: false, loaded: false, loading: false }),
}));
