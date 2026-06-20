import express from "express";
import { requireAuth, deductCredits, addCredits } from "../middleware/shared.js";
import { runTypographyPipeline, planTypography, produceTypography } from "../../services/ai/typographyVideo/pipelineOrchestrator.js";

export const router = express.Router();

router.post("/generate", requireAuth, async (req, res) => {
  const userId = req.user.id;
  let creditAmount = 0;

  const { input, inputType = "topic", targetDuration = 40, voiceId, language = "en", projectId } = req.body;
  if (!input?.trim()) return res.status(400).json({ error: "input is required" });

  // SSE setup
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  const send = (obj) => res.write(`data: ${JSON.stringify(obj)}\n\n`);

  try {
    const deduction = await deductCredits(userId, 15, "typography_video", "Typography video generation", projectId || null);
    if (!deduction.success) {
      send({ error: "Insufficient credits", code: "NO_CREDITS" });
      return res.end();
    }
    creditAmount = 15;

    const result = await runTypographyPipeline(
      { input: input.trim(), inputType, targetDuration, userId, voiceId: voiceId ?? null, language: language ?? "en" },
      ({ step }) => send({ step }),
    );

    send({ done: true, projectId: result.projectId, projectName: result.projectName });
    res.end();
  } catch (err) {
    if (creditAmount > 0) {
      addCredits(userId, creditAmount, "refund", "ai_failure_refund", "Refund: Typography video failed").catch(() => {});
    }
    console.error("[typography-video/generate]", err);
    send({ error: err.message });
    res.end();
  }
});

// ── Phase 1: PLAN (free) — script, returned for confirmation/editing ──
router.post("/plan", requireAuth, async (req, res) => {
  const { input, inputType = "topic", targetDuration = 40, language = "en", styleId = "auto" } = req.body;
  if (!input?.trim()) return res.status(400).json({ error: "input is required" });
  try {
    const plan = await planTypography({ input: input.trim(), inputType, targetDuration, language, styleId });
    res.json({ plan });
  } catch (err) {
    if (err.code === "CONTENT_BLOCKED") return res.status(422).json({ error: err.message, code: err.code });
    console.error("[typography-video/plan]", err);
    res.status(500).json({ error: err.message });
  }
});

// ── Phase 2: PRODUCE (charges) — build from the confirmed/edited plan ──
router.post("/produce", requireAuth, async (req, res) => {
  const userId = req.user.id;
  let creditAmount = 0;

  const { plan, voiceId, language = "en", projectId } = req.body;
  if (!plan?.scenes?.length) return res.status(400).json({ error: "plan is required" });

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();
  const send = (obj) => res.write(`data: ${JSON.stringify(obj)}\n\n`);

  try {
    const deduction = await deductCredits(userId, 15, "typography_video", "Typography video generation", projectId || null);
    if (!deduction.success) { send({ error: "Insufficient credits", code: "NO_CREDITS" }); return res.end(); }
    creditAmount = 15;

    const result = await produceTypography(
      plan,
      { userId, voiceId: voiceId ?? null, language: language ?? "en" },
      ({ step }) => send({ step }),
    );

    send({ done: true, projectId: result.projectId, projectName: result.projectName });
    res.end();
  } catch (err) {
    if (creditAmount > 0) addCredits(userId, creditAmount, "refund", "ai_failure_refund", "Refund: Typography video failed").catch(() => {});
    console.error("[typography-video/produce]", err);
    send({ error: err.message });
    res.end();
  }
});
