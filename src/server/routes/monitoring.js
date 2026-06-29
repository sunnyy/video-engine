/**
 * monitoring.js — admin-only Automation/worker observability. Read-only aggregation over
 * the jobs table + published_posts + the audit log + the worker heartbeat. Powers the
 * admin Monitoring page: queue depth, in-flight work, failures, throughput timings,
 * publish success rate, and whether a worker is actually alive.
 */
import express from "express";
import { requireAuth, requireAdmin, supabaseAdmin } from "../middleware/shared.js";
import { getWorkerHeartbeat, getKillSwitch } from "../jobs/flags.js";
import { listRecentEvents } from "../services/automation/events.js";
import { getHealth } from "../services/apiHealth.js";

export const router = express.Router();

const JOB_TYPES = ["generate_video", "render_timeline", "publish_post", "refill_topics"];
const count = async (q) => (await q).count || 0;

router.get("/metrics", requireAuth, requireAdmin, async (_req, res) => {
  try {
    const since24h = new Date(Date.now() - 24 * 3600_000).toISOString();
    const since7d  = new Date(Date.now() - 7 * 86400_000).toISOString();
    const c = (sel) => supabaseAdmin.from("jobs").select("id", { count: "exact", head: true }).match(sel);

    // Queue depth + in-flight + failures (24h).
    const [queued, running, failed24h] = await Promise.all([
      count(c({ status: "queued" })),
      count(c({ status: "running" })),
      count(supabaseAdmin.from("jobs").select("id", { count: "exact", head: true }).eq("status", "failed").gte("finished_at", since24h)),
    ]);

    // Queued broken down by type.
    const queuedByType = {};
    await Promise.all(JOB_TYPES.map(async (t) => {
      queuedByType[t] = await count(supabaseAdmin.from("jobs").select("id", { count: "exact", head: true }).eq("status", "queued").eq("type", t));
    }));

    // Throughput: avg duration (claimed→finished) per type over completed jobs in 24h.
    const { data: doneJobs } = await supabaseAdmin.from("jobs")
      .select("type, claimed_at, finished_at")
      .eq("status", "completed").gte("finished_at", since24h).limit(1000);
    const agg = {};
    for (const j of doneJobs || []) {
      if (!j.claimed_at || !j.finished_at) continue;
      const ms = new Date(j.finished_at) - new Date(j.claimed_at);
      if (ms < 0) continue;
      (agg[j.type] ||= { total: 0, n: 0 }); agg[j.type].total += ms; agg[j.type].n += 1;
    }
    const timings = {};
    for (const t of JOB_TYPES) timings[t] = agg[t]?.n ? { avgMs: Math.round(agg[t].total / agg[t].n), count: agg[t].n } : { avgMs: null, count: 0 };

    // Publish success rate (7d).
    const [published7d, failedPub7d] = await Promise.all([
      count(supabaseAdmin.from("published_posts").select("id", { count: "exact", head: true }).eq("status", "published").gte("created_at", since7d)),
      count(supabaseAdmin.from("published_posts").select("id", { count: "exact", head: true }).eq("status", "failed").gte("created_at", since7d)),
    ]);
    const totalPub = published7d + failedPub7d;
    const publishSuccessRate = totalPub ? Math.round((published7d / totalPub) * 100) : null;

    // Worker liveness — alive if it bumped its heartbeat within the last 90s.
    const heartbeat = await getWorkerHeartbeat();
    const workerAlive = heartbeat ? (Date.now() - new Date(heartbeat).getTime() < 90_000) : false;

    // Recent activity, enriched with campaign name + owner email so an admin can see
    // whose campaign each event belongs to at a glance.
    const events = await listRecentEvents(60);
    const campIds = [...new Set(events.map((e) => e.campaign_id).filter(Boolean))];
    const userIds = [...new Set(events.map((e) => e.user_id).filter(Boolean))];
    const cmap = {}, emap = {};
    if (campIds.length) {
      const { data } = await supabaseAdmin.from("automation_campaigns").select("id, name").in("id", campIds);
      for (const c of data || []) cmap[c.id] = c.name;
    }
    await Promise.all(userIds.map(async (uid) => {
      try { const { data } = await supabaseAdmin.auth.admin.getUserById(uid); emap[uid] = data?.user?.email || null; } catch (_) { emap[uid] = null; }
    }));
    const enrichedEvents = events.map((e) => ({ ...e, campaign_name: e.campaign_id ? (cmap[e.campaign_id] || null) : null, user_email: e.user_id ? (emap[e.user_id] || null) : null }));

    res.json({
      queue: { queued, running, failed24h, queuedByType },
      timings,
      publish: { published7d, failed7d: failedPub7d, successRate: publishSuccessRate },
      worker: { heartbeat, alive: workerAlive, killSwitch: await getKillSwitch() },
      apiHealth: await getHealth(),
      events: enrichedEvents,
      generatedAt: new Date().toISOString(),
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
