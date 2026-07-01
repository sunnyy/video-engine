/**
 * automation.js — HTTP boundary for Automation campaigns. CRUD + lifecycle (start/pause/
 * resume/stop) + run-once + per-video cancel + the campaign detail feed. The scheduler and
 * job handlers call the services directly; this just exposes them to the UI.
 */
import express from "express";
import { requireAuth, requireAdmin, supabaseAdmin } from "../middleware/shared.js";
import {
  listCampaigns, listAllCampaigns, getCampaign, getCampaignForUser, createCampaign, updateCampaign, setCampaignStatus, deleteCampaign,
} from "../services/automation/campaigns.js";
import { ensureTopics, getQueuedCount, skipOldestQueued, clearQueuedTopics, listQueuedTopics } from "../services/automation/topics.js";
import { listCampaignEvents, logEvent } from "../services/automation/events.js";
import { enqueue, cancelCampaignJobs, cancelJob, isJobLive } from "../jobs/queue.js";
import { requireProPlus } from "../middleware/planGate.js";

export const router = express.Router();

// Automation is a Pro/Max feature — Starter can't create or run campaigns.
const requireAutomation = requireProPlus("Automation");

const INFLIGHT_TYPES = ["generate_video", "render_timeline", "publish_post"];

// Self-heal: drop target_accounts ids whose social_accounts row no longer EXISTS (deleted on a
// disconnect before reconnect made a new id). Runs on read so the "ACCOUNTS" count corrects itself
// when the page loads — no manual cleanup. Only removes truly-missing rows, never a row that merely
// exists with a non-connected status, so a transient error can't wipe the campaign's targets.
async function pruneDeadTargetAccounts(campaign) {
  const targets = campaign?.target_accounts || [];
  if (!targets.length) return campaign;
  const { data: accts } = await supabaseAdmin.from("social_accounts").select("id").in("id", targets).eq("user_id", campaign.user_id);
  const existing = (accts || []).map((a) => a.id);
  if (existing.length === targets.length) return campaign; // nothing dead
  await supabaseAdmin.from("automation_campaigns")
    .update({ target_accounts: existing, updated_at: new Date().toISOString() }).eq("id", campaign.id);
  return { ...campaign, target_accounts: existing };
}

// Count queued + published per campaign so the list cards can show totals at a glance.
async function campaignCounts(campaignId) {
  const [{ count: inflight }, { count: published }] = await Promise.all([
    supabaseAdmin.from("jobs").select("id", { count: "exact", head: true }).in("type", INFLIGHT_TYPES).in("status", ["queued", "running"]).filter("payload->>campaignId", "eq", campaignId),
    supabaseAdmin.from("published_posts").select("id", { count: "exact", head: true }).eq("campaign_id", campaignId).eq("status", "published"),
  ]);
  return { inflight: inflight || 0, published: published || 0 };
}

