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
  visualMode = "image",
  projectId,
  onProgress,
}) {
  const TOTAL = 5;
  const progress = (step, label) => onProgress?.(step, TOTAL, label);

  // Step 1 — Generate scenes (GPT-4o vision, direct URL)
  progress(1, "Analyzing your product...");
  const LAYOUT_SETS = [
    ["LEFT_COLUMN", "RIGHT_COLUMN", "BOTTOM_STRIP"],
    ["FULL_BLEED_TYPOGRAPHIC", "CENTERED_MINIMAL", "BOTTOM_STRIP"],
    ["RIGHT_COLUMN", "BOTTOM_STRIP", "CENTERED_MINIMAL"],
    ["CENTERED_MINIMAL", "BOTTOM_STRIP", "FULL_BLEED_TYPOGRAPHIC"],
  ];
  const forcedLayouts = LAYOUT_SETS[Math.floor(Math.random() * LAYOUT_SETS.length)];
  const scenesRes = await serverFetch("/api/product-video/generate-scenes", {
    method: "POST",
    body: JSON.stringify({ imageUrl: productImageUrl, brandName, ctaText, offerText, website, tagline, forcedLayouts, visualMode }),
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

  // Step 2b — Generate video clips for video scenes
  const finalShotUrls = [...shotUrls];
  if (visualMode === "hybrid" || visualMode === "video") {
    for (let i = 0; i < scenes.length; i++) {
      const scene = scenes[i];
      if (scene.sceneType !== "video") continue;
      const motionPrompt = scene.motionPrompt;
      const sourceImageUrl = shotUrls[i];
      if (!motionPrompt || !sourceImageUrl) continue;
      try {
        const clipRes = await serverFetch("/api/product-ad/generate-clip", {
          method: "POST",
          body: JSON.stringify({ imageUrl: sourceImageUrl, motionPrompt, durationSeconds: 5 }),
        });
        if (clipRes.ok) {
          const { videoUrl } = await clipRes.json();
          if (videoUrl) finalShotUrls[i] = videoUrl;
        } else {
          console.error(`[video-clip] scene ${i} failed:`, clipRes.status);
        }
      } catch (err) {
        console.error(`[video-clip] scene ${i} error:`, err.message);
      }
    }
  }

  // Step 3 — Convert to timeline (deterministic)
  progress(3, "Building your video...");
  const layers = convertScenesToTimeline(aiOutput, finalShotUrls);

  // Ensure every scene has a background image layer
  const sceneDuration = 3.5;
  const safetyLayers = [...layers];
  scenes.forEach((scene, i) => {
    const start = i * sceneDuration;
    const end = start + sceneDuration;
    const shotUrl = finalShotUrls[i];
    const isVideoShot = scene.sceneType === "video" || (shotUrl && shotUrl.includes(".mp4"));
    const hasBg = safetyLayers.some(l => l.start === start && (l.type === "image" || l.type === "video") && l.zIndex === 1);
    if (!hasBg && shotUrl) {
      safetyLayers.unshift({
        id: `s${i}_bg_injected`,
        trackId: `s${i}_bg_injected`,
        type: isVideoShot ? "video" : "image",
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
  const totalDuration = scenes.length * 3.5;
  safetyLayers.push({
    id: "bg_music",
    trackId: "bg_music",
    type: "audio",
    audioType: "music",
    start: 0,
    end: totalDuration,
    src: null,
    volume: 0.4,
    visible: false,
    locked: false,
    sfx: null,
    keyframes: { x: [], y: [], scale: [], rotation: [], opacity: [], blur: [] },
    transform: { x: 0, y: 0, width: 0, height: 0, opacity: 1, rotation: 0, scale: 1, blur: 0, borderRadius: 0, borderWidth: 0, borderColor: "#ffffff" },
  });
  let finalLayers = safetyLayers;
  try {
    const audioSlots = safetyLayers.filter(l => l.type === "audio" && l.audioType === "music" && !l.src);
    console.log(`[music] audio slots available: ${audioSlots.length}, mood: ${aiOutput.productDNA?.mood}`);
    finalLayers = await injectMusic({
      layers: safetyLayers,
      direction: { musicMood: aiOutput.productDNA?.mood, energy: "medium" },
    });
    const injected = finalLayers.filter(l => l.type === "audio" && l.audioType === "music" && l.src);
    console.log(`[music] tracks injected: ${injected.length}`, injected.map(l => ({ src: l.src, name: l.name })));
  } catch (err) {
    console.error("[music] injection failed:", err.message);
  }

  // Step 5 — Voiceover (single TTS for full video)
  progress(5, "Generating voiceover...");
  const voiceoverScript = aiOutput.voiceoverScript?.trim();
  if (voiceoverScript) {
    try {
      const ttsRes = await serverFetch("/api/generate-tts", {
        method: "POST",
        body: JSON.stringify({ script: voiceoverScript, voice: "nova", speed: 1.1, projectId }),
      });
      if (ttsRes.ok) {
        const { url } = await ttsRes.json();
        if (url) {
          finalLayers.push({
            id: "voiceover_main",
            trackId: "voiceover_main",
            type: "audio",
            audioType: "voiceover",
            name: "Voiceover",
            start: 0,
            end: totalDuration,
            src: url,
            volume: 1.0,
            visible: false,
            locked: false,
            muted: false,
            fadeIn: 0.1,
            fadeOut: 0.3,
            sfx: null,
            keyframes: { x: [], y: [], scale: [], rotation: [], opacity: [], blur: [] },
            transform: { x: 0, y: 0, width: 0, height: 0, opacity: 1, rotation: 0, scale: 1, blur: 0, borderRadius: 0, borderWidth: 0, borderColor: "#ffffff" },
          });
          console.log("[voiceover] injected:", voiceoverScript);
        }
      } else {
        console.error("[voiceover] TTS failed:", ttsRes.status);
      }
    } catch (err) {
      console.error("[voiceover] failed:", err.message);
    }
  }

  return {
    layers: finalLayers,
    productAnalysis: aiOutput.productDNA || {},
    totalDuration,
    shots: finalShotUrls.map((url, i) => ({ url, purpose: scenes[i]?.purpose, sceneType: scenes[i]?.sceneType ?? "image" })),
    aiOutput,
  };
}
