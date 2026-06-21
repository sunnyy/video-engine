/**
 * jobs/handlers.js — registers every job-type handler. Imported once by the worker
 * on startup (side-effect import). Handlers call SHARED SERVICES directly — never the
 * Express routes — so the worker has no dependency on the HTTP layer.
 *
 * Add handlers as phases land (autopilot_generate, publish_post, …).
 */
import { registerHandler } from "./registry.js";
import { setProgress } from "./queue.js";
import { renderTimeline } from "../services/renderService.js";
import { publish } from "../services/social/service.js";
import { supabaseAdmin } from "../middleware/shared.js";

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
  const { userId, platform, videoUrl, metadata = {} } = payload || {};
  if (!userId || !platform || !videoUrl) throw new Error("publish_post: userId, platform, videoUrl required");

  // Track the attempt in published_posts (reuse the row across retries).
  let postId = payload.postId || null;
  const base = {
    user_id: userId, platform, video_url: videoUrl, status: "running",
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
