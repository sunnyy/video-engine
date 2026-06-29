import express from "express";
import { requireAuth, deductCredits, addCredits, safeMessage, supabaseAdmin } from "../middleware/shared.js";
import { runTypographyPipeline, planTypography, produceTypography } from "../../services/ai/typographyVideo/pipelineOrchestrator.js";
import { moderateInput } from "../../services/ai/shared/moderation.js";
import { creditsForDuration } from "../../core/utils/creditCosts.js";
import { blockIfOutage } from "../services/apiHealth.js";

export const router = express.Router();

// Voiceover outage → mask the real cause; if the work was saved as an incomplete project, tell the
// client so it can offer "Finish later". Returns true when it has written the response.
function handleVoiceoverError(send, err) {
  if (!err?.isVoiceoverError) return false;
  console.warn("[typography-video] voiceover unavailable:", err.cause, "-", err.message);
  if (err.incomplete && err.projectId) {
    send({ incomplete: true, projectId: err.projectId, message: "We couldn’t finish the voiceover just now — your video is saved. Tap Finish to complete it shortly (you won’t be charged twice)." });
  } else {
    send({ error: "We couldn’t finish your video right now. Please try again shortly." });
  }
  return true;
}

router.post("/generate", requireAuth, blockIfOutage, async (req, res) => {
  const userId = req.user.id;
  let creditAmount = 0;

  const { input, inputType = "topic", targetDuration = 40, voiceId, language = "en", projectId, theme = "auto", accentColor = null, accentColor2 = null } = req.body;
  if (!input?.trim()) return res.status(400).json({ error: "input is required" });

  // SSE setup
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  const send = (obj) => res.write(`data: ${JSON.stringify(obj)}\n\n`);

  const cost = creditsForDuration(targetDuration || 40);

  try {
    const deduction = await deductCredits(userId, cost, "typography_video", "Typography video generation", projectId || null);
    if (!deduction.success) {
      send({ error: "Insufficient credits", code: "NO_CREDITS" });
      return res.end();
    }
    creditAmount = cost;

    const result = await runTypographyPipeline(
      { input: input.trim(), inputType, targetDuration, userId, voiceId: voiceId ?? null, language: language ?? "en", theme, accentColor, accentColor2 },
      ({ step }) => send({ step }),
    );

    send({ done: true, projectId: result.projectId, projectName: result.projectName });
    res.end();
  } catch (err) {
    if (creditAmount > 0) {
      addCredits(userId, creditAmount, "refund", "ai_failure_refund", "Refund: Typography video failed").catch(() => {});
    }
    if (handleVoiceoverError(send, err)) return res.end();
    console.error("[typography-video/generate]", err);
    send({ error: safeMessage(err) });
    res.end();
  }
});

// ── Phase 1: PLAN (free) — script, returned for confirmation/editing ──
router.post("/plan", requireAuth, async (req, res) => {
  const { input, inputType = "topic", targetDuration = 40, language = "en", styleId = "auto", theme = "auto", accentColor = null, accentColor2 = null } = req.body;
  if (!input?.trim()) return res.status(400).json({ error: "input is required" });
  try {
    const plan = await planTypography({ input: input.trim(), inputType, targetDuration, language, styleId, theme, accentColor, accentColor2 });
    res.json({ plan });
  } catch (err) {
    if (err.code === "CONTENT_BLOCKED") return res.status(422).json({ error: err.message, code: err.code });
    console.error("[typography-video/plan]", err);
    res.status(500).json({ error: err.message });
  }
});

// ── Phase 2: PRODUCE (charges) — build from the confirmed/edited plan ──
router.post("/produce", requireAuth, blockIfOutage, async (req, res) => {
  const userId = req.user.id;
  let creditAmount = 0;

  const { plan, voiceId, language = "en", orientation = "9:16", targetDuration, projectId } = req.body;
  if (!plan?.scenes?.length) return res.status(400).json({ error: "plan is required" });

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();
  const send = (obj) => res.write(`data: ${JSON.stringify(obj)}\n\n`);

  const cost = creditsForDuration(targetDuration || plan?.targetDuration || 40);

  try {
    // Moderate the (possibly client-edited or fully client-crafted) plan BEFORE any paid work —
    // each scene's voiceover is joined verbatim into the TTS narration and otherwise bypasses it.
    const planText = plan.scenes.flatMap((s) => [
      s.voiceover, s.text, s.headline,
      ...(Array.isArray(s.words) ? s.words : []), ...(Array.isArray(s.lines) ? s.lines : []),
    ]).filter(Boolean).join("\n").trim();
    if (planText) await moderateInput(planText, { label: "typography-video produce plan" });

    const deduction = await deductCredits(userId, cost, "typography_video", "Typography video generation", projectId || null);
    if (!deduction.success) { send({ error: "Insufficient credits", code: "NO_CREDITS" }); return res.end(); }
    creditAmount = cost;

    const result = await produceTypography(
      plan,
      { userId, voiceId: voiceId ?? null, language: language ?? "en", orientation: ["9:16","16:9","1:1","4:5"].includes(orientation) ? orientation : "9:16" },
      ({ step }) => send({ step }),
    );

    send({ done: true, projectId: result.projectId, projectName: result.projectName });
    res.end();
  } catch (err) {
    if (creditAmount > 0) addCredits(userId, creditAmount, "refund", "ai_failure_refund", "Refund: Typography video failed").catch(() => {});
    if (handleVoiceoverError(send, err)) return res.end();
    console.error("[typography-video/produce]", err);
    send({ error: safeMessage(err) });
    res.end();
  }
});

// ── Finish a saved INCOMPLETE typography video (voiceover stage had failed) ──────
router.post("/:id/finish", requireAuth, async (req, res) => {
  const userId = req.user.id;
  const projectId = req.params.id;
  let creditAmount = 0;

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();
  const send = (obj) => res.write(`data: ${JSON.stringify(obj)}\n\n`);

  try {
    const { data: project, error } = await supabaseAdmin
      .from("projects").select("id, user_id, status, raw_ai_json")
      .eq("id", projectId).eq("user_id", userId).single();
    if (error || !project)               { send({ error: "Project not found." }); return res.end(); }
    if (project.status !== "incomplete") { send({ error: "This video is already complete." }); return res.end(); }

    const resume = project.raw_ai_json?.resume || {};
    const plan   = resume.plan;
    const params = resume.params || {};
    if (!plan?.scenes?.length) { send({ error: "We can’t finish this one automatically — please regenerate it." }); return res.end(); }

    const cost = creditsForDuration(params.targetDuration || 40);
    const deduction = await deductCredits(userId, cost, "typography_video", "Typography video generation", projectId);
    if (!deduction.success) { send({ error: "Insufficient credits", code: "NO_CREDITS" }); return res.end(); }
    creditAmount = cost;

    const result = await produceTypography(plan, { ...params, userId, existingProjectId: projectId }, ({ step }) => send({ step }));
    if (!result?.projectId) throw new Error("finish produced no project (save failed)");
    send({ done: true, projectId: result.projectId, projectName: result.projectName });
    res.end();
  } catch (err) {
    if (creditAmount > 0) addCredits(userId, creditAmount, "refund", "ai_failure_refund", "Refund: Typography video finish failed").catch(() => {});
    if (err?.isVoiceoverError) { send({ incomplete: true, projectId, message: "Still couldn’t finish the voiceover — please try again shortly." }); return res.end(); }
    console.error("[typography-video/finish]", err);
    send({ error: safeMessage(err) });
    res.end();
  }
});
