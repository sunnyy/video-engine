/**
 * renderService.js — the single, framework-agnostic timeline→MP4 renderer.
 *
 * Called by BOTH the editor export route (src/server/routes/render.js, which keeps its
 * own SSE/poll wrapper) AND the background worker (jobs/handlers.js). It knows nothing
 * about Express or HTTP — callers pass a project + options + an onProgress callback.
 *
 * Idempotent: output is keyed by `renderId`. Re-running with the same renderId
 * overwrites the same storage object and upserts the same `renders` row, so retries
 * never create duplicate files or rows. (The editor passes a unique id per export — so
 * each manual export is its own version; the worker passes the job id — so retries dedupe.)
 */
import fs from "fs";
import path from "path";
import { supabaseAdmin, TEMP_DIR, PUBLIC_DIR, PROJECT_ROOT } from "../middleware/shared.js";

// Which engine produces the MP4. "remotion" (default) = the proven Remotion path; "vidquence"
// = our own @vidquence/render engine (src/render). Per-deploy flag so we can flip a single
// service to the new engine once it passes the shadow-diff, with Remotion as the fallback.
const RENDER_ENGINE = (process.env.RENDER_ENGINE || "remotion").toLowerCase();
// Per-service cutover: a comma-list of project sources to route to @vidquence/render while every
// other service stays on Remotion — e.g. VIDQUENCE_RENDER_SERVICES="typography_video,social_video".
// RENDER_ENGINE stays the global override ("vidquence" forces ALL; default "remotion" = none).
// This is how we flip ONE service at a time and watch it, with an instant env-only rollback.
const VIDQUENCE_SERVICES = new Set(
  (process.env.VIDQUENCE_RENDER_SERVICES || "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean),
);
function pickEngine(project, source) {
  if (RENDER_ENGINE === "vidquence") return "vidquence";          // global override
  const svc = String(source || project?.meta?.source || "").toLowerCase();
  return VIDQUENCE_SERVICES.has(svc) ? "vidquence" : "remotion";  // per-service, else Remotion
}

/* ── Newest mtime under a dir (prebundle staleness detection) ── */
function newestMtimeMs(dir) {
  let newest = 0;
  try {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      const t = entry.isDirectory() ? newestMtimeMs(full) : fs.statSync(full).mtimeMs;
      if (t > newest) newest = t;
    }
  } catch {}
  return newest;
}

/* ── Bundle — prefer the committed prebundle, rebuild only if stale (local dev) ── */
async function getBundle() {
  const PREBUNDLE_DIR = path.join(PROJECT_ROOT, "remotion-bundle");
  const indexHtml     = path.join(PREBUNDLE_DIR, "index.html");
  if (fs.existsSync(indexHtml)) {
    const bundleTime = fs.statSync(indexHtml).mtimeMs;
    const srcTime    = newestMtimeMs(path.join(PROJECT_ROOT, "src", "remotion"));
    if (srcTime <= bundleTime) return PREBUNDLE_DIR;
    console.warn("[render] prebundle is older than src/remotion — rebuilding at runtime. Run `npm run prebundle` and commit before deploy.");
  }
  const { bundle } = await import("@remotion/bundler");
  return bundle({ entryPoint: path.join(PROJECT_ROOT, "src/remotion/Root.jsx"), publicDir: PUBLIC_DIR });
}

/* ── Sanitise an asset URL for Remotion's sandboxed Chrome ── */
function resolveAssetUrl(url) {
  if (!url) return url;
  if (url.startsWith("blob:")) return null;
  if (url.includes("/api/proxy-video?url=")) {
    try { return new URL(url, "http://localhost").searchParams.get("url") || null; }
    catch { return null; }
  }
  return url;
}

/* ── Prepare a project for render: drop unresolvable assets, cap duration, watermark ── */
async function prepareProject(project, userId) {
  const cleanLayers = (project?.layers || [])
    .map((layer) => ({ ...layer, src: resolveAssetUrl(layer.src) }))
    .filter((layer) => (layer.type === "image" || layer.type === "sticker") ? !!layer.src : true);

  const visualLayers = cleanLayers.filter((l) => l.type !== "audio");
  const maxVisualEnd = visualLayers.length > 0
    ? Math.max(...visualLayers.map((l) => l.end ?? 0))
    : (project?.format?.duration || 30);
  const cappedDuration = Math.min(project?.format?.duration || 30, maxVisualEnd);

  let finalProject = {
    ...project,
    layers: cleanLayers,
    format: { ...project?.format, duration: Math.max(1, cappedDuration) },
  };

  // Watermark for free users; admins and active subscribers are exempt.
  try {
    let exempt = false;
    try {
      const { data: { user } } = await supabaseAdmin.auth.admin.getUserById(userId);
      if (user?.app_metadata?.role === "admin") exempt = true;
    } catch (_) {}
    if (!exempt) {
      const { data: sub } = await supabaseAdmin
        .from("subscriptions").select("id").eq("user_id", userId).eq("status", "active").maybeSingle();
      if (sub) exempt = true;
    }
    if (!exempt) finalProject = { ...finalProject, meta: { ...finalProject.meta, showWatermark: true } };
  } catch (_) {}

  return finalProject;
}

