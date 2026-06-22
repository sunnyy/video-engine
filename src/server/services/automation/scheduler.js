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
import { listActiveCampaigns, touchLastGenerated } from "./campaigns.js";
import { logEvent } from "./events.js";

const DAY_MS = 24 * 60 * 60 * 1000;

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

  for (const c of campaigns) {
    try {
      if (!c.niches?.length) continue;          // nothing to make
      if (!isDue(c)) continue;
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
