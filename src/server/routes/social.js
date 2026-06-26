/**
 * social.js — OAuth connect/callback + account management for publishing platforms.
 * Thin HTTP layer over services/social. Tokens never leave the server.
 */
import express from "express";
import { requireAuth } from "../middleware/shared.js";
import { connect, completeConnect, disconnect } from "../services/social/service.js";
import { listAccounts } from "../services/social/accounts.js";
import { saveAppCredentials, deleteAppCredentials, hasAppCredentials } from "../services/social/appCredentials.js";
import { supportedPlatforms, allCapabilities } from "../services/social/adapters/index.js";
import { enqueue } from "../jobs/queue.js";
import { supabaseAdmin } from "../middleware/shared.js";

export const router = express.Router();

// Where to send the browser back to after the OAuth round-trip (frontend origin).
const APP_URL = process.env.APP_PUBLIC_URL || process.env.VITE_APP_URL || "";
// The OAuth callback URL users must add to THEIR own Google OAuth client's authorized
// redirect URIs (must match the adapter's cfg() exactly).
const OAUTH_BASE = process.env.OAUTH_REDIRECT_BASE || process.env.VITE_APP_URL || "";
const redirectUriFor = (platform) => `${OAUTH_BASE}/api/social/${platform}/callback`;

/** List the user's connected accounts (no tokens) + which platforms are supported. */
router.get("/accounts", requireAuth, async (req, res) => {
  try { res.json({ accounts: await listAccounts(req.user.id), supported: supportedPlatforms(), capabilities: allCapabilities() }); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

/** Start OAuth — returns the consent URL for the client to navigate to. */
router.get("/:platform/connect", requireAuth, async (req, res) => {
  try { res.json({ url: await connect(req.user.id, req.params.platform) }); }
  catch (e) { res.status(400).json({ error: e.message }); }
});

/**
 * BYO OAuth app credentials — the user's own cloud project client_id/secret, so publishing
 * runs on their quota. Secrets are encrypted server-side and never returned to the client.
 * GET returns only whether it's configured + the redirect URI to paste into their OAuth client.
 */
router.get("/:platform/credentials", requireAuth, async (req, res) => {
  try {
    const status = await hasAppCredentials(req.user.id, req.params.platform);
    res.json({ ...status, redirectUri: redirectUriFor(req.params.platform) });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

router.post("/:platform/credentials", requireAuth, async (req, res) => {
  try {
    const { clientId, clientSecret } = req.body || {};
    const saved = await saveAppCredentials(req.user.id, req.params.platform, { clientId, clientSecret });
    res.json({ ok: true, clientId: saved.clientId, redirectUri: redirectUriFor(req.params.platform) });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

router.delete("/:platform/credentials", requireAuth, async (req, res) => {
  try { await deleteAppCredentials(req.user.id, req.params.platform); res.json({ ok: true }); }
  catch (e) { res.status(400).json({ error: e.message }); }
});

/** OAuth redirect target (no auth header — identity travels in the signed `state`). */
router.get("/:platform/callback", async (req, res) => {
  const { code, state, error } = req.query;
  const back = (q) => res.redirect(`${APP_URL}/connections?${q}`);
  if (error) return back(`social_error=${encodeURIComponent(String(error))}`);
  if (!code || !state) return back("social_error=missing_code");
  try {
    const { platform } = await completeConnect(String(state), String(code));
    back(`connected=${encodeURIComponent(platform)}`);
  } catch (e) {
    console.error("[social/callback]", e.message);
    back(`social_error=${encodeURIComponent(e.message)}`);
  }
});

/** Disconnect a platform. */
router.post("/:platform/disconnect", requireAuth, async (req, res) => {
  try { await disconnect(req.user.id, req.params.platform); res.json({ ok: true }); }
  catch (e) { res.status(400).json({ error: e.message }); }
});

/**
 * Manual publish of an already-rendered MP4 to one or more CONNECTED accounts (used by the
 * editor's Publish button). Account-level: resolves each account's platform, enqueues a
 * publish_post per account (campaign_id stays null — this isn't a campaign post).
 * body: { accountIds[], videoUrl, projectId?, metadata?: { title, description, tags[], privacyStatus } }
 */
router.post("/publish", requireAuth, async (req, res) => {
  try {
    const { accountIds, videoUrl, projectId = null, metadata = {} } = req.body || {};
    if (!Array.isArray(accountIds) || !accountIds.length || !videoUrl) return res.status(400).json({ error: "accountIds and videoUrl required" });
    const byId = Object.fromEntries((await listAccounts(req.user.id)).map((a) => [a.id, a]));
    let queued = 0;
    for (const id of accountIds) {
      const acct = byId[id];
      if (!acct || acct.status !== "connected") continue;
      await enqueue("publish_post", { userId: req.user.id, accountId: acct.id, platform: acct.platform, videoUrl, projectId, metadata }, { userId: req.user.id, maxAttempts: 5, priority: -10 });
      queued++;
    }
    if (!queued) return res.status(400).json({ error: "No connected accounts selected" });
    res.json({ queued });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

/**
 * Render-then-publish (editor Publish button). Enqueues ONE render_timeline job with a publish
 * chain — the worker renders the current project, then publishes to each account (reusing the
 * automation chain). Durable & background: progress/outcome are tracked in the jobs table and
 * surfaced via GET /publish-status, so the flow survives page reload / navigation / tab close.
 * The live timeline JSON is sent so the render is exactly what's on screen (like Export).
 * body: { projectId, project?, accountIds[], metadata?: { title, description, tags[], privacyStatus } }
 */
router.post("/render-and-publish", requireAuth, async (req, res) => {
  try {
    const { projectId, project = null, accountIds, metadata = {} } = req.body || {};
    if (!projectId) return res.status(400).json({ error: "projectId required" });
    if (!Array.isArray(accountIds) || !accountIds.length) return res.status(400).json({ error: "accountIds required" });
    const byId = Object.fromEntries((await listAccounts(req.user.id)).map((a) => [a.id, a]));
    const accounts = accountIds.map((id) => byId[id]).filter((a) => a && a.status === "connected").map((a) => ({ id: a.id, platform: a.platform }));
    if (!accounts.length) return res.status(400).json({ error: "No connected accounts selected" });
    const job = await enqueue(
      "render_timeline",
      { userId: req.user.id, projectId, project, chain: { publish: { accounts, metadata, autoPublish: true } } },
      { userId: req.user.id, maxAttempts: 3, priority: -5 },
    );
    res.json({ jobId: job.id, accounts: accounts.length });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

/**
 * Durable publish status for a project's editor publish (campaign_id null). Recomputed from the
 * jobs table on every call, so a reloaded/reopened editor shows the live state instead of a fresh
 * Publish button. Looks at the latest editor render_timeline job + the publish_post jobs it spawns.
 * Returns: { active, phase: "rendering"|"publishing"|"published"|"failed"|"idle", progress, published, failed, total, finishedAt? }
 */
router.get("/publish-status", requireAuth, async (req, res) => {
  try {
    const projectId = String(req.query.projectId || "");
    if (!projectId) return res.status(400).json({ error: "projectId required" });

    // Persistent publish history for this project (editor publishes only). This is what powers the
    // "✓ Published" chip + history dropdown, so the editor shows it on every open regardless of
    // whether the user saw the toast. account display names come from the user's connected accounts.
    const acctName = Object.fromEntries(
      (await listAccounts(req.user.id)).map((a) => [a.id, a.display_name || a.platform]),
    );
    const postLink = (row) =>
      row.meta?.url ||
      (row.platform === "youtube" && row.platform_post_id ? `https://youtu.be/${row.platform_post_id}` : null);
    const { data: pubRows = [] } = await supabaseAdmin
      .from("published_posts")
      .select("platform, status, published_at, account_id, platform_post_id, meta")
      .eq("user_id", req.user.id)
      .eq("project_id", projectId)
      .is("campaign_id", null)
      .in("status", ["published", "failed"])
      .order("published_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .limit(12);
    const lastPosts = (pubRows || []).map((r) => ({
      platform: r.platform, status: r.status, url: postLink(r),
      account: acctName[r.account_id] || r.platform, accountId: r.account_id, at: r.published_at,
    }));
    const last = lastPosts.some((p) => p.status === "published")
      ? { at: lastPosts.find((p) => p.status === "published")?.at || null, posts: lastPosts }
      : null;

    const { data: jobs = [] } = await supabaseAdmin
      .from("jobs")
      .select("id, type, status, progress, error, created_at, finished_at, payload")
      .eq("user_id", req.user.id)
      .in("type", ["render_timeline", "publish_post"])
      .filter("payload->>projectId", "eq", projectId)
      .order("created_at", { ascending: false })
      .limit(40);

    // Editor publishes carry a publish chain and no campaignId; ignore automation/Export jobs.
    const renders = (jobs || []).filter(
      (j) => j.type === "render_timeline" && !j.payload?.campaignId && j.payload?.chain?.publish,
    );
    const r = renders[0];
    if (!r) return res.json({ active: false, phase: "idle", last });

    // publish_post jobs that belong to THIS render batch (created at/after its render job).
    const posts = (jobs || []).filter(
      (j) => j.type === "publish_post" && !j.payload?.campaignId && new Date(j.created_at) >= new Date(r.created_at),
    );
    const total = posts.length || (r.payload?.chain?.publish?.accounts?.length ?? 0);

    if (r.status === "queued" || r.status === "running")
      return res.json({ active: true, phase: "rendering", progress: r.progress || 0, total, last });
    if (r.status === "failed")
      return res.json({ active: false, phase: "failed", error: r.error || "Render failed", total, jobId: r.id, finishedAt: r.finished_at, last });

    // Render done → look at the publish jobs.
    const done    = posts.filter((p) => p.status === "completed").length;
    const failed  = posts.filter((p) => p.status === "failed").length;
    const pending = posts.filter((p) => p.status === "queued" || p.status === "running").length;
    if (!posts.length || pending > 0)
      return res.json({ active: true, phase: "publishing", progress: 100, published: done, failed, total, last });
    if (failed && !done)
      return res.json({ active: false, phase: "failed", error: "Publish failed", published: done, failed, total, jobId: r.id, finishedAt: r.finished_at, last });
    return res.json({ active: false, phase: "published", published: done, failed, total, jobId: r.id, finishedAt: r.finished_at, last });
  } catch (e) { res.status(400).json({ error: e.message }); }
});
