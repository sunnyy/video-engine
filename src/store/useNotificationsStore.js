/**
 * useNotificationsStore.js
 * src/store/useNotificationsStore.js
 *
 * Global in-app notification state. Loads the latest rows once, derives the unread
 * count locally, and subscribes to Supabase Realtime so new notifications (and
 * read-state changes from other tabs) stream in live without polling.
 */

import { create } from "zustand";
import { supabase } from "../lib/supabase";
import { getNotifications, markRead, markAllRead } from "../services/notifications/notificationService";

let channel = null;

export const useNotificationsStore = create((set, get) => ({
  items:   [],
  loading: false,
  fetched: false,

  fetch: async () => {
    if (get().loading) return;
    set({ loading: true });
    const items = await getNotifications(30);
    set({ items, loading: false, fetched: true });
  },

  /** Subscribe to live inserts/updates for this user. Idempotent. */
  subscribe: async () => {
    if (channel || !supabase) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    channel = supabase
      .channel(`notifications:${user.id}`)
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        ({ new: row }) => set(s => ({ items: [row, ...s.items.filter(n => n.id !== row.id)] })))
      .on("postgres_changes",
        { event: "UPDATE", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        ({ new: row }) => set(s => ({ items: s.items.map(n => n.id === row.id ? row : n) })))
      .subscribe();
  },

  unsubscribe: () => {
    if (channel && supabase) { supabase.removeChannel(channel); channel = null; }
  },

  /** Optimistic mark-read; Realtime UPDATE reconciles. */
  markOneRead: async (id) => {
    const now = new Date().toISOString();
    set(s => ({ items: s.items.map(n => n.id === id && !n.read_at ? { ...n, read_at: now } : n) }));
    await markRead(id);
  },

  markEveryRead: async () => {
    const now = new Date().toISOString();
    set(s => ({ items: s.items.map(n => n.read_at ? n : { ...n, read_at: now }) }));
    await markAllRead();
  },
}));
