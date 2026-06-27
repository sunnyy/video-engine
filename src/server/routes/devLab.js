/**
 * devLab.js — PRIVATE AI Video step-through lab (admin only, not linked anywhere).
 *
 * Runs the AI Video pipeline ONE STAGE AT A TIME so the output of each step can be inspected in
 * isolation (research → write → direct → resolve → design), instead of judging the end-to-end
 * video and guessing which stage degraded quality. Stateless: the client holds the accumulated
 * state and posts what each step needs. No credits charged, no project saved — pure inspection.
 *
 * Mounted at /api/dev (requireAuth + requireAdmin). Frontend: src/pages/AivLab.jsx (/admin/aiv-lab).
 */
import express from "express";
import { requireAuth, requireAdmin } from "../middleware/shared.js";
import { researchTopic } from "../../services/ai/promptVideo/researcher.js";
import { writeScript } from "../../services/ai/promptVideo/scriptWriter.js";
import { directVisuals } from "../../services/ai/promptVideo/artDirector.js";
import { resolveVisuals } from "../../services/ai/promptVideo/visualResolver.js";
import { designAllBeats } from "../../services/ai/promptVideo/beatDesigner.js";

export const router = express.Router();
router.use(requireAuth, requireAdmin);

const canvasFor = (o) =>
  o === "16:9" ? { width: 1920, height: 1080 }
  : o === "1:1" ? { width: 1080, height: 1080 }
  : o === "4:5" ? { width: 1080, height: 1350 }
  : { width: 1080, height: 1920 };

// Word-count duration estimate (no TTS) so resolve/design have durations without the TTS wait/cost.
function estimateDurations(beats) {
  for (const b of beats || []) {
    if (b.duration_seconds == null) {
      const n = (b.script_line ?? "").trim().split(/\s+/).filter(Boolean).length;
      b.duration_seconds = Math.max(1.2, parseFloat((n / 2.1).toFixed(2)));
    }
  }
}

const wrap = (fn) => async (req, res) => {
  try { await fn(req, res); }
  catch (e) { console.error("[dev-lab]", e); res.status(400).json({ error: e.message }); }
};

// 1) Research
router.post("/research", wrap(async (req, res) => {
  const prompt = String(req.body?.prompt || "").trim();
  if (!prompt) return res.status(400).json({ error: "prompt required" });
  res.json({ research: await researchTopic(prompt) });
}));

// 2) Writer — narration + beats (words/content only)
router.post("/write", wrap(async (req, res) => {
  const { research, targetDuration = 45, language = "en" } = req.body || {};
  if (!research) return res.status(400).json({ error: "research required (run step 1)" });
  res.json({ script: await writeScript({ research, targetDuration, language }) });
}));

// 3) Art-Director — per-beat visual directives + style + palette
router.post("/direct", wrap(async (req, res) => {
  const { research, script, styleId = "auto", targetDuration = 45, theme = "auto", accentColor = null, accentColor2 = null, orientation = "9:16" } = req.body || {};
  if (!research || !script?.beats?.length) return res.status(400).json({ error: "research + script required (run steps 1-2)" });
  const dir = await directVisuals({ research, beats: script.beats, targetDuration, styleId, theme, accentColor, accentColor2, orientation });
  const beats = dir.beats.map((b) => ({ ...b, niche: script.niche }));
  estimateDurations(beats);
  res.json({ style: dir.style, palette: dir.palette, beats });
}));

// 4) Executor — fetch each beat's asset (free uncapped + budgeted ai_image)
router.post("/resolve", wrap(async (req, res) => {
  const { beats, style, orientation = "9:16" } = req.body || {};
  if (!beats?.length || !style) return res.status(400).json({ error: "beats + style required (run step 3)" });
  estimateDurations(beats);
  const runId = `lab-${req.user.id}-${Date.now()}`;
  await resolveVisuals(beats, style, runId, orientation);
  res.json({ beats });
}));

// 5) Designer — HTML per beat (GPT-5.4) for live preview
router.post("/design", wrap(async (req, res) => {
  const { beats, style, palette, orientation = "9:16", language = "en" } = req.body || {};
  if (!beats?.length || !style || !palette) return res.status(400).json({ error: "beats + style + palette required (run steps 3-4)" });
  const canvas = canvasFor(orientation);
  estimateDurations(beats);
  const designs = await designAllBeats(beats, { style, palette, canvasW: canvas.width, canvasH: canvas.height, language });
  res.json({ designs, canvas });
}));
