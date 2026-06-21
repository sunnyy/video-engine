/**
 * autopilot.js — HTTP boundary for AutoPilot settings + the topic queue. The topic-queue
 * service itself stays pure (no knowledge of rendering/publishing/jobs); this just exposes
 * it for the settings UI and manual testing. The scheduler (next phase) calls the service
 * directly, not these routes.
 */
import express from "express";
import { requireAuth, supabaseAdmin } from "../middleware/shared.js";
import { getSettings, saveSettings } from "../services/autopilot/settings.js";
import { ensureTopics, getQueuedCount } from "../services/autopilot/topics.js";
import { enqueue } from "../jobs/queue.js";

export const router = express.Router();

// Project the next ~30 days of posting slots from settings (no schedule table — derived).
function computeUpcoming(s, days = 30) {
  if (!s.enabled || !s.niches?.length) return [];
  const perDay = Math.max(1, s.posts_per_day || 1);
  const times = s.posting_times?.length ? s.posting_times : null;
  const now = new Date();
  const slots = [];
  for (let d = 0; d < days; d++) {
    const day = new Date(now); day.setDate(now.getDate() + d);
    if (times) {
      for (const t of times) {
        const [hh, mm] = String(t).split(":").map(Number);
        const dt = new Date(day); dt.setHours(hh || 0, mm || 0, 0, 0);
        if (dt > now) slots.push(dt.toISOString());
      }
    } else {
      for (let i = 0; i < perDay; i++) {
        const dt = new Date(day); dt.setHours(Math.floor((i + 1) * 24 / (perDay + 1)), 0, 0, 0);
        if (dt > now) slots.push(dt.toISOString());
      }
    }
  }
  return slots;
}

router.get("/settings", requireAuth, async (req, res) => {
  try { res.json({ settings: await getSettings(req.user.id) }); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

router.put("/settings", requireAuth, async (req, res) => {
  try { res.json({ settings: await saveSettings(req.user.id, req.body || {}) }); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

router.get("/topics", requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin.from("autopilot_topics")
      .select("id, title, niche, angle, keywords, status, created_at")
      .eq("user_id", req.user.id).order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    res.json({ topics: data || [], queued: await getQueuedCount(req.user.id) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post("/topics/refill", requireAuth, async (req, res) => {
  try { res.json(await ensureTopics(req.user.id)); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

/* ── Calendar: a read-only view over existing state (settings + jobs + posts). The
   scheduler remains the source of truth; this just visualizes/derives. ── */
router.get("/calendar", requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const settings = await getSettings(userId);
    const [{ data: jobs }, { data: posts }] = await Promise.all([
      supabaseAdmin.from("jobs")
        .select("id, type, status, progress, created_at")
        .in("type", ["generate_video", "render_timeline", "publish_post"])
        .in("status", ["queued", "running"])
        .filter("payload->>userId", "eq", userId)
        .order("created_at", { ascending: true }),
      supabaseAdmin.from("published_posts")
        .select("id, project_id, platform, platform_post_id, video_url, status, error, published_at, created_at")
        .eq("user_id", userId).order("created_at", { ascending: false }).limit(120),
    ]);
    res.json({
      settings,
      upcoming: computeUpcoming(settings),
      active: jobs || [],
      posts: posts || [],
      queued: await getQueuedCount(userId),
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

/* ── Actions ── */
router.post("/pause",  requireAuth, async (req, res) => { try { res.json({ settings: await saveSettings(req.user.id, { enabled: false }) }); } catch (e) { res.status(500).json({ error: e.message }); } });
router.post("/resume", requireAuth, async (req, res) => { try { res.json({ settings: await saveSettings(req.user.id, { enabled: true }) }); } catch (e) { res.status(500).json({ error: e.message }); } });

router.post("/generate-now", requireAuth, async (req, res) => {
  try { const job = await enqueue("generate_video", { userId: req.user.id }, { userId: req.user.id, maxAttempts: 3 }); res.json({ jobId: job.id }); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

// Skip the next queued topic (optionally refill to replace it).
async function skipOldestQueued(userId) {
  const { data } = await supabaseAdmin.from("autopilot_topics")
    .select("id").eq("user_id", userId).eq("status", "queued").order("created_at", { ascending: true }).limit(1).maybeSingle();
  if (data) await supabaseAdmin.from("autopilot_topics").update({ status: "skipped" }).eq("id", data.id);
  return !!data;
}
router.post("/skip-next",       requireAuth, async (req, res) => { try { res.json({ skipped: await skipOldestQueued(req.user.id) }); } catch (e) { res.status(500).json({ error: e.message }); } });
router.post("/regenerate-next", requireAuth, async (req, res) => { try { await skipOldestQueued(req.user.id); res.json(await ensureTopics(req.user.id)); } catch (e) { res.status(500).json({ error: e.message }); } });

// Approve an awaiting-approval post (auto_publish=false flow) → enqueue publish per platform.
router.post("/approve", requireAuth, async (req, res) => {
  try {
    const { projectId } = req.body;
    if (!projectId) return res.status(400).json({ error: "projectId required" });
    const { data: rows } = await supabaseAdmin.from("published_posts")
      .select("*").eq("user_id", req.user.id).eq("project_id", projectId).eq("status", "awaiting_approval");
    for (const r of rows || []) {
      await enqueue("publish_post", { userId: req.user.id, platform: r.platform, videoUrl: r.video_url, projectId, metadata: r.meta?.metadata || {}, postId: r.id }, { userId: req.user.id, maxAttempts: 5 });
      await supabaseAdmin.from("published_posts").update({ status: "queued", updated_at: new Date().toISOString() }).eq("id", r.id);
    }
    res.json({ approved: (rows || []).length });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
