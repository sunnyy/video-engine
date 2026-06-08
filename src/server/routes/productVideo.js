import express from "express";
import { requireAuth } from "../middleware/shared.js";
import { runProductVideoPipeline } from "../../services/ai/productVideo/pipelineOrchestrator.js";

export const router = express.Router();

router.post("/generate", requireAuth, async (req, res) => {
  const {
    productImageUrl,
    logoUrl,
    brandName,
    productDescription,
    ctaText,
    offerText,
    website,
    visualMode,
    accentColor,
    sceneCount,
    voice_id,
  } = req.body;

  if (!productImageUrl) {
    return res.status(400).json({ error: "productImageUrl is required" });
  }

  try {
    const result = await runProductVideoPipeline({
      userId:             req.user.id,
      productImageUrl,
      logoUrl:            logoUrl            ?? null,
      brandName:          brandName          ?? "",
      productDescription: productDescription ?? "",
      ctaText:            ctaText            ?? "Shop Now",
      offerText:          offerText          ?? "",
      website:            website            ?? "",
      visualMode:         visualMode         ?? "image",
      accentColor:        accentColor        ?? null,
      sceneCount:         sceneCount         ?? 3,
      voiceId:            voice_id           ?? null,
    });

    res.json({
      editor_project_id: result.editor_project_id,
      total_duration:    result.total_duration,
      shots:             result.shots,
    });
  } catch (err) {
    console.error("[product-video/generate]", err);
    res.status(500).json({ error: err.message });
  }
});
