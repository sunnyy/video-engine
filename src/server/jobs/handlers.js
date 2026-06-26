/**
 * jobs/handlers.js — registers every job-type handler. Imported once by the worker
 * on startup (side-effect import). Handlers call SHARED SERVICES directly — never the
 * Express routes — so the worker has no dependency on the HTTP layer.
 *
 * Automation chain (all keyed by campaignId): generate_video → render_timeline → publish_post.
 */
import { registerHandler } from "./registry.js";
import { setProgress, enqueue, heartbeat, isCancelRequested } from "./queue.js";
import { renderTimeline } from "../services/renderService.js";
import { publishToAccount } from "../services/social/service.js";
import { getPipeline } from "../services/pipelines/index.js";
import { applyBrandKit } from "../../services/ai/shared/brandKit.js";
import { getCampaign, setCampaignStatus } from "../services/automation/campaigns.js";
import { getNextTopic, consumeTopic, releaseTopic, getQueuedCount, ensureTopics } from "../services/automation/topics.js";
import { checkGenerationQuota, checkPublishQuota } from "../services/automation/quotas.js";
import { logEvent } from "../services/automation/events.js";
import { CREDIT_COSTS } from "../../core/utils/creditCosts.js";
import { supabaseAdmin, deductCredits, sendUserEmail, userRenderCompleteEmail } from "../middleware/shared.js";
import { notifyUser, notifyUserById } from "../services/notificationService.js";
import { resolveAudienceIds } from "../services/announcements/audience.js";

// A cancellation "error" the worker treats as terminal (never retried).
function cancelledError() { const e = new Error("canceled by user"); e.noRetry = true; return e; }

// Watch the DB cancel flag for a running job and expose a SYNC `cancelled` boolean — render's
// isCancelled callback is sync (per-frame), and generation checks it between stages. The poll
// is cheap (cached in isCancelRequested); always stop() it in a finally.
function watchCancel(jobId) {
  const state = { cancelled: false };
  const timer = setInterval(() => { isCancelRequested(jobId).then((c) => { if (c) state.cancelled = true; }).catch(() => {}); }, 3000);
  timer.unref?.();
  return { state, stop: () => clearInterval(timer) };
}

/**
 * Charge for one generation EXACTLY ONCE per job. Idempotent: the transaction is tagged with
 * the job id, and we skip if a charge for that job already exists — so a retried or
 * hard-killed-then-resumed job can never double-charge. Returns { deduped } when already paid.
 */

// Next time the platform's daily quota resets, as an epoch ms. YouTube resets at midnight
// Pacific (07:00 UTC PDT / 08:00 UTC PST); we target 09:00 UTC so we're safely past both.
const nextQuotaResetMs = () => {
  const now = new Date();
  const t = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 9, 0, 0));
  if (t.getTime() <= now.getTime()) t.setUTCDate(t.getUTCDate() + 1);
  return t.getTime();
};

async function chargeForGeneration(userId, cost, jobId) {
  const tag = `[job:${jobId}]`;
  const { data: prior } = await supabaseAdmin.from("credit_transactions")
    .select("id").eq("user_id", userId).eq("action", "ai_video").ilike("description", `%${tag}%`).limit(1).maybeSingle();
  if (prior) return { success: true, deduped: true };
  return deductCredits(userId, cost, "ai_video", `Automation video ${tag}`, null);
}

/** Pause a campaign (cost/credit/config guard tripped) + notify its owner. */
async function pauseCampaign(campaign, reason) {
  await setCampaignStatus(campaign.id, "paused").catch(() => {});
  logEvent({ userId: campaign.user_id, campaignId: campaign.id, action: "pause", entity: "campaign", status: "info", message: reason });
  try {
    const { data: { user } } = await supabaseAdmin.auth.admin.getUserById(campaign.user_id);
    if (user?.email) {
      await sendUserEmail(user.email, `Your campaign "${campaign.name}" was paused`,
        `<p>The campaign <b>${campaign.name}</b> was paused because: <b>${reason}</b>.</p><p>Resolve it and resume the campaign to continue automatic videos.</p>`);
    }
  } catch (_) {}
  notifyUser(campaign.user_id, { type: "automation_paused", icon: "⏸️", severity: "warning", link: "/automation",
    title: `Campaign paused: ${campaign.name}`, body: `${reason}. Resolve it and resume.` });
}

/**
 * render_timeline — render a project's timeline to a durable MP4.
 * payload: { userId, campaignId?, projectId?, project?, resolution?, chain? }
 * Idempotent: renderId = job.id, so retries overwrite the same output (no duplicates).
 */
