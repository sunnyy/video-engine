import express from "express";
import { requireAuth, deductCredits, addCredits } from "../middleware/shared.js";
import { runSocialPipeline, planSocial, produceSocial } from "../../services/ai/socialVideo/pipelineOrchestrator.js";

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

// ── Phase 1: PLAN (free) — fetch + script, returned for confirmation/editing ──
router.post("/plan", requireAuth, async (req, res) => {
  const { url, targetDuration = 25, language = "en" } = req.body;
  if (!url?.trim()) return res.status(400).json({ error: "url is required" });
  try {
    const plan = await planSocial({ url: url.trim(), targetDuration, language });
    res.json({ plan });
  } catch (err) {
    if (err.code === "CONTENT_BLOCKED") return res.status(422).json({ error: err.message, code: err.code });
    console.error("[social-video/plan]", err);
    res.status(500).json({ error: err.message });
  }
});

// ── Phase 2: PRODUCE (charges) — build the video from the confirmed/edited plan ──
router.post("/produce", requireAuth, async (req, res) => {
  const userId = req.user.id;
  let creditAmount = 0;

  const { plan, voiceId, language = "en", includeAuthor = false, styleId = "auto", projectId } = req.body;
  if (!plan?.scenes?.length) return res.status(400).json({ error: "plan is required" });

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();
  const send = (obj) => res.write(`data: ${JSON.stringify(obj)}\n\n`);

  try {
    const deduction = await deductCredits(userId, 15, "social_video", "Social video generation", projectId || null);
    if (!deduction.success) { send({ error: "Insufficient credits", code: "NO_CREDITS" }); return res.end(); }
    creditAmount = 15;

    const result = await produceSocial(
      plan,
      { userId, voiceId: voiceId ?? null, language: language ?? "en", includeAuthor: !!includeAuthor, styleId: styleId ?? "auto" },
      ({ step }) => send({ step }),
    );

    send({ done: true, projectId: result.projectId, projectName: result.projectName });
    res.end();
  } catch (err) {
    if (creditAmount > 0) addCredits(userId, creditAmount, "refund", "ai_failure_refund", "Refund: Social video failed").catch(() => {});
    console.error("[social-video/produce]", err);
    send({ error: err.message });
    res.end();
  }
});
