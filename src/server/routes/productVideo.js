import express from "express";
import { requireAuth } from "../middleware/shared.js";
import { runProductVideoPipeline } from "../../services/ai/productVideo/pipelineOrchestrator.js";
import { scrapeProductUrl } from "../../services/ai/productVideo/productScraper.js";
import { guardContent } from "../../services/ai/shared/moderation.js";

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
    visualStyle,
    accentColor,
    sceneCount,
    voice_id,
  } = req.body;

  if (!productImageUrl) {
    return res.status(400).json({ error: "productImageUrl is required" });
  }

  // Safety: moderate the product image + any user text before generating.
  if (!(await guardContent(res, { text: [brandName, productDescription], images: [productImageUrl], label: "product-video" }))) return;

  // Stream real progress (SSE) — the pipeline emits a step index at each boundary.
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  const send = (obj) => res.write(`data: ${JSON.stringify(obj)}\n\n`);

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
      visualStyle:        visualStyle        ?? "auto",
      accentColor:        accentColor        ?? null,
      sceneCount:         sceneCount         ?? 3,
      voiceId:            voice_id           ?? null,
    }, (step) => send({ step }));

    send({
      done: true,
      editor_project_id: result.editor_project_id,
      total_duration:    result.total_duration,
    });
    res.end();
  } catch (err) {
    console.error("[product-video/generate]", err);
    send({ error: err.message, code: err.code });
    res.end();
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