registerHandler("render_timeline", async (payload, job) => {
  const { userId, campaignId = null, projectId = null, resolution = "1080p" } = payload || {};
  if (!userId) throw new Error("render_timeline: userId required");

  let project = payload?.project;
  let projectSource = project?.meta?.source ?? null;
  if (!project && projectId) {
    const { data, error } = await supabaseAdmin
      .from("projects").select("safe_project_json, source").eq("id", projectId).single();
    if (error) throw new Error(`render_timeline: load project ${projectId} failed: ${error.message}`);
    project = data?.safe_project_json;
    projectSource = data?.source ?? project?.meta?.source ?? null; // for per-service render-engine gating
  }
  if (!project) throw new Error("render_timeline: no project or projectId in payload");

  const watch = watchCancel(job.id);
  let videoUrl, filePath;
  try {
    ({ videoUrl, filePath } = await renderTimeline(project, {
      userId, renderId: job.id, projectId, resolution, source: projectSource,
      onProgress: (pct) => setProgress(job.id, pct),
      isCancelled: () => watch.state.cancelled,
    }));
  } catch (err) {
    if (watch.state.cancelled || /RENDER_CANCELLED/.test(err.message || "")) {
      logEvent({ userId, campaignId, action: "render", entity: "project", entityId: projectId, status: "fail", message: "canceled by user" });
      throw cancelledError();
    }
    throw err;
  } finally {
    watch.stop();
  }
  if (!videoUrl) throw new Error("render_timeline: render produced no durable URL (upload failed)");

  // Chain → publish (automation only). Render never re-runs on publish failure: publish is
  // its own retried job. With auto_publish off, we record an awaiting_approval row per
  // target account and stop — the user approves later.
  if (payload?.chain?.publish && Array.isArray(payload.chain.publish.accounts) && payload.chain.publish.accounts.length) {
    const { accounts, metadata = {}, autoPublish = true } = payload.chain.publish;
    if (autoPublish) {
      for (const acct of accounts) {
        await enqueue("publish_post", { userId, campaignId, accountId: acct.id, platform: acct.platform, videoUrl, projectId, metadata }, { userId, maxAttempts: 5, priority: -10 });
      }
    } else {
      const nowIso = new Date().toISOString();
      await supabaseAdmin.from("published_posts").insert(accounts.map((acct) => ({
        user_id: userId, campaign_id: campaignId, account_id: acct.id, project_id: projectId, platform: acct.platform,
        video_url: videoUrl, status: "awaiting_approval", meta: { metadata }, created_at: nowIso, updated_at: nowIso,
      })));
      logEvent({ userId, campaignId, action: "awaiting_approval", entity: "post", entityId: projectId, status: "info", meta: { accounts: accounts.map(a => a.platform) } });
    }
  }
  logEvent({ userId, campaignId, action: "render", entity: "project", entityId: projectId, status: "ok", meta: { resolution } });

  // Manual export (no automation publish chain) → tell the user their video is ready.
  if (!payload?.chain?.publish) {
    let projectName = null;
    if (projectId) {
      const { data: pr } = await supabaseAdmin.from("projects").select("name").eq("id", projectId).maybeSingle();
      projectName = pr?.name || null;
    }
    notifyUserById(userId,
      { type: "render_complete", icon: "🎬", severity: "success",
        link: projectId ? `/video-editor/${projectId}` : "/projects",
        title: projectName ? `"${projectName}" is ready` : "Your video is ready",
        body: "Your render finished — open it to download or keep editing." },
      (name) => userRenderCompleteEmail(name, videoUrl, projectName));
  }
  return { videoUrl, filePath };
});

/**
 * publish_post — publish an ALREADY-RENDERED MP4 to a SPECIFIC connected account. Separate
 * job from render: it consumes a video URL + metadata only and NEVER regenerates/rerenders.
 * Tokens are auto-refreshed inside publishToAccount(). Transient failures retry with backoff;
 * permanent auth/permission errors (noRetry) stop retrying and flag the account.
 * payload: { userId, campaignId, accountId, platform, videoUrl, projectId?, metadata?, postId? }
 */
