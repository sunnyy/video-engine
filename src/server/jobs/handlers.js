/**
 * jobs/handlers.js — registers every job-type handler. Imported once by the worker
 * on startup (side-effect import). Handlers call SHARED SERVICES directly — never the
 * Express routes — so the worker has no dependency on the HTTP layer.
 *
 * Add handlers as phases land (autopilot_generate, publish_post, …).
 */
import { registerHandler } from "./registry.js";
import { setProgress, enqueue } from "./queue.js";
import { renderTimeline } from "../services/renderService.js";
import { publish } from "../services/social/service.js";
import { runPromptPipeline } from "../../services/ai/promptVideo/pipelineOrchestrator.js";
import { applyBrandKit } from "../../services/ai/shared/brandKit.js";
import { getSettings, saveSettings } from "../services/autopilot/settings.js";
import { getNextTopic, consumeTopic, releaseTopic, getQueuedCount, ensureTopics } from "../services/autopilot/topics.js";
import { CREDIT_COSTS } from "../../core/utils/creditCosts.js";
import { supabaseAdmin, deductCredits, addCredits, sendUserEmail } from "../middleware/shared.js";

const AUTOPILOT_DURATION = 40; // short-form default (seconds)

async function pauseAutopilot(userId, reason) {
  await saveSettings(userId, { enabled: false }).catch(() => {});
  try {
    const { data: { user } } = await supabaseAdmin.auth.admin.getUserById(userId);
    if (user?.email) {
      await sendUserEmail(user.email, "Your AutoPilot was paused",
        `<p>AutoPilot has been paused because: <b>${reason}</b>.</p><p>Resolve it and re-enable AutoPilot to resume automatic videos.</p>`);
    }
  } catch (_) {}
}

/**
 * render_timeline — render a project's timeline to a durable MP4.
 * payload: { userId, projectId?, project?, resolution? }
 *   - pass `project` (timeline JSON) directly, or `projectId` to load safe_project_json.
 * Idempotent: renderId = job.id, so retries overwrite the same output (no duplicates).
 */
registerHandler("render_timeline", async (payload, job) => {
  const { userId, projectId = null, resolution = "1080p" } = payload || {};
  if (!userId) throw new Error("render_timeline: userId required");

  let project = payload?.project;
  if (!project && projectId) {
    const { data, error } = await supabaseAdmin
      .from("projects").select("safe_project_json").eq("id", projectId).single();
    if (error) throw new Error(`render_timeline: load project ${projectId} failed: ${error.message}`);
    project = data?.safe_project_json;
  }
  if (!project) throw new Error("render_timeline: no project or projectId in payload");

  const { videoUrl, filePath } = await renderTimeline(project, {
    userId, renderId: job.id, projectId, resolution,
    onProgress: (pct) => setProgress(job.id, pct),
  });
  if (!videoUrl) throw new Error("render_timeline: render produced no durable URL (upload failed)");

  // Chain → publish (autopilot only). Render never re-runs on publish failure: publish is
  // its own retried job. With auto_publish off, we record an awaiting_approval row per
  // platform and stop — the user approves later (POST /api/autopilot/approve).
  if (payload?.chain?.publish && Array.isArray(payload.chain.publish.platforms) && payload.chain.publish.platforms.length) {
    const { platforms, metadata = {}, autoPublish = true } = payload.chain.publish;
    if (autoPublish) {
      for (const platform of platforms) {
        await enqueue("publish_post", { userId, platform, videoUrl, projectId, metadata }, { userId, maxAttempts: 5 });
      }
    } else {
      const nowIso = new Date().toISOString();
      await supabaseAdmin.from("published_posts").insert(platforms.map((platform) => ({
        user_id: userId, project_id: projectId, platform, video_url: videoUrl,
        status: "awaiting_approval", meta: { metadata }, created_at: nowIso, updated_at: nowIso,
      })));
    }
  }
  return { videoUrl, filePath };
});

/**
 * publish_post — publish an ALREADY-RENDERED MP4 to a platform. Separate job from render:
 * it consumes a video URL + metadata only and NEVER regenerates/rerenders. Tokens are
 * auto-refreshed inside publish(). Transient failures retry with backoff; permanent
 * auth/permission errors (noRetry) stop retrying and flag the account for reconnection.
 * payload: { userId, platform, videoUrl, metadata?, postId? }
 *   metadata: { title, description, tags[], privacyStatus, scheduledAt, categoryId }
 */
