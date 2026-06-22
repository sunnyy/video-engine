/**
 * automation/quotas.js — per-CAMPAIGN daily/monthly caps to prevent runaway cost.
 * Generation count = consumed topics (automation_topic_history); publish count =
 * published_posts published. Caps come from the campaign, falling back to env defaults
 * (0/unset = no cap).
 */
import { supabaseAdmin } from "../../middleware/shared.js";

const startOfDay   = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d.toISOString(); };
const startOfMonth = () => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1).toISOString(); };

function envCap(name) { const n = parseInt(process.env[name] || "0", 10); return n > 0 ? n : null; }

function caps(campaign) {
  return {
    daily:   campaign.daily_cap   ?? envCap("AUTOPILOT_DAILY_CAP"),
    monthly: campaign.monthly_cap ?? envCap("AUTOPILOT_MONTHLY_CAP"),
  };
}

async function countSince(table, campaignId, tsCol, since) {
  const q = supabaseAdmin.from(table).select("id", { count: "exact", head: true }).eq("campaign_id", campaignId).gte(tsCol, since);
  const { count } = table === "published_posts" ? await q.eq("status", "published") : await q;
  return count || 0;
}

/** Returns { exceeded, reason } for generation caps (counts consumed topics for the campaign). */
export async function checkGenerationQuota(campaign) {
  const { daily, monthly } = caps(campaign);
  if (daily && (await countSince("automation_topic_history", campaign.id, "consumed_at", startOfDay())) >= daily)
    return { exceeded: true, reason: `daily generation cap (${daily}) reached` };
  if (monthly && (await countSince("automation_topic_history", campaign.id, "consumed_at", startOfMonth())) >= monthly)
    return { exceeded: true, reason: `monthly generation cap (${monthly}) reached` };
  return { exceeded: false };
}

/** Returns { exceeded, reason } for publish caps (counts published posts for the campaign). */
export async function checkPublishQuota(campaign) {
  const { daily, monthly } = caps(campaign);
  if (daily && (await countSince("published_posts", campaign.id, "published_at", startOfDay())) >= daily)
    return { exceeded: true, reason: `daily publish cap (${daily}) reached` };
  if (monthly && (await countSince("published_posts", campaign.id, "published_at", startOfMonth())) >= monthly)
    return { exceeded: true, reason: `monthly publish cap (${monthly}) reached` };
  return { exceeded: false };
}
