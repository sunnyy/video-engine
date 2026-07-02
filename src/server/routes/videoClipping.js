import express from "express";
import { requireAuth, deductCredits, addCredits, safeMessage } from "../middleware/shared.js";
import { requireProPlus } from "../middleware/planGate.js";
import { runClippingPipeline } from "../../services/ai/videoClipping/pipelineOrchestrator.js";
import { creditsForClipping } from "../../core/utils/creditCosts.js";

export const router = express.Router();

const MAX_INPUT_SECONDS = 90 * 60; // 90 min cap (MVP)

// POST /video-clipping/generate — SSE. Takes an already-uploaded video URL (reuse /api/caption/
// upload-video to upload) + options, transcribes, GPT-4.1 picks the best moments, cuts + captions
// each into an editable 9:16 timeline project, deletes the source, and returns the clip list.
router.post("/generate", requireAuth, requireProPlus("Video clipping"), async (req, res) => {
  const userId = req.user.id;
  let creditAmount = 0;

  const {
    videoUrl,
    sourceKey = null,
    captionStyle = "wordBlaze",
    clipLenMin = 20,
    clipLenMax = 60,
    autoLength = false,   // Auto: AI picks each clip's own natural length across the full range
    language = "en",
  } = req.body;

  if (!videoUrl?.trim()) return res.status(400).json({ error: "videoUrl is required (upload the video first)" });

  // SSRF / arbitrary-source guard: only accept files uploaded to OUR storage (the URL is downloaded
  // and fed to ffmpeg/Whisper). The upload endpoint returns Supabase storage URLs; reject anything else.
  const STORAGE_PREFIX = `${process.env.SUPABASE_URL}/storage/`;
  if (!videoUrl.trim().startsWith(STORAGE_PREFIX)) {
    return res.status(400).json({ error: "videoUrl must be a file uploaded here" });
  }
  // Only let the pipeline delete a source object that belongs to this user (the upload key contains
  // the uploader's id). Anything else is ignored rather than removed.
  const safeSourceKey = typeof sourceKey === "string" && sourceKey.includes(userId) ? sourceKey : null;

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();
  const send = (obj) => res.write(`data: ${JSON.stringify(obj)}\n\n`);

  try {
    const result = await runClippingPipeline(
      {
        videoUrl: videoUrl.trim(),
        sourceKey: safeSourceKey,
        userId,
        captionStyle,
        clipLenMin: Math.max(10, Math.min(60, parseInt(clipLenMin, 10) || 20)),
        clipLenMax: Math.max(20, Math.min(90, parseInt(clipLenMax, 10) || 60)),
        autoLength: !!autoLength,
        language,
      },
      ({ step }) => send({ step }),
      // Charge off the REAL source length (client value is not trusted). Runs after the cheap
      // transcription, before any cutting; rejects over-length first.
      async (realDuration) => {
        const secs = Math.round(realDuration) || 0;
        if (secs > MAX_INPUT_SECONDS + 10) { const e = new Error(`Video too long — max ${Math.round(MAX_INPUT_SECONDS / 60)} min`); e.code = "TOO_LONG"; throw e; }
        const cost = creditsForClipping(secs);
        const deduction = await deductCredits(userId, cost, "video_clipping", `Video Clipping (${Math.round(secs / 60)} min source)`, null);
        if (!deduction.success) { const e = new Error("Insufficient credits"); e.code = "NO_CREDITS"; throw e; }
        creditAmount = cost;
      },
    );

    send({ done: true, clips: result.clips, clipCount: result.clipCount, sourceDuration: result.sourceDuration });
    res.end();
  } catch (err) {
    if (creditAmount > 0) {
      addCredits(userId, creditAmount, "refund", "ai_failure_refund", "Refund: Video Clipping failed").catch(() => {});
    }
    console.error("[video-clipping/generate]", err);
    send({ error: safeMessage(err), code: err.code });
    res.end();
  }
});
