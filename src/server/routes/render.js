import express from "express";
import fs from "fs";
import path from "path";
import {
  supabaseAdmin, requireAuth, deductCredits,
  TEMP_DIR, PUBLIC_DIR, PROJECT_ROOT, uuidv4,
  sendUserEmail, userRenderCompleteEmail,
} from "../middleware/shared.js";

export const router = express.Router();

const renderJobs = {};

/* ── Persist job state to disk so status survives server restarts / multi-instance ── */
function jobPath(jobId) { return path.join(TEMP_DIR, `job-${jobId}.json`); }

function writeJob(jobId, state) {
  renderJobs[jobId] = state;
  try { fs.writeFileSync(jobPath(jobId), JSON.stringify({ ...state, _ts: Date.now() })); } catch {}
}

function readJob(jobId) {
  if (renderJobs[jobId]) return renderJobs[jobId];
  try {
    const data = JSON.parse(fs.readFileSync(jobPath(jobId), "utf8"));
    // In-progress job whose heartbeat is stale (>3 min) = server restart killed the render
    if (!data.done && data._ts && Date.now() - data._ts > 180_000) {
      return { ...data, done: true, error: "Render was interrupted — please try again" };
    }
    renderJobs[jobId] = data;
    return data;
  } catch {
    return null;
  }
}

/* ── Bundle — rebuilt on every render so code changes are always picked up ── */
async function getBundle() {
  // Prefer the pre-built bundle (generated locally via `npm run prebundle`).
  // This avoids spawning esbuild at runtime, which crashes on restricted hosts.
  const PREBUNDLE_DIR = path.join(PROJECT_ROOT, "remotion-bundle");
  if (fs.existsSync(path.join(PREBUNDLE_DIR, "index.html"))) {
    console.log("[bundle] Using pre-built bundle at:", PREBUNDLE_DIR);
    return PREBUNDLE_DIR;
  }
  // Fallback: build at runtime (local dev only).
  const { bundle } = await import("@remotion/bundler");
  console.log("[bundle] Building bundle at runtime (dev only)...");
  const result = await bundle({
    entryPoint: path.join(PROJECT_ROOT, "src/remotion/Root.jsx"),
    publicDir:  PUBLIC_DIR,
  });
  console.log("[bundle] Done:", result);
  return result;
}

/* ── Sanitise asset URL for Remotion's Chrome subprocess ──
   Chrome runs sandboxed and cannot reach the Express server on localhost.
   Supabase / CDN HTTPS URLs are fetched directly by Chrome — no local caching needed.
   blob: URLs are unusable; return null so the zone renders without an asset. */
function resolveAssetUrl(url) {
  if (!url) return url;
  if (url.startsWith("blob:")) return null;
  // Unwrap legacy proxy URLs — Chrome can fetch Pixabay CDN directly over HTTPS
  if (url.includes("/api/proxy-video?url=")) {
    try {
      const inner = new URL(url, "http://localhost").searchParams.get("url");
      return inner || null;
    } catch { return null; }
  }
  return url;
}


