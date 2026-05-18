/**
 * assetInjector.js
 * src/services/ai/productVideo/assetInjector.js
 *
 * Fills image layers that have src: null after the AI pipeline:
 * - background (zIndex 1) product_image scenes → productImageUrl directly
 * - background (zIndex 1) ai_generate scenes   → nano-banana via /generate-scene-image
 * - product image layers (zIndex >= 3, src null) → productImageUrl directly
 * - decorative_only scenes → left as null
 */
import { serverFetch } from "../../serverApi";

export async function injectAssets({
  layers,
  assetPlan,
  productImageUrl,
  projectId,
  onProgress,
}) {
  const planMap = {};
  for (const entry of assetPlan || []) {
    planMap[entry.sceneId] = entry;
  }

  const bgLayers = layers.filter(
    (l) => l.type === "image" && l.zIndex === 1 && !l.src
  );

  const productImgLayers = layers.filter(
    (l) => l.type === "image" && (l.zIndex ?? 0) >= 3 && !l.src
  );

  const total = bgLayers.length + productImgLayers.length;
  let completed = 0;

  const updatedLayers = [...layers];

  for (let i = 0; i < bgLayers.length; i++) {
    const layer = bgLayers[i];
    const sceneId = `scene_${i + 1}`;
    const plan = planMap[sceneId];

    try {
      let url = null;

      if (!plan || plan.source === "product_image") {
        url = productImageUrl;
      } else if (plan.source === "ai_generate" && plan.prompt) {
        const res = await serverFetch("/api/product-video/generate-scene-image", {
          method: "POST",
          body: JSON.stringify({ productImageUrl, prompt: plan.prompt, projectId }),
        });
        if (res.ok) {
          const data = await res.json();
          url = data.url || null;
        } else {
          url = productImageUrl;
        }
      }

      if (url) {
        const idx = updatedLayers.findIndex((l) => l.id === layer.id);
        if (idx !== -1) updatedLayers[idx] = { ...updatedLayers[idx], src: url };
      }
    } catch (err) {
      console.warn(`[assetInjector] Failed for ${sceneId}:`, err.message);
      const idx = updatedLayers.findIndex((l) => l.id === layer.id);
      if (idx !== -1 && productImageUrl) {
        updatedLayers[idx] = { ...updatedLayers[idx], src: productImageUrl };
      }
    }

    completed++;
    onProgress?.(completed, total);
  }

  for (const layer of productImgLayers) {
    const idx = updatedLayers.findIndex((l) => l.id === layer.id);
    if (idx !== -1 && productImageUrl) {
      updatedLayers[idx] = { ...updatedLayers[idx], src: productImageUrl };
    }
    completed++;
    onProgress?.(completed, total);
  }

  return updatedLayers;
}
