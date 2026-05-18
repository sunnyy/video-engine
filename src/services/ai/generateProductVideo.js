/**
 * generateProductVideo.js
 * Orchestrates the product ad pipeline using ProductAdSpec as single source of truth.
 * Steps: analyze → remove-bg → direction → scene-plan → generate-backgrounds → compose → motion → music
 */
import { serverFetch } from "../serverApi";
import { createProductAdSpec } from "./productVideo/productAdSpec";
import { injectMusic } from "./productVideo/musicInjector";

export async function generateProductVideo({
  productImageUrl,
  logoUrl = null,
  brandName = "",
  videoType = "promo",
  offerText = "",
  ctaText = "Shop Now",
  website = "",
  tagline = "",
  projectId,
  onProgress,
}) {
  const TOTAL = 8;
  const progress = (step, label) => onProgress?.(step, TOTAL, label);

  // Initialize spec
  const spec = createProductAdSpec({
    productImageUrl, logoUrl, brandName,
    videoType, offerText, ctaText, website, tagline,
  });

  // Step 1 — Analyze product
  progress(1, "Analyzing your product...");
  const analyzeRes = await serverFetch("/api/product-video/analyze", {
    method: "POST",
    body: JSON.stringify({ imageUrl: productImageUrl }),
  });
  if (!analyzeRes.ok) throw new Error("Product analysis failed");
  spec.productAnalysis = await analyzeRes.json();

  // Step 2 — Remove background
  progress(2, "Removing background...");
  try {
    const bgRes = await serverFetch("/api/product-video/remove-background", {
      method: "POST",
      body: JSON.stringify({ imageUrl: productImageUrl, projectId }),
    });
    if (bgRes.ok) {
      const bgData = await bgRes.json();
      spec.productCutoutUrl = bgData.url ?? null;
    }
  } catch {
    // Non-fatal — fall back to original image
    spec.productCutoutUrl = null;
  }

  // Step 3 — Creative direction
  progress(3, "Building creative direction...");
  const dirRes = await serverFetch("/api/product-video/direction", {
    method: "POST",
    body: JSON.stringify({
      productAnalysis: spec.productAnalysis,
      videoType: spec.videoType,
      brandName: spec.brandName,
    }),
  });
  if (!dirRes.ok) throw new Error("Direction step failed");
  const direction = await dirRes.json();
  spec.palette = direction.palette;
  spec.fonts = direction.fonts ?? { headline: "Oswald", body: "Outfit" };
  spec.font = direction.fonts?.body ?? direction.font ?? "Outfit"; // backward compat
  spec.tone = direction.tone;
  spec.energy = direction.energy;
  spec.musicMood = direction.musicMood;
  spec.bgImagePrompt = direction.bgImagePrompt;
  spec.lifestylePrompt = direction.lifestylePrompt;

  // Step 4 — Scene plan
  progress(4, "Planning scenes...");
  const planRes = await serverFetch("/api/product-video/scene-plan", {
    method: "POST",
    body: JSON.stringify({
      productAnalysis: spec.productAnalysis,
      direction,
      videoType: spec.videoType,
      offerText: spec.offerText,
      ctaText: spec.ctaText,
      tagline: spec.tagline,
      brandName: spec.brandName,
    }),
  });
  if (!planRes.ok) throw new Error("Scene planning failed");
  const planData = await planRes.json();
  spec.scenes = planData.scenes ?? [];

  // Step 5 — Generate background images
  progress(5, "Generating background images...");
  try {
    const genRes = await serverFetch("/api/product-video/generate-backgrounds", {
      method: "POST",
      body: JSON.stringify({
        bgImagePrompt: spec.bgImagePrompt,
        lifestylePrompt: spec.lifestylePrompt,
        projectId,
        productImageUrl: spec.productImageUrl,
      }),
    });
    if (genRes.ok) {
      const genData = await genRes.json();
      spec.heroBackgroundUrl = genData.heroUrl ?? null;
      spec.lifestyleImageUrl = genData.lifestyleUrl ?? null;
    }
  } catch {
    // Non-fatal
  }

  // Step 6 — Compose timeline
  progress(6, "Composing timeline...");
  const composeRes = await serverFetch("/api/product-video/compose", {
    method: "POST",
    body: JSON.stringify({ spec }),
  });
  if (!composeRes.ok) throw new Error("Composition failed");
  const composeData = await composeRes.json();
  spec.layers = composeData.layers ?? [];

  // Step 7 — Motion pass
  progress(7, "Adding motion...");
  const motionRes = await serverFetch("/api/product-video/motion", {
    method: "POST",
    body: JSON.stringify({ layers: spec.layers, direction }),
  });
  if (motionRes.ok) {
    const motionData = await motionRes.json();
    spec.layers = motionData.layers ?? spec.layers;
  }

  // Step 8 — Music
  progress(8, "Adding music...");
  try {
    spec.layers = await injectMusic({ layers: spec.layers, direction });
  } catch {
    // Non-fatal
  }

  return {
    layers: spec.layers,
    direction,
    productAnalysis: spec.productAnalysis,
    scenes: spec.scenes,
    spec,
  };
}
