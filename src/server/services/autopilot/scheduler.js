/**
 * autopilot/scheduler.js — decides WHEN to produce a post and kicks off the job chain.
 * It does NOT generate, render, or publish itself; it only enqueues a `generate_video`
 * job (which then chains render → publish). Runs in the worker process on an interval.
 *
 * No autopilot_schedule table: due-ness is derived from settings (posts_per_day +
 * last_generated_at). A topic is reserved only inside the generate_video job — never here,
 * hours in advance.
 */
import { supabaseAdmin } from "../../middleware/shared.js";
import { enqueue } from "../../jobs/queue.js";
import { isKillSwitchOn } from "../../jobs/flags.js";

const DAY_MS = 24 * 60 * 60 * 1000;

function isDue(s) {
  const perDay = Math.max(1, s.posts_per_day || 1);
  const interval = DAY_MS / perDay;
  if (!s.last_generated_at) return true;
  return Date.now() - new Date(s.last_generated_at).getTime() >= interval;
}

// Avoid pileups: don't enqueue if this user already has a generate_video in flight.
async function hasPendingGenerate(userId) {
  const { count } = await supabaseAdmin.from("jobs")
    .select("id", { count: "exact", head: true })
    .eq("type", "generate_video").in("status", ["queued", "running"])
    .filter("payload->>userId", "eq", userId);
  return (count || 0) > 0;
}

/** One scheduler pass: enqueue a generate_video for every enabled user that's due. */
export async function tick() {
  if (await isKillSwitchOn().catch(() => false)) return; // global pause: don't enqueue new work
  const { data: rows, error } = await supabaseAdmin.from("autopilot_settings").select("*").eq("enabled", true);
  if (error) { console.warn("[scheduler] load settings failed:", error.message); return; }

  for (const s of rows || []) {
    try {
      if (!s.niches?.length) continue;          // nothing to make
      if (!isDue(s)) continue;
      if (await hasPendingGenerate(s.user_id)) continue;

      await enqueue("generate_video", { userId: s.user_id }, { userId: s.user_id, maxAttempts: 3 });
      // Advance the clock now so the next tick won't double-enqueue before the interval.
      await supabaseAdmin.from("autopilot_settings")
        .update({ last_generated_at: new Date().toISOString() }).eq("user_id", s.user_id);
      console.log(`[scheduler] queued generate_video for ${s.user_id}`);
    } catch (e) {
      console.warn(`[scheduler] ${s.user_id} failed:`, e.message);
    }
  }
}
