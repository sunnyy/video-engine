/**
 * voiceoverInjector.js
 * src/services/ai/productVideo/voiceoverInjector.js
 *
 * Generates TTS for each scene's spoken text and adds voiceover
 * audio layers to the timeline at the correct start/end times.
 *
 * Uses the existing /api/generate-tts route (OpenAI tts-1-hd).
 * Each scene gets its own voiceover layer.
 * Skips scenes with no spoken text.
 */
import { serverFetch } from "../../serverApi";

export async function injectVoiceovers({
  layers,
  scenes,
  voice = "nova",
  projectId,
  onProgress,
}) {
  // Build scene timing map — scene_1 starts at 0, scene_2 starts where scene_1 ends, etc.
  let cursor = 0;
  const sceneTiming = scenes.map((scene) => {
    const start = cursor;
    const end = cursor + (scene.duration_sec || 3);
    cursor = end;
    return { sceneId: scene.id, start, end, spoken: scene.spoken };
  });

  const MAX_VOICEOVERS = 4;
  const speakingScenes = sceneTiming.filter((s) => s.spoken?.trim()).slice(0, MAX_VOICEOVERS);
  const total = speakingScenes.length;

  let completed = 0;

  const results = await Promise.allSettled(
    speakingScenes.map(async ({ sceneId, start, end, spoken }, i) => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30_000);
      let res;
      try {
        res = await serverFetch("/api/generate-tts", {
          method: "POST",
          body: JSON.stringify({ script: spoken.trim(), voice, speed: 1.0, projectId }),
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timeout);
      }
      if (!res.ok) throw new Error(`TTS failed for ${sceneId}: ${res.status}`);
      const { url } = await res.json();
      completed++;
      onProgress?.(completed, total);
      if (!url) return null;
      return {
        id: `voiceover_${sceneId}_${Date.now()}`,
        type: "audio",
        name: `Voiceover — ${sceneId}`,
        visible: true,
        locked: false,
        trackId: `voiceover_track_${i}`,
        start,
        end,
        src: url,
        trimStart: 0,
        trimEnd: end - start,
        volume: 1.0,
        muted: false,
        fadeIn: 0.1,
        fadeOut: 0.2,
        audioType: "voiceover",
        zIndex: 0,
        transform: null,
        keyframes: {},
        animation: null,
        transition: null,
        sfx: null,
      };
    })
  );

  const voiceoverLayers = results
    .filter((r) => r.status === "fulfilled" && r.value)
    .map((r) => r.value);

  results
    .filter((r) => r.status === "rejected")
    .forEach((r) => console.warn("[voiceoverInjector] Skipped scene:", r.reason?.message));

  return [...layers, ...voiceoverLayers];
}
