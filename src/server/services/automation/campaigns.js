/**
 * automation/campaigns.js — CRUD + lifecycle for automation campaigns. A campaign is the
 * unit of automation (many per user): its own niche, schedule, style/voice/duration, target
 * accounts, privacy, brand kit, and topic queue. The scheduler, generation, render and
 * publish all key off a campaign row.
 *
 * Lifecycle: draft → (start) → active → (pause/resume) ↔ paused → (stop) → stopped → (start)
 * again. Stop cancels queued videos (handled by the route via the jobs queue); delete is
 * a separate explicit action.
 */
import { supabaseAdmin } from "../../middleware/shared.js";

export const STATUSES = ["draft", "active", "paused", "stopped"];

// Interim demand limits (configurable via env). Keep per-user demand within the YouTube
// API quota window until the audit + quota increase land. See also the app-level upload
// budget meter in jobs/handlers.js.
export const LIMITS = {
  maxCampaignsPerUser: Math.max(1, parseInt(process.env.MAX_CAMPAIGNS_PER_USER || "3", 10)),
  maxPostsPerDay:      Math.max(1, parseInt(process.env.MAX_POSTS_PER_DAY || "5", 10)),
};

// Fields a user may set when creating/updating a campaign. `status` is NOT here — it only
// changes through the lifecycle helpers so transitions stay explicit and auditable.
const EDITABLE = [
  "name", "service", "niches", "audience", "tone", "language", "orientation", "style_id", "voice_id",
  "target_duration", "keywords_emphasize", "keywords_avoid", "posts_per_day", "posting_times",
  "ai_decide_times", "target_accounts", "privacy", "auto_publish", "brand_kit_id",
  "daily_cap", "monthly_cap",
];

export async function listCampaigns(userId) {
  const { data, error } = await supabaseAdmin.from("automation_campaigns")
    .select("*").eq("user_id", userId).order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data || [];
}

/** A single campaign (no ownership check — server-internal use e.g. the worker). */
export async function getCampaign(campaignId) {
  const { data, error } = await supabaseAdmin.from("automation_campaigns").select("*").eq("id", campaignId).maybeSingle();
  if (error) throw new Error(error.message);
  return data || null;
}

/** A single campaign scoped to its owner (HTTP use). */
export async function getCampaignForUser(userId, campaignId) {
  const { data, error } = await supabaseAdmin.from("automation_campaigns")
    .select("*").eq("id", campaignId).eq("user_id", userId).maybeSingle();
  if (error) throw new Error(error.message);
  return data || null;
}

function clean(patch) {
  const row = {};
  for (const k of EDITABLE) if (k in patch) row[k] = patch[k];
  // Cap posts/day to the interim limit (defense-in-depth — clamps even bad API input).
  if (row.posts_per_day != null) {
    row.posts_per_day = Math.max(1, Math.min(LIMITS.maxPostsPerDay, parseInt(row.posts_per_day, 10) || 1));
  }
  return row;
}

export async function createCampaign(userId, patch = {}) {
  // Cap how many campaigns a user can have (stopped ones don't count — delete/stop to free a slot).
  const { count } = await supabaseAdmin.from("automation_campaigns")
    .select("id", { count: "exact", head: true }).eq("user_id", userId).neq("status", "stopped");
  if ((count || 0) >= LIMITS.maxCampaignsPerUser) {
    throw new Error(`Campaign limit reached (${LIMITS.maxCampaignsPerUser}). Stop or delete an existing campaign to create a new one.`);
  }
  const row = { user_id: userId, status: "draft", ...clean(patch) };
  const { data, error } = await supabaseAdmin.from("automation_campaigns").insert(row).select().single();
  if (error) throw new Error(error.message);
  return data;
}

export async function updateCampaign(userId, campaignId, patch = {}) {
  const row = { ...clean(patch), updated_at: new Date().toISOString() };
  const { data, error } = await supabaseAdmin.from("automation_campaigns")
    .update(row).eq("id", campaignId).eq("user_id", userId).select().single();
  if (error) throw new Error(error.message);
  return data;
}

/** Lifecycle transition. `userId` null = server/admin (no ownership filter). */
export async function setCampaignStatus(campaignId, status, userId = null) {
  if (!STATUSES.includes(status)) throw new Error(`invalid status "${status}"`);
  let q = supabaseAdmin.from("automation_campaigns").update({ status, updated_at: new Date().toISOString() }).eq("id", campaignId);
  if (userId) q = q.eq("user_id", userId);
  const { data, error } = await q.select().single();
  if (error) throw new Error(error.message);
  return data;
}

export async function deleteCampaign(userId, campaignId) {
  const { error } = await supabaseAdmin.from("automation_campaigns").delete().eq("id", campaignId).eq("user_id", userId);
  if (error) throw new Error(error.message);
}

/** Mark when a campaign last produced — the scheduler's per-campaign cadence cursor. */
export async function touchLastGenerated(campaignId) {
  await supabaseAdmin.from("automation_campaigns")
    .update({ last_generated_at: new Date().toISOString() }).eq("id", campaignId).then(() => {}, () => {});
}

/** All active campaigns across all users — the scheduler's work list. */
export async function listActiveCampaigns() {
  const { data, error } = await supabaseAdmin.from("automation_campaigns").select("*").eq("status", "active");
  if (error) throw new Error(error.message);
  return data || [];
}

/** Credit balances for a set of users → { userId: balance }. Scheduler credit gate. */
export async function getBalancesForUsers(userIds) {
  if (!userIds?.length) return {};
  const { data, error } = await supabaseAdmin.from("user_credits").select("user_id, balance").in("user_id", userIds);
  if (error) throw new Error(error.message);
  const map = {};
  for (const r of (data || [])) map[r.user_id] = r.balance ?? 0;
  return map;
}

/** Pause ALL of a user's active campaigns at once (e.g., out of credits). Returns paused rows. */
export async function pauseActiveCampaignsForUser(userId) {
  const { data, error } = await supabaseAdmin.from("automation_campaigns")
    .update({ status: "paused" }).eq("user_id", userId).eq("status", "active").select("id, name");
  if (error) throw new Error(error.message);
  return data || [];
}

/** Every campaign across all users — admin oversight. */
export async function listAllCampaigns() {
  const { data, error } = await supabaseAdmin.from("automation_campaigns").select("*").order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data || [];
}
