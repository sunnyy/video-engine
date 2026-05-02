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

/* ── Download external image to local temp ── */
async function cacheExternalImage(url) {
  if (!url) return url;
  if (url.startsWith("blob:")) return null;
  if (url.startsWith("http://localhost")) return url;
  if (!url.startsWith("http")) return url;
  try {
    const res    = await fetch(url);
    if (!res.ok) return url;
    const buffer = Buffer.from(await res.arrayBuffer());
    const ext    = url.split("?")[0].split(".").pop()?.split("/")[0] || "jpg";
    const safe   = ["jpg","jpeg","png","webp","mp4","webm"].includes(ext) ? ext : "jpg";
    const fname  = `img-${Date.now()}-${Math.random().toString(36).slice(2)}.${safe}`;
    fs.writeFileSync(path.join(TEMP_DIR, fname), buffer);
    return `http://localhost:${process.env.PORT || 5000}/renders/${fname}`;
  } catch (e) {
    console.warn("[render] Failed to cache:", url, e.message);
    return url;
  }
}

/* ── Music key to filename map ── */
const MUSIC_FILENAMES = {
  eliveta_1:    "eliveta491190.mp3",
  eliveta_2:    "eliveta491224.mp3",
  loksii:       "loksii.mp3",
  mood_mode:    "mood_mode.mp3",
  nastelbom:    "nastelbom.mp3",
  the_mountain: "the_mountain.mp3",
};
function getMusicFilename(key) { return MUSIC_FILENAMES[key] || `${key}.mp3`; }

/* ---------------- RENDER ---------------- */
router.post("/", requireAuth, async (req, res) => {
  const deduction = await deductCredits(req.user.id, 8, "export_local", "Local render export", req.body.project?.id);
  if (!deduction.success) return res.status(402).json({ error: "Insufficient credits", code: "NO_CREDITS" });

  const jobId = uuidv4();
  renderJobs[jobId] = { progress: 0, done: false, url: null, error: null, cancelled: false };
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

    console.log("[render] Job", jobId, "— caching external assets...");
    const tempFiles = []; // track all temp files to clean up after render

    /* ── 1. Cache all external images locally ── */
    if (project?.beats) {
      project.beats = await Promise.all(project.beats.map(async (beat) => {
        const zones = { ...beat.zones };
        await Promise.all(Object.keys(zones).map(async (key) => {
          const zone = zones[key];
          const src  = zone?.content?.asset?.src;
          if (src && src.startsWith("http") && !src.startsWith("http://localhost")) {
            const cached = await cacheExternalImage(src);
            if (cached !== src) {
              const fname = cached.split("/renders/")[1];
              if (fname) tempFiles.push(path.join(TEMP_DIR, fname));
            }
            zones[key] = {
              ...zone,
              content: { ...zone.content, asset: { ...zone.content.asset, src: cached } }
            };
          }
        }));
        return { ...beat, zones };
      }));
    }

    console.log("[render] audio.music:", JSON.stringify(project?.audio?.music));

    /* ── 2. Cache local music/sfx files to temp so Remotion can serve them ── */
    if (project?.audio?.music) {
      const musicKey = project.audio.music.musicKey;
      if (musicKey) {
        // Library music — copy from public/music/ to temp and use localhost URL
        const musicFilename = getMusicFilename(musicKey);
        const musicFile = path.join(PUBLIC_DIR, "music", musicFilename);
        console.log("[render] Copying music:", musicFile, "exists:", fs.existsSync(musicFile));
        if (fs.existsSync(musicFile)) {
          const fname = `music-${Date.now()}.mp3`;
          const destPath = path.join(TEMP_DIR, fname);
          fs.copyFileSync(musicFile, destPath);
          project.audio.music = {
            ...project.audio.music,
            src:      `http://localhost:${process.env.PORT || 5000}/renders/${fname}`,
            musicKey: null,
          };
          tempFiles.push(path.join(TEMP_DIR, fname));
          console.log("[render] Music copied to:", project.audio.music.src);
        } else {
          console.warn("[render] Music file not found:", musicFile);
          project.audio.music = null; // remove broken music
        }
      } else if (project.audio.music.src?.includes("/music/")) {
        // src still points to /music/ path — also copy
        const musicFilename = path.basename(project.audio.music.src);
        const musicFile = path.join(PUBLIC_DIR, "music", musicFilename);
        if (fs.existsSync(musicFile)) {
          const fname = `music-${Date.now()}.mp3`;
          fs.copyFileSync(musicFile, path.join(TEMP_DIR, fname));
          project.audio.music.src = `http://localhost:${process.env.PORT || 5000}/renders/${fname}`;
          tempFiles.push(path.join(TEMP_DIR, fname));
          console.log("[render] Music (by src) copied to:", project.audio.music.src);
        }
      }
    }

    /* ── 3. Clean blob URLs ── */
    const clean = (url) => (typeof url === "string" && url.startsWith("blob:") ? null : url);
    if (project?.audio?.music?.src && !project.audio.music.musicKey) {
      project.audio.music.src = clean(project.audio.music.src);
    }
    if (project?.avatar?.src) project.avatar.src = clean(project.avatar.src);

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
        renderJobs[jobId].progress = Math.round((rendered / comp.durationInFrames) * 90);
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

    renderJobs[jobId] = {
      progress:  100,
      done:      true,
      url:       `http://localhost:${process.env.PORT || 5000}/api/render/download/${jobId}`,
      video_url: videoUrl,
      error:     null,
    };
    console.log("[render] Done:", jobId);

  } catch (err) {
    if (err.message === "RENDER_CANCELLED") {
      console.log("[render] Cancelled:", jobId);
      renderJobs[jobId] = { progress: 0, done: true, url: null, error: null, cancelled: true };
    } else {
      console.error("[render] Failed:", err.message);
      renderJobs[jobId] = { progress: 0, done: true, url: null, error: err.message };
    }
  }
});

router.post("/cancel", requireAuth, (req, res) => {
  const { jobId } = req.body;
  if (!jobId || !renderJobs[jobId]) return res.status(404).json({ error: "Job not found" });
  renderJobs[jobId].cancelled = true;
  res.json({ success: true });
});

router.get("/status/:jobId", requireAuth, (req, res) => {
  const job = renderJobs[req.params.jobId];
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
    console.log("[render] Deleted output after download:", `render-${jobId}.mp4`);
  });
});
