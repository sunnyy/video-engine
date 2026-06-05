/**
 * pipelineOrchestrator.js
 * src/services/ai/promoVideo/v2/pipelineOrchestrator.js
 *
 * V2 pipeline — single continuous voiceover model.
 *
 * Flow:
 *   1.  Generate script  → full_script + scenes (intent-based duration budgets)
 *   1.5 Save asset manifest early
 *   2.  Design scenes as HTML
 *   3.  Parse HTML → scene graphs
 *   4.  Generate ONE TTS voiceover for full_script
 *   5.  Whisper transcription → word-level timestamps
 *   6.  Assign actual scene durations from Whisper timestamps
 *   7.  Build timeline (cursor-based, using Whisper-corrected durations)
 *   8.  Inject single global voiceover audio layer
 *   9.  Background music
 *  10.  Pixabay stock images
 *  11.  Save timeline to projects table
 */

import { supabaseAdmin }                              from "../../../../server/middleware/shared.js";
import { generateFullVoiceover, transcribeWithTimestamps } from "../ttsGenerator.js";
import { pickAutoMood }                               from "../../../../core/registries/musicRegistry.js";
import { generateScriptV2 }                           from "./scriptGenerator.js";
import { designScene }                                from "./sceneDesigner.js";
import { parseSceneHTML }                             from "./htmlParser.js";
import { buildTimeline }                              from "./timelineBuilder.js";
import { generateAssetRequirements }                  from "../assetRequirements.js";

// ── Helpers ───────────────────────────────────────────────────────────────────

const SKIP_WORDS = new Set(["a","an","the","of","for","with","and","or","in","on","at","to","is","are","be","was","were","that","this","it","as","by","from","into","about","showing","featuring","displaying","dynamic","short","quick","simple","clean","professional","modern","background","scene","shot","image","video","photo","showing"]);

function extractSearchQuery(hint) {
  if (!hint) return "";
  const words = hint.split(/\s+/).filter(w => w.length > 2 && !SKIP_WORDS.has(w.toLowerCase().replace(/[^a-z]/g, "")));
  return words.slice(0, 4).join(" ") || hint.split(/\s+/).slice(0, 3).join(" ");
}

async function fetchPixabayImage(hint) {
  const key = process.env.VITE_PIXABAY_API_KEY;
  if (!key || !hint) return null;
  try {
    const url = `https://pixabay.com/api/?key=${encodeURIComponent(key)}&q=${encodeURIComponent(hint)}&image_type=photo&orientation=vertical&per_page=3&safesearch=true`;
    const res  = await fetch(url);
    const data = await res.json();
    return data.hits?.[0]?.largeImageURL ?? null;
  } catch (e) {
    console.error("[v2/pipeline] Pixabay error:", e.message);
    return null;
  }
}

async function generateFalImage(hint, projectId) {
  const key = process.env.FAL_API_KEY;
  if (!key || !hint) return null;
  try {
    const prompt = `${hint}, vertical 9:16 portrait composition, photorealistic, sharp focus, 8k quality, no text, no watermark, no people, no faces`;
    const falRes = await fetch("https://fal.run/fal-ai/flux/schnell", {
      method:  "POST",
      headers: { "Authorization": `Key ${key}`, "Content-Type": "application/json" },
      body:    JSON.stringify({ prompt, image_size: "portrait_16_9", num_images: 1, num_inference_steps: 4, enable_safety_checker: false }),
    });
    if (!falRes.ok) return null;
    const data  = await falRes.json();
    const falUrl = data?.images?.[0]?.url ?? null;
    if (!falUrl) return null;

    // Re-upload to Supabase so URL is permanent (fal.media URLs expire)
    const imgRes = await fetch(falUrl);
    if (!imgRes.ok) return falUrl;
    const buffer   = Buffer.from(await imgRes.arrayBuffer());
    const filePath = `${projectId ?? "promo"}/v2-ai-images/ai-gen-${Date.now()}.jpg`;
    const { error: upErr } = await supabaseAdmin.storage
      .from("user-assets").upload(filePath, buffer, { contentType: "image/jpeg", upsert: false });
    if (upErr) return falUrl;
    const { data: pub } = supabaseAdmin.storage.from("user-assets").getPublicUrl(filePath);
    return pub?.publicUrl ?? falUrl;
  } catch (e) {
    console.error("[v2/pipeline] Fal.ai error:", e.message);
    return null;
  }
}

/**
 * assignWhisperTimestamps(scenes, whisperWords)
 *
 * Matches each scene's script_segment to the sequential Whisper word list
 * by word count. Sets scene.vo_start, scene.vo_end, scene.duration_seconds.
 */
