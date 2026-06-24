import express from "express";
import { requireAuth, deductCredits, addCredits } from "../middleware/shared.js";
import { runPromptPipeline, runPromptPlan } from "../../services/ai/promptVideo/pipelineOrchestrator.js";
import { creditsForDuration } from "../../core/utils/creditCosts.js";

export const router = express.Router();

// ── POST /ai-video/plan ──────────────────────────────────────────────────
// The cheap half: research + script + shot plan, returned for user review.
// Free (two text-model calls); credits are charged only at /generate.
router.post("/plan", requireAuth, async (req, res) => {
  try {
    const { prompt, styleId = "auto", targetDuration = 45, language = "en", revision = "", theme = "auto", accentColor = null, accentColor2 = null } = req.body;
    if (!prompt?.trim()) return res.status(400).json({ error: "prompt is required" });

    const effectivePrompt = revision?.trim()
      ? `${prompt.trim()}\n\nREVISION REQUEST (apply this to the plan): ${revision.trim()}`
      : prompt.trim();

    const result = await runPromptPlan({
      prompt: effectivePrompt,
      styleId: styleId ?? "auto",
      targetDuration: Math.min(75, Math.max(15, parseInt(targetDuration, 10) || 45)),
      language: language ?? "en",
      theme, accentColor, accentColor2,
    });
    res.json(result);
  } catch (e) {
    if (e.code === "CONTENT_BLOCKED") return res.status(422).json({ error: e.message, code: e.code });
    console.error("[ai-video/plan]", e.message);
    res.status(500).json({ error: e.message });
  }
});

router.post("/generate", requireAuth, async (req, res) => {
  const userId = req.user.id;
  let creditAmount = 0;

  const { prompt, styleId = "auto", targetDuration = 45, language = "en", voiceId = null, orientation = "9:16", plan = null, theme = "auto", accentColor = null, accentColor2 = null } = req.body;
  if (!prompt?.trim()) return res.status(400).json({ error: "prompt is required" });

  // SSE setup
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  const send = (obj) => res.write(`data: ${JSON.stringify(obj)}\n\n`);

  const effDuration = Math.min(75, Math.max(15, parseInt(targetDuration, 10) || 45));
  const cost = creditsForDuration(effDuration);

  try {
    const deduction = await deductCredits(userId, cost, "ai_video", `AI Video generation (${effDuration}s)`, null);
    if (!deduction.success) {
      send({ error: "Insufficient credits", code: "NO_CREDITS" });
      return res.end();
    }
    creditAmount = cost;

    const result = await runPromptPipeline(
      {
        prompt: prompt.trim(), userId,
        styleId: styleId ?? "auto",
        targetDuration: effDuration,
        language: language ?? "en",
        voiceId: voiceId ?? null,
        orientation: ["9:16", "16:9", "1:1", "4:5"].includes(orientation) ? orientation : "9:16",
        theme, accentColor, accentColor2,
        plan,
      },
      ({ step }) => send({ step }),
    );

    send({ done: true, projectId: result.projectId, projectName: result.projectName, beatCount: result.beatCount });
    res.end();
  } catch (err) {
    if (creditAmount > 0) {
      addCredits(userId, creditAmount, "refund", "ai_failure_refund", "Refund: AI Video failed").catch(() => {});
    }
    console.error("[ai-video/generate]", err);
    send({ error: err.message });
    res.end();
  }
});
