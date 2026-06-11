import express from "express";
import { requireAuth, deductCredits, addCredits } from "../middleware/shared.js";
import { runSocialPipeline } from "../../services/ai/socialVideo/pipelineOrchestrator.js";

export const router = express.Router();

router.post("/generate", requireAuth, async (req, res) => {
  const userId = req.user.id;
  let creditAmount = 0;

  const { url, targetDuration = 25, includeAuthor = false, voiceId, language = "en", projectId } = req.body;
  if (!url?.trim()) return res.status(400).json({ error: "url is required" });

  // SSE setup
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  const send = (obj) => res.write(`data: ${JSON.stringify(obj)}\n\n`);

  try {
    const deduction = await deductCredits(userId, 15, "social_video", "Social video generation", projectId || null);
    if (!deduction.success) {
      send({ error: "Insufficient credits", code: "NO_CREDITS" });
      return res.end();
    }
    creditAmount = 15;

    const result = await runSocialPipeline(
      { url: url.trim(), userId, targetDuration, includeAuthor: !!includeAuthor, voiceId: voiceId ?? null, language: language ?? "en" },
      ({ step }) => send({ step }),
    );

    send({ done: true, projectId: result.projectId, projectName: result.projectName });
    res.end();
  } catch (err) {
    if (creditAmount > 0) {
      addCredits(userId, creditAmount, "refund", "ai_failure_refund", "Refund: Social video failed").catch(() => {});
    }
    console.error("[social-video/generate]", err);
    send({ error: err.message });
    res.end();
  }
});