registerHandler("publish_post", async (payload) => {
  const { userId, campaignId = null, accountId, platform, videoUrl, projectId = null, metadata = {} } = payload || {};
  if (!userId || !accountId || !videoUrl) throw new Error("publish_post: userId, accountId, videoUrl required");

  // Idempotency: if this row already has a platform_post_id, it was uploaded — never again.
  if (payload.postId) {
    const { data: existing } = await supabaseAdmin.from("published_posts").select("platform_post_id, status").eq("id", payload.postId).maybeSingle();
    if (existing?.platform_post_id) {
      if (existing.status !== "published") await supabaseAdmin.from("published_posts").update({ status: "published" }).eq("id", payload.postId);
      logEvent({ userId, campaignId, action: "publish", entity: "post", entityId: payload.postId, status: "info", message: "deduped (already uploaded)", meta: { platform } });
      return { postId: payload.postId, platform_post_id: existing.platform_post_id, deduped: true };
    }
  }

  // Publish-quota cap → pause campaign + don't upload.
  const campaign = campaignId ? await getCampaign(campaignId) : null;
  if (campaign) {
    const pQuota = await checkPublishQuota(campaign);
    if (pQuota.exceeded) {
      if (payload.postId) await supabaseAdmin.from("published_posts").update({ status: "failed", error: pQuota.reason, updated_at: new Date().toISOString() }).eq("id", payload.postId);
      await pauseCampaign(campaign, pQuota.reason);
      const e = new Error(`Campaign paused: ${pQuota.reason}`); e.noRetry = true; throw e;
    }
  }

  // Track the attempt in published_posts (reuse the row across retries).
  let postId = payload.postId || null;
  const base = {
    user_id: userId, campaign_id: campaignId, account_id: accountId, project_id: projectId, platform,
    video_url: videoUrl, status: "running",
    scheduled_at: metadata.scheduledAt ? new Date(metadata.scheduledAt).toISOString() : null,
    updated_at: new Date().toISOString(),
  };
  if (postId) {
    await supabaseAdmin.from("published_posts").update(base).eq("id", postId);
  } else {
    const { data } = await supabaseAdmin.from("published_posts")
      .insert({ ...base, created_at: new Date().toISOString() }).select("id").single();
    postId = data?.id ?? null;
  }

  // No app-level upload cap: with BYO, each user publishes on their OWN Google project quota,
  // so we never throttle them against a shared pool.
  try {
    const result = await publishToAccount(accountId, { url: videoUrl }, metadata);
    await supabaseAdmin.from("published_posts").update({
      status: "published", platform_post_id: result.platform_post_id ?? null,
      published_at: new Date().toISOString(), meta: { ...(result.meta || {}), url: result.url || null }, error: null,
      updated_at: new Date().toISOString(),
    }).eq("id", postId);
    logEvent({ userId, campaignId, action: "publish", entity: "post", entityId: postId, status: "ok", message: result.url || null, meta: { platform, platform_post_id: result.platform_post_id ?? null } });
    notifyUser(userId, { type: "post_published", icon: "🚀", severity: "success", link: "/automation",
      title: `Published to ${platform}`, body: "Your video is now live." });
    return { postId, platform_post_id: result.platform_post_id, url: result.url };
  } catch (err) {
    if (err.quota) {
      // Temporary quota/rate limit (not an auth failure): defer to after the reset instead of
      // failing the post or flagging the account. The user's own quota frees up daily.
      await enqueue("publish_post", { ...payload, postId }, { userId, runAt: nextQuotaResetMs(), maxAttempts: 5, priority: -10 });
      if (postId) await supabaseAdmin.from("published_posts").update({ status: "deferred", error: "Daily upload quota reached — will retry after it resets", updated_at: new Date().toISOString() }).eq("id", postId);
      logEvent({ userId, campaignId, action: "publish", entity: "post", entityId: postId, status: "info", message: "deferred — upload quota reached", meta: { platform } });
      return { deferred: true, platform, postId };
    }
    await supabaseAdmin.from("published_posts").update({
      status: "failed", error: (err.message || "").slice(0, 1000), updated_at: new Date().toISOString(),
    }).eq("id", postId);
    logEvent({ userId, campaignId, action: "publish", entity: "post", entityId: postId, status: err.noRetry ? "fail" : "retry", message: err.message, meta: { platform } });
    if (err.noRetry) {
      // Permanent auth/permission failure → the account must be reconnected.
      await supabaseAdmin.from("social_accounts").update({ status: "error", updated_at: new Date().toISOString() }).eq("id", accountId);
    }
    throw err; // worker's fail() retries transient, skips retry when err.noRetry
  }
});

/**
 * generate_video — head of a campaign's chain. Loads the campaign, credit/quota-checks,
 * reserves a topic from THAT campaign's queue, runs the Prompt-to-Video pipeline, applies
 * the brand kit as a post-process, then chains → render_timeline (which chains → publish_post).
 * payload: { userId, campaignId, manual? }
 */
