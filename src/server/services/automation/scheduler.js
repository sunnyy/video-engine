/**
 * automation/scheduler.js — decides WHEN each active campaign should produce a post and
 * kicks off its job chain. It does NOT generate/render/publish itself; it only enqueues a
 * `generate_video` job (carrying campaignId), which then chains render → publish.
 *
 * Due-ness is derived per campaign from posts_per_day + last_generated_at (no schedule
 * table). A topic is reserved only inside the generate_video job — never here.
 */
import { supabaseAdmin } from "../../middleware/shared.js";
import { enqueue } from "../../jobs/queue.js";
import { isKillSwitchOn } from "../../jobs/flags.js";
import { listActiveCampaigns, touchLastGenerated, getBalancesForUsers, pauseActiveCampaignsForUser } from "./campaigns.js";
import { logEvent } from "./events.js";
import { notifyUser } from "../notificationService.js";
import { CREDIT_COSTS } from "../../../core/utils/creditCosts.js";

const DAY_MS = 24 * 60 * 60 * 1000;
// Cheapest video a campaign can produce (Social/Typography = 15). If a user can't afford
// even this, none of their campaigns can run → pause them all and stop checking.
const MIN_VIDEO_COST = Math.min(CREDIT_COSTS.social_video, CREDIT_COSTS.typography_video, CREDIT_COSTS.ai_video);

function isDue(c) {
  const perDay = Math.max(1, c.posts_per_day || 1);
  const interval = DAY_MS / perDay;
  if (!c.last_generated_at) return true;
  return Date.now() - new Date(c.last_generated_at).getTime() >= interval;
}

// Avoid pileups: don't enqueue if this campaign already has a generate_video in flight.
async function hasPendingGenerate(campaignId) {
  const { count } = await supabaseAdmin.from("jobs")
    .select("id", { count: "exact", head: true })
    .eq("type", "generate_video").in("status", ["queued", "running"])
    .filter("payload->>campaignId", "eq", campaignId);
  return (count || 0) > 0;
}

/** One scheduler pass: enqueue a generate_video for every active campaign that's due. */
export async function tick() {
  if (await isKillSwitchOn().catch(() => false)) return; // global pause: don't enqueue new work
  let campaigns;
  try { campaigns = await listActiveCampaigns(); }
  catch (e) { console.warn("[scheduler] load campaigns failed:", e.message); return; }

  // Only the campaigns that have something to make AND are due this tick.
  const due = campaigns.filter(c => c.niches?.length && isDue(c));
  if (!due.length) return;

  // ── Credit gate ──────────────────────────────────────────────────────────
  // Batch-fetch balances for just the due users. If a user can't afford even the
  // cheapest video, pause ALL their active campaigns now (one update) and skip — so we
  // never enqueue jobs that would just fail, and they drop out of future scheduler passes.
  let balances = {};
  try { balances = await getBalancesForUsers([...new Set(due.map(c => c.user_id))]); }
  catch (e) { console.warn("[scheduler] balance fetch failed:", e.message); }
  const brokeUsers = new Set();

  for (const c of due) {
    try {
      if (brokeUsers.has(c.user_id)) continue;  // already paused this user's campaigns this tick

      if ((balances[c.user_id] ?? 0) < MIN_VIDEO_COST) {
        brokeUsers.add(c.user_id);
        const paused = await pauseActiveCampaignsForUser(c.user_id).catch(() => []);
        for (const p of paused) {
          logEvent({ userId: c.user_id, campaignId: p.id, action: "pause", entity: "campaign", status: "info", message: "insufficient credits" });
        }
        notifyUser(c.user_id, {
          type: "automation_paused", icon: "⏸️", severity: "warning", link: "/automation",
          title: "Automation paused — out of credits",
          body: `Your ${paused.length} active campaign${paused.length === 1 ? " was" : "s were"} paused. Top up credits and resume to continue automatic videos.`,
        });
        console.log(`[scheduler] user ${c.user_id} out of credits — paused ${paused.length} campaign(s)`);
        continue;
      }

      if (await hasPendingGenerate(c.id)) continue;

      await enqueue("generate_video", { userId: c.user_id, campaignId: c.id }, { userId: c.user_id, maxAttempts: 3 });
      await touchLastGenerated(c.id);           // advance now so the next tick won't double-enqueue
      logEvent({ userId: c.user_id, campaignId: c.id, action: "schedule", entity: "job", status: "info", message: "due — queued generate_video" });
      console.log(`[scheduler] queued generate_video for campaign ${c.id}`);
    } catch (e) {
      console.warn(`[scheduler] campaign ${c.id} failed:`, e.message);
    }
  }
}