/* ── List / create ── */
router.get("/campaigns", requireAuth, async (req, res) => {
  try {
    const campaigns = await listCampaigns(req.user.id);
    const withCounts = await Promise.all(campaigns.map(async (c0) => {
      const c = await pruneDeadTargetAccounts(c0);
      return { ...c, counts: await campaignCounts(c.id), queued: await getQueuedCount(c.id) };
    }));
    res.json({ campaigns: withCounts });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post("/campaigns", requireAuth, requireAutomation, async (req, res) => {
  try {
    const c = await createCampaign(req.user.id, req.body || {});
    logEvent({ userId: req.user.id, campaignId: c.id, action: "create", entity: "campaign", message: c.name });
    res.json({ campaign: c });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

/* Fetch a campaign's published posts + project names WITHOUT a PostgREST embed.
 * published_posts has no FK to projects, so `projects(name)` silently errors → empty list
 * (and the error was being swallowed). Names are fetched separately and mapped in, keeping
 * the { projects: { name } } shape the frontend expects. */
async function fetchCampaignPosts(campaignId) {
  const { data: posts, error } = await supabaseAdmin
    .from("published_posts")
    .select("id, platform, platform_post_id, status, error, published_at, created_at, project_id")
    .eq("campaign_id", campaignId).order("created_at", { ascending: false }).limit(200);
  if (error) throw new Error(`published_posts query failed: ${error.message}`);
  const rows = posts || [];
  const ids = [...new Set(rows.map(p => p.project_id).filter(Boolean))];
  let nameById = {};
  if (ids.length) {
    const { data: projs } = await supabaseAdmin.from("projects").select("id, name").in("id", ids);
    nameById = Object.fromEntries((projs || []).map(p => [p.id, p.name]));
  }
  return rows.map(p => ({ ...p, projects: nameById[p.project_id] ? { name: nameById[p.project_id] } : null }));
}

/* ── Detail feed (campaign + inflight jobs + published posts + queue + events) ── */
router.get("/campaigns/:id", requireAuth, async (req, res) => {
  try {
    let campaign = await getCampaignForUser(req.user.id, req.params.id);
    if (!campaign) return res.status(404).json({ error: "Campaign not found" });
    campaign = await pruneDeadTargetAccounts(campaign);
    const [{ data: jobs }, posts] = await Promise.all([
      supabaseAdmin.from("jobs").select("id, type, status, progress, created_at, run_at")
        .in("type", INFLIGHT_TYPES).in("status", ["queued", "running"])
        .filter("payload->>campaignId", "eq", campaign.id).order("created_at", { ascending: true }),
      fetchCampaignPosts(campaign.id),
    ]);
    // Only jobs running/queued-to-run-now are "active". A deferral SCHEDULED for later (run_at in the
    // future) goes in `scheduled` — so it no longer shows as a phantom "Publishing…" row nor disables
    // the deferred post's Retry button (the source of the confusing "publish in progress" state).
    const active    = (jobs || []).filter(isJobLive);
    const scheduled = (jobs || []).filter((j) => !isJobLive(j));
    res.json({
      campaign, active, scheduled, posts: posts || [],
      queued: await getQueuedCount(campaign.id),
      upcomingTopics: await listQueuedTopics(campaign.id, 50),
      events: await listCampaignEvents(campaign.id, 40),
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Settings that drive topic generation — when any change, the pre-generated topic queue is stale.
const TOPIC_DRIVING_FIELDS = ["niches", "audience", "tone", "keywords_emphasize", "keywords_avoid"];

router.put("/campaigns/:id", requireAuth, async (req, res) => {
  try {
    const existing = await getCampaignForUser(req.user.id, req.params.id);
    if (!existing) return res.status(404).json({ error: "Campaign not found" });
    const updated = await updateCampaign(req.user.id, req.params.id, req.body || {});

    // If the topic-driving inputs changed, the already-queued topics were generated from the OLD
    // settings — future videos would keep using them. Drop the unused queue and re-prime from the
    // new settings so the next videos follow the updated topic. Reserved/consumed are untouched.
    const topicsChanged = TOPIC_DRIVING_FIELDS.some(
      (f) => JSON.stringify(existing[f] ?? null) !== JSON.stringify(updated[f] ?? null)
    );
    if (topicsChanged) {
      try {
        const removed = await clearQueuedTopics(updated.id);
        const { added } = await ensureTopics(updated);
        logEvent({ userId: req.user.id, campaignId: updated.id, action: "topics_regenerated", entity: "campaign", message: `settings changed — cleared ${removed} queued, generated ${added}` });
      } catch (e) { console.warn("[automation] topic regen after edit failed:", e.message); }
    }

    res.json({ campaign: updated });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

router.delete("/campaigns/:id", requireAuth, async (req, res) => {
  try {
    const existing = await getCampaignForUser(req.user.id, req.params.id);
    if (!existing) return res.status(404).json({ error: "Campaign not found" });
    await cancelCampaignJobs(req.params.id);
    await deleteCampaign(req.user.id, req.params.id);
    logEvent({ userId: req.user.id, campaignId: req.params.id, action: "delete", entity: "campaign" });
    res.json({ ok: true });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

/* ── Lifecycle ── */
async function transition(req, res, status, { cancelJobs = false, primeTopics = false } = {}) {
  const campaign = await getCampaignForUser(req.user.id, req.params.id);
  if (!campaign) return res.status(404).json({ error: "Campaign not found" });
  const updated = await setCampaignStatus(req.params.id, status, req.user.id);
  if (cancelJobs) await cancelCampaignJobs(req.params.id);
  if (primeTopics && campaign.niches?.length) await enqueue("refill_topics", { userId: req.user.id, campaignId: req.params.id }, { userId: req.user.id }).catch(() => {});
  logEvent({ userId: req.user.id, campaignId: req.params.id, action: status, entity: "campaign", message: "manual" });
  res.json({ campaign: updated });
}
router.post("/campaigns/:id/start",  requireAuth, requireAutomation, (req, res) => transition(req, res, "active", { primeTopics: true }).catch((e) => res.status(400).json({ error: e.message })));
router.post("/campaigns/:id/resume", requireAuth, requireAutomation, (req, res) => transition(req, res, "active").catch((e) => res.status(400).json({ error: e.message })));
router.post("/campaigns/:id/pause",  requireAuth, (req, res) => transition(req, res, "paused").catch((e) => res.status(400).json({ error: e.message })));
router.post("/campaigns/:id/stop",   requireAuth, (req, res) => transition(req, res, "stopped", { cancelJobs: true }).catch((e) => res.status(400).json({ error: e.message })));

/* ── Manual "Run once" — deliberate kick that runs even while paused/stopped ── */
router.post("/campaigns/:id/run-once", requireAuth, requireAutomation, async (req, res) => {
  try {
    const campaign = await getCampaignForUser(req.user.id, req.params.id);
    if (!campaign) return res.status(404).json({ error: "Campaign not found" });
    const job = await enqueue("generate_video", { userId: req.user.id, campaignId: campaign.id, manual: true }, { userId: req.user.id, maxAttempts: 3 });
    logEvent({ userId: req.user.id, campaignId: campaign.id, action: "run_once", entity: "job", entityId: job.id, message: "manual" });
    res.json({ jobId: job.id });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

/* ── Per-video cancel — queued jobs are removed, running jobs abort cooperatively ── */
router.post("/campaigns/:id/cancel-job", requireAuth, async (req, res) => {
  try {
    const campaign = await getCampaignForUser(req.user.id, req.params.id);
    if (!campaign) return res.status(404).json({ error: "Campaign not found" });
    const result = await cancelJob(req.body?.jobId);
    if (result.ok) logEvent({ userId: req.user.id, campaignId: campaign.id, action: "cancel", entity: "job", entityId: req.body?.jobId, message: result.mode });
    res.json(result);
  } catch (e) { res.status(400).json({ error: e.message }); }
});

/* ── Retry a failed/deferred publish for ONE post — re-publishes the already-rendered video to
 *    the campaign's CURRENT connected account (so a reconnect that changed the account id just
 *    works). Reuses the same published_posts row; no re-render. ── */
router.post("/campaigns/:id/retry-post", requireAuth, async (req, res) => {
  try {
    const campaign = await getCampaignForUser(req.user.id, req.params.id);
    if (!campaign) return res.status(404).json({ error: "Campaign not found" });
    const postId = req.body?.postId;
    if (!postId) return res.status(400).json({ error: "postId required" });

    const { data: post } = await supabaseAdmin.from("published_posts")
      .select("id, platform, status, video_url, project_id, platform_post_id")
      .eq("id", postId).eq("campaign_id", campaign.id).maybeSingle();
    if (!post) return res.status(404).json({ error: "Post not found" });
    if (post.platform_post_id) return res.status(400).json({ error: "Already published" });
    if (!post.video_url) return res.status(400).json({ error: "No rendered video to publish — re-run generation instead" });

    // Resolve the user's CURRENT connected account for this platform directly (NOT limited to the
    // campaign's target_accounts, which may still hold a dead id from before a reconnect). One row
    // per user+platform, so this is unambiguous.
    const { data: acct } = await supabaseAdmin.from("social_accounts")
      .select("id, platform, status").eq("user_id", req.user.id).eq("platform", post.platform).eq("status", "connected").maybeSingle();
    if (!acct) return res.status(400).json({ error: `No connected ${post.platform} account — reconnect it first` });

    // Serialize publishes: only a publish running NOW (or queued to run now) blocks a retry. A
    // deferral SCHEDULED for later (run_at in the future) is NOT in progress — it must neither block
    // nor hide Retry. We also reuse that scheduled job by pulling it forward instead of stacking a
    // second one. (isJobLive is the shared definition used by every status view.)
    const { data: pubJobs = [] } = await supabaseAdmin.from("jobs")
      .select("id, status, run_at, payload")
      .eq("type", "publish_post").in("status", ["queued", "running"])
      .filter("payload->>campaignId", "eq", campaign.id);
    if (pubJobs.some((j) => isJobLive(j) && j.payload?.postId !== post.id))
      return res.status(409).json({ error: "Another publish is already running — wait for it to finish, then retry." });

    // Rebuild publish metadata from the saved project's publish copy + the campaign's privacy.
    const { data: proj } = await supabaseAdmin.from("projects").select("name, safe_project_json").eq("id", post.project_id).maybeSingle();
    const pub = proj?.safe_project_json?.meta?.publish || {};
    const hashtags = Array.isArray(pub.hashtags) ? pub.hashtags.filter(Boolean) : [];
    const metadata = {
      title: (pub.title || proj?.name || "").slice(0, 100),
      description: [pub.description, hashtags.join(" ")].filter(Boolean).join("\n\n"),
      tags: hashtags.map((h) => String(h).replace(/^#/, "")).filter(Boolean),
      privacyStatus: campaign.privacy || "public",
    };

    const nowIso = new Date().toISOString();
    await supabaseAdmin.from("published_posts")
      .update({ status: "queued", error: null, account_id: acct.id, updated_at: nowIso }).eq("id", post.id);
    // If a retry for THIS post is already scheduled (the deferral's queued job), pull it forward to
    // run now (refresh account/metadata in case of a reconnect) — no duplicate job. Else enqueue one.
    const scheduled = pubJobs.find((j) => j.payload?.postId === post.id);
    let jobId;
    if (scheduled) {
      await supabaseAdmin.from("jobs").update({
        status: "queued", run_at: nowIso, updated_at: nowIso,
        payload: { ...scheduled.payload, accountId: acct.id, platform: acct.platform, videoUrl: post.video_url, projectId: post.project_id, metadata, postId: post.id },
      }).eq("id", scheduled.id);
      jobId = scheduled.id;
    } else {
      const job = await enqueue("publish_post", {
        userId: req.user.id, campaignId: campaign.id, accountId: acct.id, platform: acct.platform,
        videoUrl: post.video_url, projectId: post.project_id, metadata, postId: post.id,
      }, { userId: req.user.id, maxAttempts: 5, priority: -10 });
      jobId = job.id;
    }
    logEvent({ userId: req.user.id, campaignId: campaign.id, action: "retry_publish", entity: "post", entityId: post.id, message: "manual retry" });
    res.json({ ok: true, jobId });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

/* ── Topic queue ── */
router.post("/campaigns/:id/topics/refill", requireAuth, async (req, res) => {
  try {
    const campaign = await getCampaignForUser(req.user.id, req.params.id);
    if (!campaign) return res.status(404).json({ error: "Campaign not found" });
    res.json(await ensureTopics(campaign));
  } catch (e) { res.status(400).json({ error: e.message }); }
});

router.post("/campaigns/:id/topics/skip-next", requireAuth, async (req, res) => {
  try {
    const campaign = await getCampaignForUser(req.user.id, req.params.id);
    if (!campaign) return res.status(404).json({ error: "Campaign not found" });
    res.json({ skipped: await skipOldestQueued(campaign.id) });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

/* ── Events (campaign audit history) ── */
router.get("/campaigns/:id/events", requireAuth, async (req, res) => {
  try {
    const campaign = await getCampaignForUser(req.user.id, req.params.id);
    if (!campaign) return res.status(404).json({ error: "Campaign not found" });
    res.json({ events: await listCampaignEvents(campaign.id, Math.min(200, parseInt(req.query.limit, 10) || 100)) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

/* ═══ ADMIN — oversight across ALL users' campaigns (no ownership filter) ═══ */

// Resolve user emails for a set of ids (best-effort, deduped).
async function emailMap(userIds) {
  const map = {};
  await Promise.all([...new Set(userIds)].map(async (uid) => {
    try { const { data } = await supabaseAdmin.auth.admin.getUserById(uid); map[uid] = data?.user?.email || null; } catch (_) { map[uid] = null; }
  }));
  return map;
}

router.get("/admin/campaigns", requireAuth, requireAdmin, async (_req, res) => {
  try {
    const campaigns = await listAllCampaigns();
    const emails = await emailMap(campaigns.map((c) => c.user_id));
    const withMeta = await Promise.all(campaigns.map(async (c) => ({
      ...c, user_email: emails[c.user_id], counts: await campaignCounts(c.id), queued: await getQueuedCount(c.id),
    })));
    res.json({ campaigns: withMeta });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get("/admin/campaigns/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    const campaign = await getCampaign(req.params.id);
    if (!campaign) return res.status(404).json({ error: "Campaign not found" });
    const [{ data: jobs }, posts] = await Promise.all([
      supabaseAdmin.from("jobs").select("id, type, status, progress, created_at, run_at")
        .in("type", INFLIGHT_TYPES).in("status", ["queued", "running"])
        .filter("payload->>campaignId", "eq", campaign.id).order("created_at", { ascending: true }),
      fetchCampaignPosts(campaign.id),
    ]);
    const active    = (jobs || []).filter(isJobLive);
    const scheduled = (jobs || []).filter((j) => !isJobLive(j));
    res.json({
      campaign, active, scheduled, posts: posts || [],
      queued: await getQueuedCount(campaign.id),
      upcomingTopics: await listQueuedTopics(campaign.id, 50),
      events: await listCampaignEvents(campaign.id, 40),
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Admin lifecycle controls — pause/stop any campaign (no ownership filter).
async function adminTransition(req, res, status, { cancelJobs = false } = {}) {
  const campaign = await getCampaign(req.params.id);
  if (!campaign) return res.status(404).json({ error: "Campaign not found" });
  const updated = await setCampaignStatus(req.params.id, status);
  if (cancelJobs) await cancelCampaignJobs(req.params.id);
  logEvent({ userId: campaign.user_id, campaignId: req.params.id, action: status, entity: "campaign", message: "by admin" });
  res.json({ campaign: updated });
}
router.post("/admin/campaigns/:id/pause", requireAuth, requireAdmin, (req, res) => adminTransition(req, res, "paused").catch((e) => res.status(400).json({ error: e.message })));
router.post("/admin/campaigns/:id/stop",  requireAuth, requireAdmin, (req, res) => adminTransition(req, res, "stopped", { cancelJobs: true }).catch((e) => res.status(400).json({ error: e.message })));
