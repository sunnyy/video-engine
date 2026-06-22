/**
 * notificationService.js
 * src/services/notifications/notificationService.js
 *
 * Client-side reads/updates for in-app notifications via Supabase (RLS-filtered to
 * own user). Rows are created server-side only (service role); the client can only
 * read its own and mark them read.
 */

import { supabase } from "../../lib/supabase";

/** Most recent notifications, newest first. */
export async function getNotifications(limit = 30) {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) return [];
  return data ?? [];
}

/** Count of unread notifications (read_at is null). */
export async function getUnreadCount() {
  if (!supabase) return 0;
  const { count, error } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .is("read_at", null);
  if (error) return 0;
  return count ?? 0;
}

/** Mark one notification read. */
export async function markRead(id) {
  if (!supabase) return;
  await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", id);
}

/** Mark every unread notification read for the current user. */
export async function markAllRead() {
  if (!supabase) return;
  await supabase.from("notifications").update({ read_at: new Date().toISOString() }).is("read_at", null);
}
