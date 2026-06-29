import express from "express";
import { requireAuth, deductCredits, addCredits, safeMessage, supabaseAdmin } from "../middleware/shared.js";
import { runProductVideoPipeline, planProductVideo } from "../../services/ai/productVideo/pipelineOrchestrator.js";
import { scrapeProductUrl } from "../../services/ai/productVideo/productScraper.js";
import { guardContent } from "../../services/ai/shared/moderation.js";
import { CREDIT_COSTS } from "../../core/utils/creditCosts.js";

export const router = express.Router();

// Voiceover outage → mask the real cause; if the work was saved as an incomplete project, tell the
// client so it can offer "Finish later". Returns true when it has written the response.
function handleVoiceoverError(send, err) {
  if (!err?.isVoiceoverError) return false;
  console.warn("[product-video] voiceover unavailable:", err.cause, "-", err.message);
  if (err.incomplete && err.projectId) {
    send({ incomplete: true, projectId: err.projectId, message: "We couldn’t finish the voiceover just now — your video is saved. Tap Finish to complete it shortly (you won’t be charged twice)." });
  } else {
    send({ error: "We couldn’t finish your video right now. Please try again shortly." });
  }
  return true;
}

router.post("/generate", requireAuth, async (req, res) => {
  const {
    productImageUrl,
    logoUrl,
    brandName,
    productDescription,
    goal,
    ctaText,
    offerText,
    website,
    visualMode,
    visualStyle,
    accentColor,
    sceneCount,
    voice_id,
    language,
    orientation,
    plan,
    script,
  } = req.body;

  if (!productImageUrl) {
    return res.status(400).json({ error: "productImageUrl is required" });
  }

  // Safety: moderate the product image + ALL user-supplied text before generating — including the
  // edited script and, when a reviewed plan is supplied (vision director skipped), the plan's
  // per-scene script segments + image-generation prompts (which drive Nano Banana image edits).
  const planText = Array.isArray(plan?.scenes)
    ? plan.scenes.flatMap((s) => [s.script_segment, s.image_generation_prompt, s.headline, s.subtext, s.visual_concept]).filter(Boolean)
    : [];
  if (!(await guardContent(res, { text: [brandName, productDescription, script, ...planText], images: [productImageUrl], label: "product-video" }))) return;

  // Stream real progress (SSE) — the pipeline emits a step index at each boundary.
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  const send = (obj) => res.write(`data: ${JSON.stringify(obj)}\n\n`);

  const scenes = Math.max(1, Math.min(5, parseInt(sceneCount, 10) || 3));
  const mode = ["image", "hybrid", "video"].includes(visualMode) ? visualMode : "image";
  const perScene = CREDIT_COSTS.product_video_per_scene[mode] ?? CREDIT_COSTS.product_video_per_scene.image;
  const cost = scenes * perScene;
  let creditAmount = 0;

  try {
    const deduction = await deductCredits(req.user.id, cost, "product_video", `Product Video (${scenes} ${mode} scenes)`, null);
    if (!deduction.success) { send({ error: "Insufficient credits", code: "NO_CREDITS" }); return res.end(); }
    creditAmount = cost;

    const result = await runProductVideoPipeline({
      userId:             req.user.id,
      productImageUrl,
      logoUrl:            logoUrl            ?? null,
      brandName:          brandName          ?? "",
      productDescription: productDescription ?? "",
      goal:               goal               ?? "promo",
      ctaText:            ctaText            ?? "Shop Now",
      offerText:          offerText          ?? "",
      website:            website            ?? "",
      visualMode:         visualMode         ?? "image",
      visualStyle:        visualStyle        ?? "auto",
      accentColor:        accentColor        ?? null,
      sceneCount:         scenes,
      voiceId:            voice_id           ?? null,
      language:           language           ?? "en",
      orientation:        ["9:16","16:9","1:1","4:5"].includes(orientation) ? orientation : "9:16",
      plan:               plan               ?? null,   // approved plan from review (skips director)
      script:             (script ?? "").trim() || null, // edited spoken script
    }, (step) => send({ step }));

    // Charged-no-deliverable guard: credits were deducted up front, so a swallowed timeline-save
    // (saveTimeline → null editor_project_id) must fail → the catch refunds, instead of sending
    // "done" with nothing to open.
    if (!result?.editor_project_id) throw new Error("generation produced no editor project (save failed)");

    send({
      done: true,
      editor_project_id: result.editor_project_id,
      total_duration:    result.total_duration,
    });
    res.end();
  } catch (err) {
    if (creditAmount > 0) addCredits(req.user.id, creditAmount, "refund", "ai_failure_refund", "Refund: Product Video failed").catch(() => {});
    if (handleVoiceoverError(send, err)) return res.end();
    console.error("[product-video/generate]", err);
    send({ error: safeMessage(err), code: err.code });
    res.end();
  }
});

