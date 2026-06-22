/**
 * prefsService.js
 * src/services/notifications/prefsService.js
 *
 * Read/write the current user's notification channel preferences via Supabase (RLS-scoped
 * to own row). Shape: { "<category>": { in_app: bool, email: bool } }. A missing entry
 * means ON — the server applies the same opt-out default.
 */

import { supabase } from "../../lib/supabase";

export async function getNotificationPrefs() {
  if (!supabase) return {};
  const { data, error } = await supabase.from("notification_prefs").select("prefs").maybeSingle();
  if (error) return {};
  return data?.prefs || {};
}

export async function saveNotificationPrefs(prefs) {
  if (!supabase) return;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from("notification_prefs").upsert(
    { user_id: user.id, prefs, updated_at: new Date().toISOString() },
    { onConflict: "user_id" },
  );
}