registerHandler("generate_video", async (payload, job) => {
  const { userId, campaignId, manual = false } = payload || {};
  if (!userId || !campaignId) throw new Error("generate_video: userId and campaignId required");

  const campaign = await getCampaign(campaignId);
  if (!campaign) { const e = new Error("generate_video: campaign not found"); e.noRetry = true; throw e; }

  // Dispatch by the campaign's service (multi-service): the registry owns the generate step,
  // this handler owns the generic tail (quota/credits/topic/brand-kit/render/publish chain).
  const pipeline = getPipeline(campaign.service || "ai_video");
  if (!pipeline) { const e = new Error(`generate_video: unknown service "${campaign.service}"`); e.noRetry = true; throw e; }
  console.log(`[generate] campaign "${campaign.name}" [${pipeline.key}] → duration=${campaign.target_duration}s style=${campaign.style_id} privacy=${campaign.privacy} accounts=${(campaign.target_accounts||[]).length}`);

  // The scheduler-driven path respects the campaign's state; "Run once" (manual) overrides it.
  if (campaign.status !== "active" && !manual) {
    logEvent({ userId, campaignId, action: "generate", entity: "campaign", status: "skip", message: `campaign ${campaign.status} — scheduler skipped` });
    return { skipped: `campaign ${campaign.status}` };
  }

  // 0) Quota cap (runaway-cost guard). Exceeded → pause + notify, nothing reserved.
  const quota = await checkGenerationQuota(campaign);
  if (quota.exceeded) {
    await pauseCampaign(campaign, quota.reason);
    const e = new Error(`Campaign paused: ${quota.reason}`); e.noRetry = true; throw e;
  }

  // 1) Affordability check up front (wallet is per-user). We do NOT charge here — the
  //    deduction happens once on success (below), so failures/hard-kills never cost credits.
  const cost = (typeof pipeline.cost === "function" ? pipeline.cost(campaign) : null) ?? CREDIT_COSTS[pipeline.creditKey] ?? CREDIT_COSTS.ai_video;
  const { data: cred } = await supabaseAdmin.from("user_credits").select("balance").eq("user_id", userId).maybeSingle();
  if ((cred?.balance ?? 0) < cost) {
    await pauseCampaign(campaign, "insufficient credits");
    const e = new Error("Campaign paused: insufficient credits"); e.noRetry = true; throw e;
  }

  // 2) Reserve a topic from this campaign's queue now (not hours in advance).
  const topic = await getNextTopic(campaign);
  if (!topic) {
    if (!campaign.niches?.length) {
      await pauseCampaign(campaign, "no niches configured");
      const e = new Error("Campaign paused: no niches"); e.noRetry = true; throw e;
    }
    await enqueue("refill_topics", { userId, campaignId }, { userId });
    throw new Error("no topic available yet — refilling"); // transient: retry
  }

  const watch = watchCancel(job.id);
  try {
    let lastHb = 0;
    const onStep = () => { if (watch.state.cancelled) throw cancelledError(); const t = Date.now(); if (t - lastHb > 15000) { lastHb = t; heartbeat(job.id); } };
    const result = await pipeline.run({ campaign, topic, userId, onStep });
    const projectId = result.projectId;

    // Brand kit as post-process — Prompt-to-Video itself is never touched. Per-campaign kit if
    // set, else fall back to the user's single kit (one-vs-many is a later decision).
    let kit = null;
    if (campaign.brand_kit_id) ({ data: kit } = await supabaseAdmin.from("brand_kits").select("*").eq("id", campaign.brand_kit_id).maybeSingle());
    if (!kit) ({ data: kit } = await supabaseAdmin.from("brand_kits").select("*").eq("user_id", userId).maybeSingle());
    if (kit) {
      const { data: proj } = await supabaseAdmin.from("projects").select("safe_project_json").eq("id", projectId).single();
      if (proj?.safe_project_json) {
        await supabaseAdmin.from("projects")
          .update({ safe_project_json: applyBrandKit(proj.safe_project_json, kit) }).eq("id", projectId);
      }
    }

    await consumeTopic(topic.id, { hook: topic.title });
    if (await getQueuedCount(campaignId) < 10) await enqueue("refill_topics", { userId, campaignId }, { userId }); // async refill

    // 3) Charge now that the video actually exists — idempotent by job id, so a retried or
    //    hard-killed-then-resumed run never double-charges.
    await chargeForGeneration(userId, cost, job.id);

    // 4) Resolve target accounts (connected only) → publish chain.
    let accounts = [];
    if (Array.isArray(campaign.target_accounts) && campaign.target_accounts.length) {
      const { data: accts } = await supabaseAdmin.from("social_accounts")
        .select("id, platform, status").in("id", campaign.target_accounts).eq("user_id", userId);
      // Self-heal: prune target ids whose account row no longer EXISTS (deleted on disconnect —
      // a reconnect creates a new id). Only drop truly-missing rows, never ones that merely exist
      // with a non-connected status (transient), so a temporary error can't wipe the targets.
      const existingIds = (accts || []).map((a) => a.id);
      if (existingIds.length !== campaign.target_accounts.length) {
        await supabaseAdmin.from("automation_campaigns")
          .update({ target_accounts: existingIds, updated_at: new Date().toISOString() })
          .eq("id", campaignId);
        console.log(`[generate] pruned ${campaign.target_accounts.length - existingIds.length} dead account id(s) from campaign ${campaignId}`);
      }
      accounts = (accts || []).filter((a) => a.status === "connected").map((a) => ({ id: a.id, platform: a.platform }));
    }
    // Publish copy from the director (AI-written title/caption/hashtags), with topic fallbacks.
    const pub = result.publish || {};
    const hashtags = Array.isArray(pub.hashtags) ? pub.hashtags.filter(Boolean) : [];
    const tags = hashtags.map((h) => String(h).replace(/^#/, "")).filter(Boolean);
    const metadata = {
      title: (pub.title || topic.title || "").slice(0, 100),
      description: [pub.description, hashtags.join(" ")].filter(Boolean).join("\n\n"),
      tags: tags.length ? tags : (topic.keywords || []),
      privacyStatus: campaign.privacy || "public",
    };
    await enqueue("render_timeline", {
      userId, campaignId, projectId,
      chain: { publish: { accounts, metadata, autoPublish: campaign.auto_publish !== false } },
    }, { userId, maxAttempts: 3, priority: -5 });

    logEvent({ userId, campaignId, action: "generate", entity: "project", entityId: projectId, status: "ok", message: topic.title, meta: { topicId: topic.id, attempt: job.attempts } });
    return { projectId, topicId: topic.id };
  } catch (err) {
    // Generation failed or was canceled → release the topic so it's freed/retried. No refund
    // needed: we charge only on success, so a failed/canceled run was never charged.
    await releaseTopic(topic.id);
    const status = err.noRetry ? "fail" : (job.attempts < job.max_attempts ? "retry" : "fail");
    logEvent({ userId, campaignId, action: "generate", entity: "topic", entityId: topic.id, status, message: err.message, meta: { attempt: job.attempts } });
    throw err;
  } finally {
    watch.stop();
  }
});

/** refill_topics — async top-up of a campaign's topic queue (never blocks the pipeline). */
registerHandler("refill_topics", async (payload) => {
  const { campaignId } = payload || {};
  if (!campaignId) throw new Error("refill_topics: campaignId required");
  const campaign = await getCampaign(campaignId);
  if (!campaign) return { added: 0, reason: "campaign not found" };
  return await ensureTopics(campaign);
});

/**
 * broadcast_announcement — fan an admin announcement out into per-user notifications.
 * payload: { announcementId }. Idempotent: a 'sent' campaign is never re-sent. Inserts in
 * batches so a large audience never blocks. Online users receive rows live via Realtime.
 */
registerHandler("broadcast_announcement", async (payload) => {
  const { announcementId } = payload || {};
  if (!announcementId) throw new Error("broadcast_announcement: announcementId required");

  const { data: a, error } = await supabaseAdmin.from("announcements").select("*").eq("id", announcementId).maybeSingle();
  if (error) throw new Error(`load announcement failed: ${error.message}`);
  if (!a) { const e = new Error("announcement not found"); e.noRetry = true; throw e; }
  if (a.status === "sent") return { deduped: true, sent: a.sent_count };

  await supabaseAdmin.from("announcements").update({ status: "sending", updated_at: new Date().toISOString() }).eq("id", announcementId);

  const ids = await resolveAudienceIds(a.audience || {});
  const now = new Date().toISOString();
  let sent = 0;
  for (let i = 0; i < ids.length; i += 500) {
    const rows = ids.slice(i, i + 500).map((uid) => ({
      user_id: uid, type: "announcement", title: a.title, body: a.body, link: a.link,
      icon: a.icon, severity: a.severity, announcement_id: a.id, created_at: now,
    }));
    const { error: insErr } = await supabaseAdmin.from("notifications").insert(rows);
    if (insErr) console.error(`[broadcast] batch insert failed: ${insErr.message}`);
    else sent += rows.length;
  }

  await supabaseAdmin.from("announcements").update({ status: "sent", sent_count: sent, updated_at: new Date().toISOString() }).eq("id", announcementId);
  return { sent };
});