/**
 * renderTimeline(project, opts) → { videoUrl, filePath, outputPath, renderId }
 *
 * opts: { userId, renderId, resolution?="1080p", projectId?=null, onProgress?(pct), isCancelled?() }
 * - onProgress is called 0→90 during frame render, then 100 after upload.
 * - isCancelled() (optional) is polled per frame; returning true aborts with RENDER_CANCELLED.
 * - On success the local file is removed and a durable Supabase `video_url` is returned.
 *   If the upload fails, `outputPath` (local mp4) is returned so a caller can still serve it.
 * Throws on render failure (caller decides retry/refund). Frame temp dir is always cleaned.
 */
export async function renderTimeline(project, { userId, renderId, resolution = "1080p", projectId = null, source = null, onProgress, isCancelled } = {}) {
  if (!userId)   throw new Error("renderTimeline: userId required");
  if (!renderId) throw new Error("renderTimeline: renderId required");

  const finalProject = await prepareProject(project, userId);

  const fmt    = finalProject.format || {};
  const scale  = resolution === "4k" ? 2 : 1;
  const width  = (fmt.width || 1080) * scale;
  const height = (fmt.height || 1920) * scale;
  const outputPath = path.join(TEMP_DIR, `render-${renderId}.mp4`);

  if (pickEngine(finalProject, source) === "vidquence") {
    // @vidquence/render — our own engine. Produces the MP4 at outputPath; the shared upload +
    // record block below handles persistence identically to the Remotion path.
    const { renderToFile } = await import("../../render/index.js");
    await renderToFile(finalProject, {
      outputPath, renderId,
      width: (fmt.width || 1080), height: (fmt.height || 1920), scale, fps: fmt.fps || 30,
      onProgress: (p) => onProgress?.(Math.round(p * 0.9)), // reserve 90→100 for upload
      isCancelled,
    });
  } else {
    const serveUrl = await getBundle();
    const { getCompositions, renderFrames, stitchFramesToVideo, makeCancelSignal } = await import("@remotion/renderer");
    const comps = await getCompositions(serveUrl, { inputProps: { project: finalProject } });
    const comp  = comps.find((c) => c.id === "TimelineComposition");
    if (!comp) throw new Error("TimelineComposition not found in bundle");
    const compositionWithRes = { ...comp, width, height };

    const framesDir  = path.join(TEMP_DIR, `frames-${renderId}`);
    if (!fs.existsSync(framesDir)) fs.mkdirSync(framesDir, { recursive: true });

    // Clean cancellation: poll isCancelled() and trip Remotion's cancel signal. (Throwing inside
    // onFrameUpdate instead crashes the Chromium tab — "browser crashed, retrying" + the static
    // server tearing down → ERR_CONNECTION_REFUSED noise.) A cancelSignal is single-use, so we
    // make a fresh one per stage and point the poller at whichever stage is currently active.
    let wasCancelled = false;
    let currentCancel = null;
    const cancelPoll = isCancelled
      ? setInterval(() => { try { if (isCancelled()) { wasCancelled = true; currentCancel?.(); } } catch {} }, 500)
      : null;

    try {
      const hasVideoLayers = (finalProject.layers || []).some((l) => l.type === "video");
      let rendered = 0;

      const rf = makeCancelSignal();
      currentCancel = rf.cancel;
      const { assetsInfo } = await renderFrames({
        composition: compositionWithRes,
        serveUrl,
        inputProps: { project: finalProject },
        outputDir: framesDir,
        imageFormat: "jpeg",
        concurrency: hasVideoLayers ? 1 : 2,
        chromiumOptions: { gl: "angle" },
        cancelSignal: rf.cancelSignal,
        onFrameUpdate: () => {
          rendered++;
          onProgress?.(Math.round((rendered / comp.durationInFrames) * 90));
        },
      });

      const sf = makeCancelSignal();
      currentCancel = sf.cancel;
      if (wasCancelled) throw new Error("RENDER_CANCELLED"); // cancelled between stages
      await stitchFramesToVideo({
        composition: compositionWithRes,
        serveUrl,
        inputProps: { project: finalProject },
        codec: "h264",
        crf: 23, // ~visually-lossless for short-form; ~40-50% smaller than Remotion's default (18)
        assetsInfo,
        outputLocation: outputPath,
        fps: comp.fps,
        width,
        height,
        cancelSignal: sf.cancelSignal,
      });
    } catch (e) {
      if (wasCancelled || /cancel/i.test(e?.message || "")) throw new Error("RENDER_CANCELLED");
      throw e;
    } finally {
      if (cancelPoll) clearInterval(cancelPoll);
      try { fs.rmSync(framesDir, { recursive: true, force: true }); } catch {}
    }
  }

  // Upload + record (idempotent: deterministic key + upsert on renders.id = renderId).
  const storageKey = `renders/${userId}/render-${renderId}.mp4`;
  let videoUrl = null;
  try {
    const buf = fs.readFileSync(outputPath);
    const { error: upErr } = await supabaseAdmin.storage
      .from("user-assets").upload(storageKey, buf, { contentType: "video/mp4", upsert: true });
    if (upErr) throw new Error(upErr.message);
    videoUrl = supabaseAdmin.storage.from("user-assets").getPublicUrl(storageKey).data.publicUrl;
    await supabaseAdmin.from("renders").upsert({
      id: renderId, project_id: projectId, user_id: userId,
      video_url: videoUrl, status: "done", file_path: storageKey,
      created_at: new Date().toISOString(),
    }, { onConflict: "id" });
    try { fs.unlinkSync(outputPath); } catch {}
  } catch (e) {
    console.warn("[renderService] upload/save failed (keeping local file):", e.message);
  }

  onProgress?.(100);
  return { videoUrl, filePath: storageKey, outputPath: videoUrl ? null : outputPath, renderId };
}
