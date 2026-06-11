import express from "express";
import { requireAuth } from "../middleware/shared.js";
import { runProductVideoPipeline } from "../../services/ai/productVideo/pipelineOrchestrator.js";
import { scrapeProductUrl } from "../../services/ai/productVideo/productScraper.js";

export const router = express.Router();

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
      goal:               goal               ?? "promo",
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
