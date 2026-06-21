/**
 * autopilot/quotas.js — daily/monthly caps to prevent runaway cost. Generation count =
 * consumed topics (autopilot_topic_history); publish count = published_posts published.
 * Caps come from per-user settings, falling back to env defaults (0/unset = no cap).
 */
import { supabaseAdmin } from "../../middleware/shared.js";

const startOfDay   = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d.toISOString(); };
const startOfMonth = () => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1).toISOString(); };

function envCap(name) { const n = parseInt(process.env[name] || "0", 10); return n > 0 ? n : null; }

function caps(settings) {
  return {
    daily:   settings.daily_cap   ?? envCap("AUTOPILOT_DAILY_CAP"),
    monthly: settings.monthly_cap ?? envCap("AUTOPILOT_MONTHLY_CAP"),
  };
}

async function countSince(table, userId, tsCol, since) {
  const q = supabaseAdmin.from(table).select("id", { count: "exact", head: true }).eq("user_id", userId).gte(tsCol, since);
  const { count } = table === "published_posts" ? await q.eq("status", "published") : await q;
  return count || 0;
}

/** Returns { exceeded, reason } for generation caps (counts consumed topics). */
export async function checkGenerationQuota(userId, settings) {
  const { daily, monthly } = caps(settings);
  if (daily && (await countSince("autopilot_topic_history", userId, "consumed_at", startOfDay())) >= daily)
    return { exceeded: true, reason: `daily generation cap (${daily}) reached` };
  if (monthly && (await countSince("autopilot_topic_history", userId, "consumed_at", startOfMonth())) >= monthly)
    return { exceeded: true, reason: `monthly generation cap (${monthly}) reached` };
  return { exceeded: false };
}

/** Returns { exceeded, reason } for publish caps (counts published posts). */
export async function checkPublishQuota(userId, settings) {
  const { daily, monthly } = caps(settings);
  if (daily && (await countSince("published_posts", userId, "published_at", startOfDay())) >= daily)
    return { exceeded: true, reason: `daily publish cap (${daily}) reached` };
  if (monthly && (await countSince("published_posts", userId, "published_at", startOfMonth())) >= monthly)
    return { exceeded: true, reason: `monthly publish cap (${monthly}) reached` };
  return { exceeded: false };
}