/* ---------------- RENDER ---------------- */
router.post("/", requireAuth, async (req, res) => {
  const deduction = await deductCredits(req.user.id, 8, "export_local", "Local render export", req.body.project?.id);
  if (!deduction.success) return res.status(402).json({ error: "Insufficient credits", code: "NO_CREDITS" });

  const jobId = uuidv4();
  writeJob(jobId, { progress: 0, done: false, url: null, error: null, cancelled: false });
  res.json({ success: true, jobId });

  try {
    let { project } = req.body;

    /* ── 0. Clamp transition durations — never let a transition exceed 80% of its beat ── */
    if (project?.beats) {
      project = {
        ...project,
        beats: project.beats.map((beat) => {
          const beatDuration = (beat.end_sec ?? 0) - (beat.start_sec ?? 0);
          const maxTransition = beatDuration * 0.8;
          if (beat.transition?.duration && beatDuration > 0 && beat.transition.duration > maxTransition) {
            return { ...beat, transition: { ...beat.transition, duration: Math.round(maxTransition * 100) / 100 } };
          }
          return beat;
        }),
      };
    }

    console.log("[render] Job", jobId, "— resolving asset URLs...");
    const tempFiles = []; // track temp files to clean up after render

    /* ── 1. Sanitise asset URLs (blob: → null; HTTPS passed directly to Chrome) ── */
    if (project?.beats) {
      project.beats = project.beats.map((beat) => {
        const zones = { ...beat.zones };
        for (const key of Object.keys(zones)) {
          const zone = zones[key];
          const src  = zone?.content?.asset?.src;
          if (src) {
            const resolved = resolveAssetUrl(src);
            if (resolved !== src) {
              zones[key] = { ...zone, content: { ...zone.content, asset: { ...zone.content.asset, src: resolved } } };
            }
          }
        }
        return { ...beat, zones };
      });
    }

    console.log("[render] audio.music:", JSON.stringify(project?.audio?.music));

    /* ── 2. Resolve music src ── */
    if (project?.audio?.music) {
      const { src, musicKey } = project.audio.music;
      if (src?.startsWith("blob:")) {
        // Blob URLs can't be fetched by Chrome — drop the music
        project.audio.music = null;
      } else if (musicKey) {
        // Legacy: project stored a key instead of a URL — look it up in DB
        try {
          const { data: track } = await supabaseAdmin
            .from("music_tracks")
            .select("public_url")
            .eq("key", musicKey)
            .eq("is_active", true)
            .maybeSingle();
          if (track?.public_url) {
            project.audio.music = { ...project.audio.music, src: track.public_url, musicKey: null };
            console.log("[render] Music (legacy key) resolved to:", track.public_url);
          } else {
            console.warn("[render] Legacy music key not found in DB:", musicKey);
            project.audio.music = null;
          }
        } catch (e) {
          console.warn("[render] Legacy music DB lookup failed:", e.message);
          project.audio.music = null;
        }
      }
      // HTTPS src passes through as-is — Chrome fetches it directly.
    }

    /* ── 2.5. Resolve SFX keys in beats from Supabase DB ── */
    if (project?.beats?.length) {
      const sfxKeys = [...new Set(
        project.beats.flatMap(b => (b.sfx || []).map(s => s.key).filter(Boolean))
      )];
      if (sfxKeys.length) {
        try {
          const { data: sfxRows } = await supabaseAdmin
            .from("sfx_tracks")
            .select("key, public_url")
            .in("key", sfxKeys)
            .eq("is_active", true);
          const sfxMap = Object.fromEntries((sfxRows || []).map(r => [r.key, r.public_url]));
          project.beats = project.beats.map(beat => {
            if (!beat.sfx?.length) return beat;
            return {
              ...beat,
              sfx: beat.sfx.map(sfxItem =>
                sfxItem.key && sfxMap[sfxItem.key]
                  ? { ...sfxItem, src: sfxMap[sfxItem.key] }
                  : sfxItem
              ),
            };
          });
          console.log(`[render] Resolved ${sfxKeys.length} SFX keys`);
        } catch (e) {
          console.warn("[render] SFX resolution failed:", e.message);
        }
      }
    }

    /* ── 3. Clean blob URLs from avatar ── */
    if (project?.avatar?.src?.startsWith("blob:")) project.avatar.src = null;

    /* ── 3.5. Embed layout definitions so Remotion never needs Supabase inside Chromium ── */
    try {
      const layoutIds = [...new Set((project.beats || []).map(b => b.layout).filter(Boolean))];
      if (layoutIds.length > 0) {
        const { data: layoutRows } = await supabaseAdmin
          .from("layouts")
          .select("*")
          .in("id", layoutIds);
        if (layoutRows?.length) {
          const layoutDefs = Object.fromEntries(layoutRows.map(r => [r.id, r]));
          project = { ...project, meta: { ...project.meta, layoutDefs } };
          console.log(`[render] Embedded ${layoutRows.length} layout defs into inputProps`);
        }
      }
    } catch (e) {
      console.warn("[render] Failed to embed layout defs:", e.message);
    }

    /* ── 3.6. Watermark for free users ── */
    try {
      const { data: sub } = await supabaseAdmin
        .from("subscriptions")
        .select("id")
        .eq("user_id", req.user.id)
        .eq("status", "active")
        .maybeSingle();
      if (!sub) {
        project = { ...project, meta: { ...project.meta, showWatermark: true } };
        console.log("[render] Free user — watermark enabled");
      }
    } catch (e) {
      console.warn("[render] Subscription check failed:", e.message);
    }

    /* ── 4. Get cached bundle ── */
    const serveUrl = await getBundle();

    /* ── 5. Get composition ── */
    const { getCompositions, renderFrames, stitchFramesToVideo } = await import("@remotion/renderer");
    const comps = await getCompositions(serveUrl, { inputProps: { project } });
    const comp  = comps.find((c) => c.id === "VideoComposition");
    if (!comp) throw new Error("VideoComposition not found");

    const outputPath = path.join(TEMP_DIR, `render-${jobId}.mp4`);
    const framesDir  = path.join(TEMP_DIR, `frames-${jobId}`);
    if (!fs.existsSync(framesDir)) fs.mkdirSync(framesDir, { recursive: true });

    console.log("[render] Rendering frames...");

    const hasVideoAssets = (project.beats || []).some(b =>
      Object.values(b.zones || {}).some(z => z?.content?.asset?.type === "video")
    );

    let rendered = 0;
    const { assetsInfo } = await renderFrames({
      composition:  comp,
      serveUrl,
      inputProps:   { project },
      outputDir:    framesDir,
      imageFormat:  "jpeg",
      concurrency:  hasVideoAssets ? 1 : 2,
      chromiumOptions: {
        gl: "angle",          // enables GPU compositing — required for mix-blend-mode, CSS masks, filters
      },
      onFrameUpdate: () => {
        if (renderJobs[jobId]?.cancelled) throw new Error("RENDER_CANCELLED");
        rendered++;
        const pct = Math.round((rendered / comp.durationInFrames) * 90);
        renderJobs[jobId].progress = pct;
        // Write to disk every 10% so status survives restarts
        if (pct % 10 === 0) writeJob(jobId, renderJobs[jobId]);
      },
    });

    console.log("[render] Stitching video...");

    await stitchFramesToVideo({
      composition:    comp,
      serveUrl,
      inputProps:     { project },
      codec:          "h264",
      assetsInfo,
      outputLocation: outputPath,
      fps:            comp.fps,
      width:          comp.width,
      height:         comp.height,
    });

    /* ── 6. Cleanup frames + cached assets ── */
    fs.rmSync(framesDir, { recursive: true, force: true });
    tempFiles.forEach(f => { try { fs.unlinkSync(f); } catch {} });
    console.log("[render] Cleaned", tempFiles.length, "temp files");

    /* ── 7. Upload render to Supabase storage + save DB record ── */
    let videoUrl = null;
    try {
      const storageKey  = `renders/${req.user.id}/render-${jobId}.mp4`;
      const videoBuffer = fs.readFileSync(outputPath);
      const { error: storageErr } = await supabaseAdmin.storage
        .from("user-assets")
        .upload(storageKey, videoBuffer, { contentType: "video/mp4", upsert: false });
      if (storageErr) {
        console.warn("[render] Storage upload failed:", storageErr.message);
      } else {
        const { data: { publicUrl } } = supabaseAdmin.storage
          .from("user-assets")
          .getPublicUrl(storageKey);
        videoUrl = publicUrl;
        const projectId = req.body.projectId || req.body.project?.id || null;
        await supabaseAdmin.from("renders").insert([{
          project_id: projectId,
          user_id:    req.user.id,
          video_url:  videoUrl,
          status:     "done",
          file_path:  storageKey,
          created_at: new Date().toISOString(),
        }]);
        console.log("[render] Saved to storage + DB:", videoUrl);

        // Render complete email (fire-and-forget)
        Promise.all([
          supabaseAdmin.auth.admin.getUserById(req.user.id),
          projectId ? supabaseAdmin.from("projects").select("name").eq("id", projectId).single() : Promise.resolve({ data: null }),
        ]).then(([{ data: { user } }, { data: proj }]) => {
          if (!user?.email) return;
          const name = user.user_metadata?.full_name || user.user_metadata?.name || "";
          const { subject, html } = userRenderCompleteEmail(name, publicUrl, proj?.name || null);
          sendUserEmail(user.email, subject, html);
        }).catch(() => {});
      }
    } catch (e) {
      console.warn("[render] Post-render save failed:", e.message);
    }

    writeJob(jobId, {
      progress:  100,
      done:      true,
      url:       `http://localhost:${process.env.PORT || 5000}/api/render/download/${jobId}`,
      video_url: videoUrl,
      error:     null,
    });
    console.log("[render] Done:", jobId);

  } catch (err) {
    if (err.message === "RENDER_CANCELLED") {
      console.log("[render] Cancelled:", jobId);
      writeJob(jobId, { progress: 0, done: true, url: null, error: null, cancelled: true });
    } else {
      console.error("[render] Failed:", err.message);
      writeJob(jobId, { progress: 0, done: true, url: null, error: err.message });
    }
  }
});

router.post("/cancel", requireAuth, (req, res) => {
  const { jobId } = req.body;
  const job = readJob(jobId);
  if (!jobId || !job) return res.status(404).json({ error: "Job not found" });
  writeJob(jobId, { ...job, cancelled: true });
  res.json({ success: true });
});

router.get("/status/:jobId", requireAuth, (req, res) => {
  const job = readJob(req.params.jobId);
  if (!job) return res.status(404).json({ error: "Job not found" });
  res.json(job);
});

/* Stream render output to client and delete immediately after download */
router.get("/download/:jobId", requireAuth, (req, res) => {
  const { jobId } = req.params;
  const filePath = path.join(TEMP_DIR, `render-${jobId}.mp4`);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: "File not found" });
  res.setHeader("Content-Type", "video/mp4");
  res.setHeader("Content-Disposition", `attachment; filename="video-${jobId}.mp4"`);
  const stream = fs.createReadStream(filePath);
  stream.pipe(res);
  res.on("finish", () => {
    try { fs.unlinkSync(filePath); } catch {}
    try { fs.unlinkSync(jobPath(jobId)); } catch {}
    delete renderJobs[jobId];
    console.log("[render] Deleted output after download:", `render-${jobId}.mp4`);
  });
});
