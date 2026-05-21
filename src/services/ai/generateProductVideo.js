import { serverFetch } from "../serverApi";
import { injectMusic } from "./productVideo/musicInjector";
import { convertScenesToTimeline } from "./productVideo/sceneConverter";

export async function generateProductVideo({
  productImageUrl,
  brandName = "",
  videoType = "promo",
  offerText = "",
  ctaText = "Shop Now",
  website = "",
  tagline = "",
  projectId,
  onProgress,
}) {
  const TOTAL = 4;
  const progress = (step, label) => onProgress?.(step, TOTAL, label);

  // Step 1 — Generate scenes (GPT-4o vision, direct URL)
  progress(1, "Analyzing your product...");
  const scenesRes = await serverFetch("/api/product-video/generate-scenes", {
    method: "POST",
    body: JSON.stringify({ imageUrl: productImageUrl, brandName, ctaText, offerText, website, tagline }),
  });
  if (!scenesRes.ok) throw new Error("Scene generation failed");
  const aiOutput = await scenesRes.json();
  const scenes = aiOutput.scenes || [];

  // Background removal (non-fatal, fire-and-forget)
  serverFetch("/api/product-video/remove-background", {
    method: "POST",
    body: JSON.stringify({ imageUrl: productImageUrl, projectId }),
  }).catch(() => {});

  // Step 2 — Generate shots (one per scene)
  progress(2, "Creating your visuals...");
  const shotUrls = [];
  for (const scene of scenes) {
    try {
      const shotRes = await serverFetch("/api/product-video/generate-shots", {
        method: "POST",
        body: JSON.stringify({
          productImageUrl,
          productCutoutUrl: null,
          projectId,
          singleShot: { purpose: scene.purpose, prompt: scene.visual?.prompt || "" },
        }),
      });
      if (shotRes.ok) {
        const shotData = await shotRes.json();
        shotUrls.push(shotData.shots?.[0]?.url || productImageUrl);
      } else {
        shotUrls.push(productImageUrl);
      }
    } catch {
      shotUrls.push(productImageUrl);
    }
    await new Promise(r => setTimeout(r, 500));
  }

  // Step 3 — Convert to timeline (deterministic)
  progress(3, "Building your video...");
  const layers = convertScenesToTimeline(aiOutput, shotUrls);

  // Ensure every scene has a background image layer
  const sceneDuration = 2.5;
  const safetyLayers = [...layers];
  scenes.forEach((scene, i) => {
    const start = i * sceneDuration;
    const end = start + sceneDuration;
    const shotUrl = shotUrls[i];
    const hasBg = safetyLayers.some(l => l.start === start && l.type === "image" && l.zIndex === 1);
    if (!hasBg && shotUrl) {
      safetyLayers.unshift({
        id: `s${i}_bg_injected`,
        trackId: `s${i}_bg_injected`,
        type: "image",
        src: shotUrl,
        objectFit: "cover",
        start, end,
        zIndex: 1,
        visible: true, locked: false, sfx: null,
        transform: { x: 0, y: 0, width: 1080, height: 1920, opacity: 1, rotation: 0, scale: 1, blur: 0, borderRadius: 0, borderWidth: 0, borderColor: "#ffffff" },
        keyframes: { x: [], y: [], scale: [{ time: 0, value: 1, easing: "linear" }, { time: end - start, value: 1.06, easing: "linear" }], rotation: [], opacity: [], blur: [] },
        animation: { in: { type: "fade", duration: 0.5 }, out: { type: "none", duration: 0.3 } },
        transition: { type: "fade", duration: 0.5 },
      });
    }
  });

  // Step 4 — Music
  progress(4, "Adding music...");
  let finalLayers = safetyLayers;
  try {
    finalLayers = await injectMusic({
      layers,
      direction: { musicMood: aiOutput.productDNA?.mood, energy: "medium" },
    });
  } catch { /* non-fatal */ }

  const totalDuration = scenes.length * 2.5;

  return {
    layers: finalLayers,
    productAnalysis: aiOutput.productDNA || {},
    totalDuration,
    shots: shotUrls.map((url, i) => ({ url, purpose: scenes[i]?.purpose })),
  };
}
