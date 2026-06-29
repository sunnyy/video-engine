import express from "express";
import { requireAuth, deductCredits, addCredits, safeMessage, supabaseAdmin } from "../middleware/shared.js";
import { runPromptPipeline, runPromptPlan } from "../../services/ai/promptVideo/pipelineOrchestrator.js";
import { creditsForDuration } from "../../core/utils/creditCosts.js";
import { blockIfOutage } from "../services/apiHealth.js";

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

router.post("/generate", requireAuth, blockIfOutage, async (req, res) => {
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
    const deduction = await deductCredits(userId, cost, "ai_video", `Prompt to Video generation (${effDuration}s)`, null);
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
      addCredits(userId, creditAmount, "refund", "ai_failure_refund", "Refund: Prompt to Video failed").catch(() => {});
    }
    // Voiceover unavailable (our TTS quota/outage) — the work may be saved as an incomplete project
    // the user can Finish later. NEVER reveal the internal cause; show generic copy either way.
    if (err?.isVoiceoverError) {
      console.warn("[ai-video/generate] voiceover unavailable:", err.cause, "-", err.message);
      if (err.incomplete && err.projectId) {
        send({ incomplete: true, projectId: err.projectId,
               message: "We couldn’t finish the voiceover just now — your video is saved. Tap Finish to complete it shortly (you won’t be charged twice)." });
      } else {
        send({ error: "We couldn’t finish your video right now. Please try again shortly." });
      }
      return res.end();
    }
    console.error("[ai-video/generate]", err);
    send({ error: safeMessage(err) });
    res.end();
  }
});

// ── POST /ai-video/:id/finish ──────────────────────────────────────────────
// Complete a previously-saved INCOMPLETE generation (voiceover stage had failed). Re-runs production
// from the saved plan — no re-research/re-write — and charges credits only now, on completion.
router.post("/:id/finish", requireAuth, blockIfOutage, async (req, res) => {
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
    if (error || !project)            { send({ error: "Project not found." }); return res.end(); }
    if (project.status !== "incomplete") { send({ error: "This video is already complete." }); return res.end(); }

    const resume = project.raw_ai_json?.resume || {};
    const plan   = resume.plan;
    const gp     = resume.generateParams || {};
    if (!plan?.film?.beats?.length) { send({ error: "We can’t finish this one automatically — please regenerate it." }); return res.end(); }

    const effDuration = Math.min(75, Math.max(15, parseInt(gp.targetDuration, 10) || 45));
    const cost = creditsForDuration(effDuration);
    const deduction = await deductCredits(userId, cost, "ai_video", `Prompt to Video generation (${effDuration}s)`, projectId);
    if (!deduction.success) { send({ error: "Insufficient credits", code: "NO_CREDITS" }); return res.end(); }
    creditAmount = cost;

    const result = await runPromptPipeline(
      { ...gp, prompt: gp.prompt || resume.prompt || "", userId, plan, existingProjectId: projectId },
      ({ step }) => send({ step }),
    );
    send({ done: true, projectId: result.projectId, projectName: result.projectName, beatCount: result.beatCount });
    res.end();
  } catch (err) {
    if (creditAmount > 0) {
      addCredits(userId, creditAmount, "refund", "ai_failure_refund", "Refund: Prompt to Video finish failed").catch(() => {});
    }
    if (err?.isVoiceoverError) {
      console.warn("[ai-video/finish] voiceover still unavailable:", err.cause);
      send({ incomplete: true, projectId, message: "Still couldn’t finish the voiceover — please try again shortly." });
      return res.end();
    }
    console.error("[ai-video/finish]", err);
    send({ error: safeMessage(err) });
    res.end();
  }
});