// ── Finish a saved INCOMPLETE product video (voiceover stage had failed) ──────
router.post("/:id/finish", requireAuth, async (req, res) => {
  const userId = req.user.id;
  const projectId = req.params.id;
  let creditAmount = 0;

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  const send = (obj) => res.write(`data: ${JSON.stringify(obj)}\n\n`);

  try {
    const { data: project, error } = await supabaseAdmin
      .from("projects").select("id, user_id, status, raw_ai_json")
      .eq("id", projectId).eq("user_id", userId).single();
    if (error || !project)               { send({ error: "Project not found." }); return res.end(); }
    if (project.status !== "incomplete") { send({ error: "This video is already complete." }); return res.end(); }

    const saved = project.raw_ai_json?.resume?.project;
    if (!saved?.plan?.scenes?.length) { send({ error: "We can’t finish this one automatically — please regenerate it." }); return res.end(); }

    const scenes = Math.max(1, Math.min(5, parseInt(saved.sceneCount, 10) || 3));
    const mode = ["image", "hybrid", "video"].includes(saved.visualMode) ? saved.visualMode : "image";
    const perScene = CREDIT_COSTS.product_video_per_scene[mode] ?? CREDIT_COSTS.product_video_per_scene.image;
    const cost = scenes * perScene;
    const deduction = await deductCredits(userId, cost, "product_video", `Product Video (${scenes} ${mode} scenes)`, projectId);
    if (!deduction.success) { send({ error: "Insufficient credits", code: "NO_CREDITS" }); return res.end(); }
    creditAmount = cost;

    const result = await runProductVideoPipeline({ ...saved, userId, existingProjectId: projectId }, (step) => send({ step }));
    if (!result?.editor_project_id) throw new Error("finish produced no editor project (save failed)");
    send({ done: true, editor_project_id: result.editor_project_id, total_duration: result.total_duration });
    res.end();
  } catch (err) {
    if (creditAmount > 0) addCredits(userId, creditAmount, "refund", "ai_failure_refund", "Refund: Product Video finish failed").catch(() => {});
    if (err?.isVoiceoverError) { send({ incomplete: true, projectId, message: "Still couldn’t finish the voiceover — please try again shortly." }); return res.end(); }
    console.error("[product-video/finish]", err);
    send({ error: safeMessage(err), code: err.code });
    res.end();
  }
});

// ── Phase 1: PLAN (free) — vision director → script for review/editing ──
router.post("/plan", requireAuth, async (req, res) => {
  const { productImageUrl, brandName, productDescription, goal, ctaText, offerText, website, sceneCount, visualMode, language } = req.body;
  if (!productImageUrl) return res.status(400).json({ error: "productImageUrl is required" });
  if (!(await guardContent(res, { text: [brandName, productDescription], images: [productImageUrl], label: "product-video" }))) return;
  try {
    const scenes = Math.max(1, Math.min(5, parseInt(sceneCount, 10) || 3));
    const plan = await planProductVideo({
      productImageUrl,
      brandName:          brandName          ?? "",
      productDescription: productDescription ?? "",
      goal:               goal               ?? "promo",
      ctaText:            ctaText            ?? "Shop Now",
      offerText:          offerText          ?? "",
      website:            website            ?? "",
      sceneCount:         scenes,
      visualMode:         ["image","hybrid","video"].includes(visualMode) ? visualMode : "image",
      language:           language           ?? "en",
    });
    res.json({ plan, full_script: plan.full_script || "" });
  } catch (err) {
    if (err.code === "CONTENT_BLOCKED") return res.status(422).json({ error: err.message, code: err.code });
    console.error("[product-video/plan]", err.message);
    res.status(500).json({ error: err.message });
  }
});

router.post("/scrape-url", requireAuth, async (req, res) => {
  const { url } = req.body;
  if (!url || typeof url !== "string") {
    return res.status(400).json({ error: "url is required" });
  }
  try {
    const result = await scrapeProductUrl(url.trim());
    res.json(result);
  } catch (err) {
    console.error("[product-video/scrape-url]", err.message);
    res.status(422).json({ error: err.message });
  }
});
