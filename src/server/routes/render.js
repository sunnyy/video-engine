import express from "express";
import fs from "fs";
import path from "path";
import { requireAuth, TEMP_DIR, uuidv4 } from "../middleware/shared.js";
import { renderTimeline } from "../services/renderService.js";

export const router = express.Router();

const renderJobs = {};

/* ── Clean up stale temp files on startup (leftover from crashes / cancelled renders) ── */
function cleanupStaleTempFiles() {
  try {
    const cutoff = Date.now() - 2 * 60 * 60 * 1000; // 2 hours
    for (const entry of fs.readdirSync(TEMP_DIR)) {
      const full = path.join(TEMP_DIR, entry);
      try {
        const stat = fs.statSync(full);
        if (stat.mtimeMs < cutoff) {
          if (stat.isDirectory()) fs.rmSync(full, { recursive: true, force: true });
          else fs.unlinkSync(full);
        }
      } catch {}
    }
  } catch {}
}
cleanupStaleTempFiles();

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

/* ---------------- TIMELINE RENDER ---------------- */
router.post("/timeline", requireAuth, async (req, res) => {
  const { project, projectId, resolution = "1080p" } = req.body;

  // Export is FREE — the user already paid to generate the video; re-exports/edits
  // shouldn't be charged. Free-tier monetization is the watermark, applied at render.
  const jobId = uuidv4();
  writeJob(jobId, { progress: 0, done: false, url: null, error: null, cancelled: false });
  res.json({ success: true, jobId });

  timelineRenderJob(jobId, req.user.id, project, projectId, resolution).catch(console.error);
});

async function timelineRenderJob(jobId, userId, project, projectId, resolution) {
  try {
    // Delegate to the shared, framework-agnostic renderer (same service the worker uses).
    // renderId = jobId → each manual export is its own version row in `renders`.
    const { videoUrl } = await renderTimeline(project, {
      userId, renderId: jobId, projectId: projectId || null, resolution,
      onProgress: (pct) => {
        if (!renderJobs[jobId]) return;
        renderJobs[jobId].progress = pct;
        if (pct % 10 === 0 || pct >= 100) writeJob(jobId, renderJobs[jobId]);
      },
      isCancelled: () => !!renderJobs[jobId]?.cancelled,
    });

    writeJob(jobId, {
      progress: 100,
      done: true,
      url: `http://localhost:${process.env.PORT || 5000}/api/render/download/${jobId}`,
      video_url: videoUrl,
      error: null,
    });
  } catch (err) {
    try { fs.unlinkSync(path.join(TEMP_DIR, `render-${jobId}.mp4`)); } catch {}
    if (err.message === "RENDER_CANCELLED") {
      writeJob(jobId, { progress: 0, done: true, url: null, error: null, cancelled: true });
    } else {
      console.error("[timeline-render] Failed:", err.message);
      writeJob(jobId, { progress: 0, done: true, url: null, error: err.message });
    }
  }
}

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
  });
});
