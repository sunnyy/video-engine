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

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();
  const send = (obj) => res.write(`data: ${JSON.stringify(obj)}\n\n`);

  const dur  = Math.min(MAX_INPUT_SECONDS, Math.max(1, parseInt(durationSeconds, 10) || 30));
  const cost = creditsForTalkingHead(dur);

  try {
    const deduction = await deductCredits(userId, cost, "talking_head", `Talking Head (${Math.round(dur)}s)`, null);
    if (!deduction.success) {
      send({ error: "Insufficient credits", code: "NO_CREDITS" });
      return res.end();
    }
    creditAmount = cost;

    const result = await runTalkingHeadPipeline(
      {
        videoUrl: videoUrl.trim(), userId,
        captionStyle, captionPos,
        reframe: reframe === "9:16" ? "9:16" : "source",
        music: music !== false,
        styleId, theme, accentColor, accentColor2,
      },
      ({ step }) => send({ step }),
    );

    send({ done: true, projectId: result.projectId, projectName: result.projectName, duration_seconds: result.duration_seconds });
    res.end();
  } catch (err) {
    if (creditAmount > 0) {
      addCredits(userId, creditAmount, "refund", "ai_failure_refund", "Refund: Talking Head failed").catch(() => {});
    }
    console.error("[talking-head/generate]", err);
    send({ error: err.message });
    res.end();
  }
});