registerHandler("publish_post", async (payload) => {
  const { userId, platform, videoUrl, projectId = null, metadata = {} } = payload || {};
  if (!userId || !platform || !videoUrl) throw new Error("publish_post: userId, platform, videoUrl required");

  // Track the attempt in published_posts (reuse the row across retries).
  let postId = payload.postId || null;
  const base = {
    user_id: userId, project_id: projectId, platform, video_url: videoUrl, status: "running",
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

  try {
    const result = await publish(userId, platform, { url: videoUrl }, metadata);
    await supabaseAdmin.from("published_posts").update({
      status: "published", platform_post_id: result.platform_post_id ?? null,
      published_at: new Date().toISOString(), meta: result.meta ?? null, error: null,
      updated_at: new Date().toISOString(),
    }).eq("id", postId);
    return { postId, platform_post_id: result.platform_post_id, url: result.url };
  } catch (err) {
    await supabaseAdmin.from("published_posts").update({
      status: "failed", error: (err.message || "").slice(0, 1000), updated_at: new Date().toISOString(),
    }).eq("id", postId);
    if (err.noRetry) {
      // Permanent auth/permission failure → the account must be reconnected.
      await supabaseAdmin.from("social_accounts").update({ status: "error", updated_at: new Date().toISOString() })
        .eq("user_id", userId).eq("platform", platform);
    }
    throw err; // worker's fail() retries transient, skips retry when err.noRetry
  }
});

/**
 * generate_video — the head of the AutoPilot chain. Credit-checks, reserves a topic ONLY
 * now (worker is ready), runs the existing Prompt-to-Video pipeline, applies the brand kit
 * as a post-process, then chains → render_timeline (which chains → publish_post).
 * payload: { userId }
 */
registerHandler("generate_video", async (payload) => {
  const { userId } = payload || {};
  if (!userId) throw new Error("generate_video: userId required");

  const settings = await getSettings(userId);
  if (!settings.enabled) return { skipped: "autopilot disabled" };

  // 1) Credit check BEFORE reserving a topic. Insufficient → pause + notify, topic stays queued.
  const cost = CREDIT_COSTS.ai_video;
  const { data: cred } = await supabaseAdmin.from("user_credits").select("balance").eq("user_id", userId).maybeSingle();
  if ((cred?.balance ?? 0) < cost) {
    await pauseAutopilot(userId, "insufficient credits");
    const e = new Error("AutoPilot paused: insufficient credits"); e.noRetry = true; throw e;
  }

  // 2) Reserve a topic now (not hours in advance).
  const topic = await getNextTopic(userId);
  if (!topic) {
    if (!settings.niches?.length) {
      await pauseAutopilot(userId, "no niches configured");
      const e = new Error("AutoPilot paused: no niches"); e.noRetry = true; throw e;
    }
    await enqueue("refill_topics", { userId }, { userId });
    throw new Error("no topic available yet — refilling"); // transient: retry
  }

  // 3) Deduct credits for the generation.
  const ded = await deductCredits(userId, cost, "ai_video", "AutoPilot video", null);
  if (!ded.success) { await releaseTopic(topic.id); throw new Error("credit deduction failed"); }

  try {
    const result = await runPromptPipeline({
      prompt: topic.title, userId,
      styleId: settings.style_id || "auto",
      targetDuration: AUTOPILOT_DURATION,
      language: settings.language || "en",
      voiceId: settings.voice_id || null,
      orientation: settings.orientation || "9:16",
      plan: null,
    }, () => {});
    const projectId = result.projectId;

    // Brand kit as post-process — Prompt-to-Video itself is never touched.
    const { data: kit } = await supabaseAdmin.from("brand_kits").select("*").eq("user_id", userId).maybeSingle();
    if (kit) {
      const { data: proj } = await supabaseAdmin.from("projects").select("safe_project_json").eq("id", projectId).single();
      if (proj?.safe_project_json) {
        await supabaseAdmin.from("projects")
          .update({ safe_project_json: applyBrandKit(proj.safe_project_json, kit) }).eq("id", projectId);
      }
    }

    await consumeTopic(topic.id, { hook: topic.title });
    if (await getQueuedCount(userId) < 10) await enqueue("refill_topics", { userId }, { userId }); // async refill

    // 4) Chain → render → publish. project_id travels with the chain.
    const metadata = {
      title: topic.title.slice(0, 100),
      description: settings.website ? `${settings.website}` : "",
      tags: topic.keywords || [],
      privacyStatus: "public",
    };
    await enqueue("render_timeline", {
      userId, projectId,
      chain: { publish: { platforms: settings.platforms || [], metadata, autoPublish: settings.auto_publish !== false } },
    }, { userId, maxAttempts: 3 });

    return { projectId, topicId: topic.id };
  } catch (err) {
    // Generation failed → release topic + refund + retry per job policy.
    await releaseTopic(topic.id);
    await addCredits(userId, cost, "refund", "ai_failure_refund", "AutoPilot generation failed").catch(() => {});
    throw err;
  }
});

/** refill_topics — async top-up of the topic queue (never blocks the pipeline). */
registerHandler("refill_topics", async (payload) => {
  const { userId } = payload || {};
  if (!userId) throw new Error("refill_topics: userId required");
  return await ensureTopics(userId);
});