function assignWhisperTimestamps(scenes, whisperWords) {
  if (!whisperWords.length) return;

  let wordIdx = 0;

  for (const scene of scenes) {
    const segText  = (scene.script_segment ?? scene.spoken ?? "").trim();
    const segWords = segText.split(/\s+/).filter(Boolean).length;

    if (segWords === 0 || wordIdx >= whisperWords.length) continue;

    const startWord = whisperWords[wordIdx];
    const endWord   = whisperWords[Math.min(wordIdx + segWords - 1, whisperWords.length - 1)];

    scene.vo_start = parseFloat((startWord?.start ?? 0).toFixed(3));
    scene.vo_end   = parseFloat((endWord?.end   ?? scene.vo_start + (scene.duration ?? 3)).toFixed(3));

    const whisperDur = scene.vo_end - scene.vo_start;
    // Use Whisper duration; enforce a 1s minimum so the scene doesn't vanish
    scene.duration_seconds = parseFloat(Math.max(1.0, whisperDur).toFixed(3));

    wordIdx = Math.min(wordIdx + segWords, whisperWords.length);
  }

  console.log(`[v2/pipeline] Whisper timestamps assigned to ${scenes.length} scenes`);
}

// ── Main export ───────────────────────────────────────────────────────────────

const CANVAS_SIZES = {
  '9:16': { width: 1080, height: 1920 },
  '16:9': { width: 1920, height: 1080 },
  '1:1':  { width: 1080, height: 1080 },
};

