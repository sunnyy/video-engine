import express from "express";
import { requireAuth, deductCredits, addCredits } from "../middleware/shared.js";
import { runTalkingHeadPipeline } from "../../services/ai/talkingHead/pipelineOrchestrator.js";
import { creditsForTalkingHead } from "../../core/utils/creditCosts.js";

export const router = express.Router();

const MAX_INPUT_SECONDS = 600; // 10 min cap for now

// POST /talking-head/generate — SSE. Takes an already-uploaded video URL (reuse /api/caption/
// upload-video to upload) + options, transcribes, builds an editable timeline (speaker + captions),
// saves a project, returns its id. No Remotion render — the user exports from the editor.
router.post("/generate", requireAuth, async (req, res) => {
  const userId = req.user.id;
  let creditAmount = 0;

  const {
    videoUrl,
    durationSeconds = 0,
    captionStyle = "wordBlaze",
    captionPos = 80,
    reframe = "source",
    music = true,
    styleId = "auto", theme = "auto", accentColor = null, accentColor2 = null,
  } = req.body;

  if (!videoUrl?.trim()) return res.status(400).json({ error: "videoUrl is required (upload the video first)" });

  // SSRF / arbitrary-source guard: only accept files uploaded to OUR storage. The URL is downloaded
  // and fed to ffmpeg/Whisper, so an arbitrary URL (or file:// path) is a real surface. The upload
  // endpoint returns Supabase storage URLs; reject anything else.
  const STORAGE_PREFIX = `${process.env.SUPABASE_URL}/storage/`;
  if (!videoUrl.trim().startsWith(STORAGE_PREFIX)) {
    return res.status(400).json({ error: "videoUrl must be a file uploaded here" });
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();
  const send = (obj) => res.write(`data: ${JSON.stringify(obj)}\n\n`);

  try {
    const result = await runTalkingHeadPipeline(
      {
        videoUrl: videoUrl.trim(), userId,
        captionStyle, captionPos,
        reframe: reframe === "9:16" ? "9:16" : "source",
        music: music !== false,
        styleId, theme, accentColor, accentColor2,
      },
      ({ step }) => send({ step }),
      // Charge off the REAL transcribed duration (the client-supplied durationSeconds is NOT trusted
      // — a user could under-declare to pay the 1s minimum for a 10-min video). Runs after the cheap
      // transcription, before the expensive director/visuals; rejects over-length first.
      async (realDuration) => {
        const secs = Math.round(realDuration) || 0;
        if (secs > MAX_INPUT_SECONDS + 5) { const e = new Error(`Video too long — max ${Math.round(MAX_INPUT_SECONDS / 60)} min`); e.code = "TOO_LONG"; throw e; }
        const billSecs = Math.max(1, Math.min(MAX_INPUT_SECONDS, secs));
        const cost = creditsForTalkingHead(billSecs);
        const deduction = await deductCredits(userId, cost, "talking_head", `Talking Head (${billSecs}s)`, null);
        if (!deduction.success) { const e = new Error("Insufficient credits"); e.code = "NO_CREDITS"; throw e; }
        creditAmount = cost;
      },
    );

    send({ done: true, projectId: result.projectId, projectName: result.projectName, duration_seconds: result.duration_seconds });
    res.end();
  } catch (err) {
    if (creditAmount > 0) {
      addCredits(userId, creditAmount, "refund", "ai_failure_refund", "Refund: Talking Head failed").catch(() => {});
    }
    console.error("[talking-head/generate]", err);
    send({ error: err.message, code: err.code });
    res.end();
  }
});
