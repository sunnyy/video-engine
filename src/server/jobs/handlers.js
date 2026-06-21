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