export async function runV2Pipeline(project) {
  const projectId = project.id;

  const formatRatio = project.format_ratio ?? '9:16';
  const canvas      = CANVAS_SIZES[formatRatio] ?? CANVAS_SIZES['9:16'];

  // ── Build projectContext ──────────────────────────────────────────────────
  const projectContext = {
    projectId,
    productName:     project.product_name          ?? "Product",
    niche:           project.style?.niche           ?? "saas",
    accentColor:     project.accent_color           ?? project.style?.color_palette ?? "#6366f1",
    visualStyle:     project.visual_style           ?? "radiant",
    typographyStyle: project.typography_style       ?? "modern",
    logoUrl:         project.logo_url               ?? null,
    logoWidth:       project.logo_width             ?? null,
    logoHeight:      project.logo_height            ?? null,
    fps:             30,
    mood:            project.style?.music_mood      ?? null,
    musicMood:       project.style?.music_mood      ?? "upbeat",
    voiceId:         project.voice_id               ?? null,
    sceneCount:      project.scene_count            ?? "auto",
    language:        project.language               ?? "en",
    canvasWidth:     canvas.width,
    canvasHeight:    canvas.height,
    formatRatio,
    theme:           project.theme ?? 'dark',
    tone:            project.tone  ?? 'professional',
  };

  // ── Step 1: Generate script ───────────────────────────────────────────────
  console.log(`[v2/pipeline] ${projectId} — generating script`);
  const scriptResult = await generateScriptV2(project);
  let scenes     = scriptResult.scenes.map(s => ({ ...s }));
  const full_script = scriptResult.full_script ?? "";

  // ── Steps 2+3: Design scenes in parallel (visual_concept planned upfront, no sequential dependency) ──
  console.log(`[v2/pipeline] ${projectId} — designing ${scenes.length} scenes in parallel`);
  const sceneGraphs = await Promise.all(
    scenes.map(async (scene, index) => {
      try {
        const html = await designScene(scene, {
          ...projectContext,
          visualConcept:  scene.visual_concept ?? null,
          previousScenes: scenes
            .filter((_, i) => i !== index)
            .map(s => ({ index: s.scene_index, intent: s.intent, visual_concept: s.visual_concept })),
        });
        console.log(`[v2/pipeline] scene ${scene.scene_index} (${scene.intent}) — ${html?.length ?? 0} chars`);
        const graph = parseSceneHTML(html || "", scene.scene_index, canvas);
        console.log(`[v2/pipeline] scene ${scene.scene_index} graph: ${graph.length} layers${graph.length > 0 ? ` — first: ${JSON.stringify(graph[0]).slice(0, 120)}` : " — EMPTY"}`);
        return graph;
      } catch (err) {
        console.error(`[v2/pipeline] scene ${scene.scene_index} design failed:`, err.message);
        return [];
      }
    })
  );

  // ── Step 4: Single TTS for the full continuous voiceover ──────────────────
  // Trim full_script to dev-capped scenes if needed
  const devScript = process.env.NODE_ENV !== "production"
    ? scenes.map(s => s.script_segment ?? s.spoken ?? "").join(" ").trim()
    : full_script;

  let voiceoverAudioUrl    = null;
  let voiceoverDuration    = 0;
  let voiceoverBuffer      = null;

  if (devScript.trim()) {
    console.log(`[v2/pipeline] ${projectId} — generating single voiceover (${devScript.split(/\s+/).length} words)`);
    try {
      const result = await generateFullVoiceover(devScript, projectId, projectContext.voiceId);
      voiceoverAudioUrl = result.audio_url;
      voiceoverDuration = result.duration_seconds;
      voiceoverBuffer   = result.buffer;
    } catch (err) {
      console.error("[v2/pipeline] TTS failed (non-fatal):", err.message);
    }
  }

  // ── Step 5: Whisper transcription → word-level timestamps ─────────────────
  if (voiceoverBuffer) {
    const whisperWords = await transcribeWithTimestamps(voiceoverBuffer);
    assignWhisperTimestamps(scenes, whisperWords);
  } else {
    console.warn("[v2/pipeline] no audio buffer — using intent-based durations");
  }

  // Extend last scene so total scene duration covers the full voiceover audio.
  // Whisper timestamps often leave a small gap at the end because the last word
  // boundary doesn't perfectly align with the actual audio file length.
  if (voiceoverDuration > 0 && scenes.length > 0) {
    const TRAIL_BUFFER = 0.4;
    const sumDurations = scenes.reduce((acc, s) => acc + (s.duration_seconds ?? 0), 0);
    const last = scenes[scenes.length - 1];
    if (voiceoverDuration > sumDurations) {
      const extension = parseFloat((voiceoverDuration - sumDurations).toFixed(3));
      last.duration_seconds = parseFloat(((last.duration_seconds ?? 0) + extension).toFixed(3));
      console.log(`[v2/pipeline] extended last scene by ${extension}s to match voiceover`);
    }
    last.duration_seconds = parseFloat(((last.duration_seconds ?? 0) + TRAIL_BUFFER).toFixed(3));
    console.log(`[v2/pipeline] added ${TRAIL_BUFFER}s trail buffer to last scene`);
  }

  // ── Step 6: Build final timeline ──────────────────────────────────────────
  // scene.duration_seconds is now set from Whisper (or falls back to intent budget)
  const { timeline, asset_queue } = buildTimeline(sceneGraphs, scenes, projectContext);

  // ── Step 7: Inject single global voiceover layer ──────────────────────────
  let finalTimeline = timeline;
  if (voiceoverAudioUrl) {
    const totalDur = finalTimeline.format.duration;
    finalTimeline = {
      ...finalTimeline,
      layers: [
        ...finalTimeline.layers,
        {
          id:        "voiceover_full",
          trackId:   "track_voiceover",
          type:      "audio",
          audioType: "voiceover",
          src:       voiceoverAudioUrl,
          start:     0,
          end:       totalDur,
          zIndex:    0,
          visible:   true,
          locked:    false,
          trimStart: 0,
          trimEnd:   totalDur,
          volume:    1.5,
          muted:     false,
          fadeIn:    0.1,
          fadeOut:   0.3,
          sfx:       null,
          keyframes: {},
          animation: null,
          transition: null,
          transform:  null,
        },
      ],
    };
  }

  // ── Step 8: Background music ──────────────────────────────────────────────
  try {
    const mood = pickAutoMood(project.video_goal, project.tone);
    const { data: allTracks } = await supabaseAdmin
      .from("music_tracks")
      .select("public_url, title, mood")
      .eq("is_active", true);

    if (allTracks?.length) {
      const moodTracks = allTracks.filter(t => t.mood === mood);
      const pool  = moodTracks.length ? moodTracks : allTracks;
      const track = pool[Math.floor(Math.random() * pool.length)];
      const musicDur = finalTimeline.format.duration;
      finalTimeline.layers.push({
        id: "music_global", trackId: "track_music",
        type: "audio", audioType: "music", src: track.public_url,
        start: 0, end: musicDur, zIndex: 0,
        visible: true, locked: false,
        trimStart: 0, trimEnd: musicDur,
        volume: 0.25, muted: false, fadeIn: 1, fadeOut: 1,
        sfx: null, keyframes: {}, animation: null, transition: null, transform: null,
      });
      console.log(`[v2/pipeline] music injected: "${track.title}" (${mood})`);
    }
  } catch (e) {
    console.warn("[v2/pipeline] music injection skipped:", e.message);
  }

  // ── Step 9: Resolve image placeholders (stock via Pixabay, ai via Fal.ai, asset queued) ──
  const placeholderLayers = finalTimeline.layers.filter(l => l.type === "image" && !l.src && l.assetHint);
  if (placeholderLayers.length > 0) {
    await Promise.all(placeholderLayers.map(async (layer) => {
      if (layer.assetType === "stock") {
        const query = extractSearchQuery(layer.assetHint);
        layer.src = await fetchPixabayImage(query);
      } else if (layer.assetType === "ai") {
        layer.src = await generateFalImage(layer.assetHint, projectId);
      } else if (layer.assetType === "asset") {
        layer.assetQueued = true;
      }
      if (layer.src) console.log(`[v2/pipeline] resolved ${layer.assetType} placeholder: ${layer.id}`);
    }));
  }

  // Legacy: also resolve old-style asset_requirement="image" scenes from scriptGenerator
  const imageScenes = scenes.filter(s => s.asset_requirement === "image");
  if (imageScenes.length > 0) {
    await Promise.all(imageScenes.map(async (scene) => {
      const query    = extractSearchQuery(scene.asset_hint || project.product_name || "");
      const imageUrl = await fetchPixabayImage(query);
      if (imageUrl) {
        scene.asset_url = imageUrl;
        const sceneIdx  = scene.scene_index;
        for (const layer of finalTimeline.layers) {
          if (layer.type === "image" && layer.id?.startsWith(`s${sceneIdx}_`) && !layer.src) {
            layer.src = imageUrl;
          }
        }
      }
    }));
  }

  // Embed full_script in the timeline JSON so it's accessible from the saved project
  if (full_script) finalTimeline.full_script = full_script;

  // ── Build asset manifest from actual queued layers (after placeholder resolution) ──
  // Step 1.5 was removed — v2 scene objects don't carry asset requirements, the
  // timeline layers do. We scan here when the truth is known.
  const queuedLayers = finalTimeline.layers.filter(
    l => l.type === "image" && l.assetQueued === true && l.assetType === "asset"
  );
  const userRequired = queuedLayers.map(layer => {
    const sceneIndex = parseInt((layer.id.match(/^s(\d+)_/) || [])[1] ?? "0", 10);
    return {
      scene_id:   sceneIndex + 1,
      layer_id:   layer.id,
      asset_hint: layer.assetHint || "product interface screenshot",
      asset_type: "asset",
      status:     "pending",
      asset_url:  null,
    };
  });
  const assetManifest = {
    user_required:               userRequired,
    ai_generate:                 [],
    stock_fetch:                 [],
    placeholders:                [],
    total_user_uploads_required: userRequired.length,
    all_assets_provided:         userRequired.length === 0,
  };
  console.log(`[v2/pipeline] ${projectId} — asset manifest: ${userRequired.length} user uploads required`);
  try {
    await supabaseAdmin
      .from("promo_videos")
      .update({ asset_manifest: assetManifest })
      .eq("id", projectId);
  } catch (e) {
    console.warn("[v2/pipeline] asset manifest save failed (non-fatal):", e.message);
  }

  // ── Step 10: Save timeline to projects table ──────────────────────────────
  let editorProjectId = null;
  try {
    const { data: editorRow } = await supabaseAdmin
      .from("projects")
      .insert({
        user_id:           project.user_id,
        name:              `${project.product_name ?? "Promo Video"} — Promo`,
        safe_project_json: finalTimeline,
        orientation:       formatRatio,
        mode:              "timeline",
        source:            "promo_video_v2",
        editor_version:    "timeline",
        raw_ai_json:       { scenes: scenes.map(s => ({ sceneIndex: s.scene_index, intent: s.intent, visual_concept: s.visual_concept })) },
      })
      .select("id")
      .single();
    editorProjectId = editorRow?.id ?? null;
    console.log(`[v2/pipeline] ${projectId} — timeline saved to projects (editor: ${editorProjectId})`);
  } catch (e) {
    console.warn("[v2/pipeline] projects insert failed (non-fatal):", e.message);
  }

  const totalDuration = parseFloat(finalTimeline.format.duration.toFixed(2));

  return {
    ...project,
    scenes,
    full_script,
    scene_format:       "v2",
    pipeline_version:   "v2",
    status:             "script_generated",
    duration_seconds:   totalDuration,
    editor_project_id:  editorProjectId,
    _timeline:          finalTimeline,
    _asset_queue:       asset_queue,
    _assetManifest:     assetManifest,
    updated_at:         new Date().toISOString(),
  };
}
