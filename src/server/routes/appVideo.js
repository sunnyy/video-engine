import express from "express";
import { supabaseAdmin, requireAuth, deductCredits, addCredits, safeMessage, uuidv4 } from "../middleware/shared.js";
import { runV2Pipeline, planPromoNarration } from "../../services/ai/appVideo/pipelineOrchestrator.js";
import { guardContent } from "../../services/ai/shared/moderation.js";
import { CREDIT_COSTS } from "../../core/utils/creditCosts.js";
import { blockIfOutage } from "../services/apiHealth.js";

export const router = express.Router();

const PROMO_TIERS = CREDIT_COSTS.promo_video; // scene-based, reused from SaaS/Promo
const sceneCredits = (n) => PROMO_TIERS[n] ?? PROMO_TIERS[3];
const sceneCountFor = (targetDuration) => {
  const d = Number(targetDuration) || 30;
  return d <= 15 ? 1 : d <= 30 ? 3 : 5;
};

// Build the in-memory project the appVideo pipeline consumes (no DB row — clips save to `projects`).
function buildProject(userId, body, id = uuidv4()) {
  const targetDuration = Number(body.target_duration) || 30;
  return {
    id,
    user_id:          userId,
    app_url:          (body.app_url ?? "").trim(),
    country:          (body.country ?? "us").toLowerCase().slice(0, 2),
    video_type:       "faceless",
    video_goal:       null,
    format_ratio:     ["9:16", "16:9", "1:1"].includes(body.format_ratio) ? body.format_ratio : "9:16",
    visual_style:     body.visual_style    || "radiant",
    theme:            body.theme           || "dark",
    tone:             body.tone            || "auto", // derive from the app's category unless the user sets one
    accent_color:     body.accent_color    || null,
    accent_color_2:   body.accent_color_2  || null,
    typography_style: body.typography_style || "modern",
    voice_id:         body.voice_id        || "21m00Tcm4TlvDq8ikWAM",
    language:         body.language        || "en",
    product_notes:    (body.notes ?? "").trim() || null,
    style:            {},
    target_duration:  targetDuration,
    scene_count:      sceneCountFor(targetDuration),
    script:           (body.script ?? "").trim() || null, // optional reviewed script
  };
}

// ── POST /app-video/plan — free "review the script" step (fetch listing + write narration) ──
router.post("/plan", requireAuth, async (req, res) => {
  try {
    if (!(req.body.app_url ?? "").trim()) return res.status(400).json({ error: "An App Store or Play Store link is required." });
    if (!(await guardContent(res, { text: [req.body.notes, req.body.script], label: "app-video" }))) return;
    const project = buildProject(req.user.id, req.body);
    const { full_script } = await planPromoNarration(project);
    res.json({ plan_only: true, full_script });
  } catch (e) {
    console.error("[app-video/plan]", e.message);
    res.status(500).json({ error: safeMessage(e) });
  }
});

// ── POST /app-video/create — fetch listing → script → voiceover → beats → editable timeline ──
router.post("/create", requireAuth, blockIfOutage, async (req, res) => {
  let creditAmount = 0;
  try {
    if (!(req.body.app_url ?? "").trim()) return res.status(400).json({ error: "An App Store or Play Store link is required." });
    // Moderate any user-supplied text (the reviewed script is voiced verbatim; notes steer the script).
    if (!(await guardContent(res, { text: [req.body.notes, req.body.script], label: "app-video" }))) return;

    const project = buildProject(req.user.id, req.body);
    const cost = sceneCredits(project.scene_count);
    const deduction = await deductCredits(req.user.id, cost, "app_video", `App Promo Video (${project.scene_count} scenes)`, project.id);
    if (!deduction.success) return res.status(402).json({ error: "Insufficient credits", code: "NO_CREDITS" });
    creditAmount = cost;

    const result = await runV2Pipeline(project);
    if (!result?.editor_project_id) throw new Error("generation produced no editor project (save failed)");

    res.json({ project: { editor_project_id: result.editor_project_id, product_name: result.product_name, duration_seconds: result.duration_seconds, full_script: result.full_script } });
  } catch (e) {
    if (creditAmount > 0) addCredits(req.user.id, creditAmount, "refund", "ai_failure_refund", "Refund: App Promo Video failed").catch(() => {});
    // Voiceover outage → may be saved as an incomplete project the user can Finish later. Mask the cause.
    if (e?.isVoiceoverError) {
      console.warn("[app-video/create] voiceover unavailable:", e.cause, "-", e.message);
      if (e.incomplete && e.projectId) {
        return res.json({ incomplete: true, projectId: e.projectId, message: "We couldn’t finish the voiceover just now — your video is saved. Tap Finish to complete it shortly (you won’t be charged twice)." });
      }
      return res.status(503).json({ error: "We couldn’t finish your video right now. Please try again shortly." });
    }
    console.error("[app-video/create]", e.message);
    res.status(500).json({ error: safeMessage(e) });
  }
});

// ── POST /app-video/:id/finish — complete a saved INCOMPLETE app promo (voiceover stage had failed) ──
router.post("/:id/finish", requireAuth, async (req, res) => {
  let creditAmount = 0;
  const projectId = req.params.id;
  try {
    const { data: proj, error } = await supabaseAdmin
      .from("projects").select("id, user_id, status, raw_ai_json")
      .eq("id", projectId).eq("user_id", req.user.id).single();
    if (error || !proj)              return res.status(404).json({ error: "Project not found." });
    if (proj.status !== "incomplete") return res.status(400).json({ error: "This video is already complete." });

    const saved = proj.raw_ai_json?.resume?.project;
    if (!saved) return res.status(422).json({ error: "We can’t finish this one automatically — please regenerate it." });

    const cost = sceneCredits(saved.scene_count ?? 3);
    const deduction = await deductCredits(req.user.id, cost, "app_video", `App Promo Video (${saved.scene_count ?? 3} scenes)`, projectId);
    if (!deduction.success) return res.status(402).json({ error: "Insufficient credits", code: "NO_CREDITS" });
    creditAmount = cost;

    const result = await runV2Pipeline({ ...saved, existingProjectId: projectId });
    if (!result?.editor_project_id) throw new Error("finish produced no editor project (save failed)");
    res.json({ project: { editor_project_id: result.editor_project_id } });
  } catch (e) {
    if (creditAmount > 0) addCredits(req.user.id, creditAmount, "refund", "ai_failure_refund", "Refund: App Promo Video finish failed").catch(() => {});
    if (e?.isVoiceoverError) return res.json({ incomplete: true, projectId, message: "Still couldn’t finish the voiceover — please try again shortly." });
    console.error("[app-video/finish]", e.message);
    res.status(500).json({ error: safeMessage(e) });
  }
});
