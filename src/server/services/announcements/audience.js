/**
 * audience.js — resolve an announcement's `audience` spec into a list of user ids.
 * Shared by the preview-count route and the broadcast_announcement job so the count the
 * admin sees and the rows actually inserted always match.
 *
 * audience shapes:
 *   { type: "all" }
 *   { type: "users",   userIds: [...] }
 *   { type: "segment", segment: { plan, maxBalance, inactiveDays, signupAfter, signupBefore } }
 *     plan: "free" (no active sub) | "paid" (any active sub) | undefined (any)
 */

import { supabaseAdmin } from "../../middleware/shared.js";

const CHUNK = 1000;

/** Page through every auth user (listUsers caps at 1000/page). */
async function listAllUsers() {
  const out = [];
  for (let page = 1; ; page++) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: CHUNK });
    if (error) throw new Error(`listUsers failed: ${error.message}`);
    const batch = data?.users || [];
    out.push(...batch);
    if (batch.length < CHUNK) break;
  }
  return out;
}

/** Run a `.in("user_id", ids)` select in chunks to stay under query limits. */
async function selectInChunks(table, columns, ids) {
  const rows = [];
  for (let i = 0; i < ids.length; i += CHUNK) {
    const { data, error } = await supabaseAdmin.from(table).select(columns).in("user_id", ids.slice(i, i + CHUNK));
    if (error) throw new Error(`${table} select failed: ${error.message}`);
    rows.push(...(data || []));
  }
  return rows;
}

export async function resolveAudienceIds(audience = {}) {
  const type = audience.type || "all";

  if (type === "users") {
    return Array.isArray(audience.userIds) ? [...new Set(audience.userIds.filter(Boolean))] : [];
  }

  const users = await listAllUsers();
  if (type === "all") return users.map(u => u.id);

  // ── segment ──
  const seg = audience.segment || {};
  let filtered = users;

  if (seg.signupAfter)  { const t = new Date(seg.signupAfter).getTime();  filtered = filtered.filter(u => new Date(u.created_at).getTime() >= t); }
  if (seg.signupBefore) { const t = new Date(seg.signupBefore).getTime(); filtered = filtered.filter(u => new Date(u.created_at).getTime() <= t); }
  if (seg.inactiveDays) {
    const cutoff = Date.now() - Number(seg.inactiveDays) * 86400000;
    filtered = filtered.filter(u => !u.last_sign_in_at || new Date(u.last_sign_in_at).getTime() < cutoff);
  }

  let ids = filtered.map(u => u.id);
  if (!ids.length) return [];

  if (seg.plan === "free" || seg.plan === "paid") {
    const subs = await selectInChunks("subscriptions", "user_id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]);
    const active = new Set(subs.map(s => s.user_id));
    ids = seg.plan === "paid" ? ids.filter(id => active.has(id)) : ids.filter(id => !active.has(id));
  }

  if (seg.maxBalance != null && seg.maxBalance !== "") {
    const max = Number(seg.maxBalance);
    const credits = await selectInChunks("user_credits", "user_id, balance", ids);
    const bal = new Map(credits.map(r => [r.user_id, r.balance ?? 0]));
    ids = ids.filter(id => (bal.get(id) ?? 0) <= max);
  }

  return ids;
}

/** Icon + severity defaults per category (server is the source of truth). */
export const CATEGORY_META = {
  news:        { icon: "📣", severity: "info" },
  promo:       { icon: "🎁", severity: "success" },
  maintenance: { icon: "🛠️", severity: "warning" },
  warning:     { icon: "⚠️", severity: "warning" },
  tip:         { icon: "💡", severity: "info" },
};
