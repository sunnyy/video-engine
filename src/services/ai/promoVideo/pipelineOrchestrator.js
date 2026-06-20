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

import { supabaseAdmin, openai }                      from "../../../server/middleware/shared.js";
import { generateFullVoiceover } from "./ttsGenerator.js";
import { pickAutoMood }                               from "../../../core/registries/musicRegistry.js";
import { generateScriptV2, generateNarration, INTENT_PATTERNS, SCENE_WORD_BUDGETS } from "./scriptGenerator.js";
import { planVisualBeats }                           from "./visualDirector.js";
import { designScene }                               from "./sceneDesigner.js";
import { designFreeScene }                           from "./sceneDesignerFree.js";
import { parseSceneHTML }                             from "./htmlParser.js";
import { measureSceneHTML, closeMeasureBrowser }      from "../shared/converter.js";
import { searchStockImage, searchStockVideo }         from "../shared/stock.js";
import { styleImagePrompt }                            from "../shared/visualStyles.js";
import { buildTimeline, buildTimelineFromBeats }      from "./timelineBuilder.js";
import { generateAssetRequirements }                  from "./assetRequirements.js";
import { ASSET_PLACEHOLDER_SRC }                       from "../../../core/utils/placeholders.js";
import { harvestAssets }                               from "./assetHarvester.js";

// ── Helpers ───────────────────────────────────────────────────────────────────

const SKIP_WORDS = new Set(["a","an","the","of","for","with","and","or","in","on","at","to","is","are","be","was","were","that","this","it","as","by","from","into","about","showing","featuring","displaying","dynamic","short","quick","simple","clean","professional","modern","background","scene","shot","image","video","photo","showing"]);

function extractSearchQuery(hint) {
  if (!hint) return "";
  const words = hint.split(/\s+/).filter(w => w.length > 2 && !SKIP_WORDS.has(w.toLowerCase().replace(/[^a-z]/g, "")));
  return words.slice(0, 4).join(" ") || hint.split(/\s+/).slice(0, 3).join(" ");
}

// Stock image — orientation-aware, randomized, Pexels→Pixabay (shared/stock.js).
async function fetchPixabayImage(hint, orientation = "9:16") {
  if (!hint) return null;
  const hit = await searchStockImage(hint, { orientation });
  return hit?.url ?? null;
}

async function generateFalImage(hint, projectId, styleId = "auto") {
  const key = process.env.FAL_API_KEY;
  if (!key || !hint) return null;
  try {
    const prompt = `${hint}, ${styleImagePrompt(styleId, "photo")}, vertical 9:16 portrait composition, sharp focus, 8k quality, no text, no watermark, no people, no faces`;
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

// Stock video b-roll — orientation-aware, randomized, Pexels→Pixabay (shared/stock.js).
async function fetchPixabayVideo(hint, orientation = "9:16") {
  if (!hint) return null;
  const hit = await searchStockVideo(hint, { orientation });
  return hit?.url ?? null;
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

// -- Custom script parser -------------------------------------------------------
// Skips GPT script generation when the user provides their own script.
function parseCustomScript(script, project) {
  const sceneCount      = project.scene_count ?? 3;
  const patterns        = INTENT_PATTERNS?.[sceneCount] ?? [{ intents: ['hook', 'solution', 'cta'] }];
  const selectedPattern = patterns[0];
  const intents         = selectedPattern.intents;

  const sentences = script
    .split(/(?<=[.!?])\s+/)
    .map(s => s.trim())
    .filter(Boolean);

  const perScene = Math.ceil(sentences.length / sceneCount);
  const sceneSentences = Array.from({ length: sceneCount }, (_, i) =>
    sentences.slice(i * perScene, (i + 1) * perScene).join(' ')
  );

  const scenes = intents.map((intent, i) => {
    const budget      = SCENE_WORD_BUDGETS[intent] ?? { duration: 4, words: 16 };
    const segmentText = sceneSentences[i] ?? '';
    return {
      scene_index:      i,
      intent,
      script_segment:   segmentText,
      spoken:           segmentText,
      visual_concept:   `${intent} scene — ${segmentText.slice(0, 60)}`,
      duration_seconds: budget.duration,
    };
  });

  console.log(`[v2/pipeline] custom script: ${scenes.length} scenes parsed from user-provided text`);
  return { full_script: script, scenes, pattern_name: 'custom', pattern_tone: 'User-provided script — follow the text exactly as written.' };
}
// Phase 1 beat pipeline toggle — set false to fall back to the legacy scene pipeline.
const BEAT_PIPELINE = true;
// EXPERIMENTAL: let GPT write natural nested HTML/CSS and flatten it via a headless
// browser (htmlMeasure) instead of the absolute-only parser. Toggle to A/B.
const USE_HEADLESS_MEASURE = true;

export async function runV2Pipeline(project) {
  if (project.video_type === 'talking_head') {
    return await runTHPipeline(project);
  }
  if (BEAT_PIPELINE) {
    return await runV2BeatPipeline(project);
  }

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

  // ── Step 1: Generate or parse script ────────────────────────────────────────
  let scriptResult;
  if (project.script?.trim()) {
    console.log(`[v2/pipeline] ${projectId} — using user-provided script (skipping GPT generation)`);
    scriptResult = parseCustomScript(project.script.trim(), project);
  } else {
    console.log(`[v2/pipeline] ${projectId} — generating script`);
    scriptResult = await generateScriptV2(project);
  }
  let scenes        = scriptResult.scenes.map(s => ({ ...s }));
  const full_script = scriptResult.full_script ?? "";

  // Expose pattern name so scene designer knows if script is user-provided
  projectContext.patternName = scriptResult.pattern_name ?? null;
  const creativeDirection = scriptResult.creative_direction ?? null;
  if (creativeDirection) console.log(`[v2/pipeline] ${projectId} — creative direction: ${creativeDirection}`);

  // ── Steps 2+3: Design scenes in parallel (visual_concept planned upfront, no sequential dependency) ──
  console.log(`[v2/pipeline] ${projectId} — designing ${scenes.length} scenes in parallel`);
  const sceneResults = await Promise.all(
    scenes.map(async (scene, index) => {
      try {
        const sceneProjectContext = {
          ...projectContext,
          archetype:      scene.archetype      ?? null,
          visualConcept:  scene.visual_concept ?? null,
          previousScenes: scenes
            .filter((_, i) => i !== index)
            .map(s => ({ index: s.scene_index, intent: s.intent, archetype: s.archetype ?? null, visual_concept: s.visual_concept })),
        };
        const html = await designScene(scene, sceneProjectContext);
        console.log(`[v2/pipeline] scene ${scene.scene_index} (${scene.intent}) — ${html?.length ?? 0} chars`);
        const graph = parseSceneHTML(html || "", scene.scene_index, canvas);
        console.log(`[v2/pipeline] scene ${scene.scene_index} graph: ${graph.length} layers${graph.length > 0 ? ` — first: ${JSON.stringify(graph[0]).slice(0, 120)}` : " — EMPTY"}`);
        return { graph, html };
      } catch (err) {
        console.error(`[v2/pipeline] scene ${scene.scene_index} design failed:`, err.message);
        return { graph: [], html: null };
      }
    })
  );
  const sceneGraphs = sceneResults.map(r => r.graph);
  const sceneHTMLs  = sceneResults.map(r => r.html);

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
      if (result.wordTimestamps?.length) assignWhisperTimestamps(scenes, result.wordTimestamps);
    } catch (err) {
      console.error("[v2/pipeline] TTS failed (non-fatal):", err.message);
    }
  }

  // ── Step 5: timestamps already assigned from ElevenLabs during TTS step ───
  if (!voiceoverBuffer) {
    console.warn("[v2/pipeline] no audio — using intent-based durations");
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
          volume:    1.0,
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
        layer.src = await fetchPixabayImage(query, formatRatio);
      } else if (layer.assetType === "ai") {
        layer.src = await generateFalImage(layer.assetHint, projectId, project.visual_style);
      } else if (layer.assetType === "asset") {
        layer.assetQueued = true;
        layer.src = ASSET_PLACEHOLDER_SRC;
        layer.isPlaceholder = true;
      }
      if (layer.src) console.log(`[v2/pipeline] resolved ${layer.assetType} placeholder: ${layer.id}`);
    }));
  }

  // Legacy: also resolve old-style asset_requirement="image" scenes from scriptGenerator
  const imageScenes = scenes.filter(s => s.asset_requirement === "image");
  if (imageScenes.length > 0) {
    await Promise.all(imageScenes.map(async (scene) => {
      const query    = extractSearchQuery(scene.asset_hint || project.product_name || "");
      const imageUrl = await fetchPixabayImage(query, formatRatio);
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
  function deriveAspectRatio(w, h) {
    if (!w || !h) return null;
    const r = w / h;
    if (r >= 1.6)            return '16:9 — Landscape';
    if (r <= 0.65)           return '9:16 — Portrait';
    if (r > 0.9 && r < 1.1) return '1:1 — Square';
    if (r > 1.1 && r < 1.6) return '4:3 — Landscape';
    return '3:4 — Portrait';
  }

  const queuedLayers = finalTimeline.layers.filter(
    l => l.type === 'image' && l.assetQueued === true && l.assetType === 'asset'
  );
  const userRequired = queuedLayers.map(layer => {
    const sceneIndex = parseInt((layer.id.match(/^s(d+)_/) || [])[1] ?? '0', 10);
    const w = Math.round(layer.transform?.width  ?? 0);
    const h = Math.round(layer.transform?.height ?? 0);
    return {
      scene_id:     sceneIndex + 1,
      layer_id:     layer.id,
      asset_hint:   layer.assetHint || 'product interface screenshot',
      asset_type:   'asset',
      width:        w || null,
      height:       h || null,
      aspect_ratio: deriveAspectRatio(w, h),
      status:       'pending',
      asset_url:    null,
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
        source:            "promo_video",
        editor_version:    "timeline",
        raw_ai_json:       {
          creative_direction: creativeDirection,
          scenes:     scenes.map(s => ({ sceneIndex: s.scene_index, intent: s.intent, creative_brief: s.creative_brief ?? s.visual_concept ?? null, wants_product_visual: s.wants_product_visual ?? null })),
          sceneHTMLs: sceneHTMLs,
        },
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

// ── V2 Beat pipeline (voiceover-first, timed visual beats) ─────────────────────

async function runV2BeatPipeline(project) {
  const projectId   = project.id;
  const formatRatio = project.format_ratio ?? '9:16';
  const canvas      = CANVAS_SIZES[formatRatio] ?? CANVAS_SIZES['9:16'];

  // ── Step 0: Product-URL harvest (optional) — scrape real copy, brand, screenshots ──
  let harvest = null;
  const productUrl = (project.product_url ?? "").trim();
  // "url"  → the scraped page is the source of truth (name/description/script grounding).
  // "manual" → the user typed their own name/description; the URL only supplies visuals
  //            (screenshots/logo/brand), so we never let scraped copy override the typed
  //            copy and we don't ground the narration in the page text.
  const textSource = project.text_source ?? (productUrl ? "url" : "manual");
  if (productUrl) {
    console.log(`[v2/beats] ${projectId} — harvesting ${productUrl} (text_source=${textSource})`);
    harvest = await harvestAssets(productUrl, `promo-${projectId}-${Date.now()}`);
    if (textSource === "url") {
      // Scraped copy wins; typed/default values are only a fallback if the page is empty.
      project = {
        ...project,
        product_name:        harvest.title       || project.product_name        || "Product",
        product_description: harvest.description || project.product_description || "",
        _harvest:            harvest,
      };
    } else {
      // Manual mode: keep the user's typed copy; only fall back to scraped if a field is
      // blank. No _harvest grounding — the script speaks to the user's own description.
      project = {
        ...project,
        product_name:        project.product_name        || harvest.title       || "Product",
        product_description: project.product_description || harvest.description || "",
      };
    }
  }
  const screenshots = harvest?.screenshotUrls ?? [];

  const projectContext = {
    projectId,
    productName:     project.product_name    ?? "Product",
    niche:           project.style?.niche    ?? "saas",
    // URL mode auto-brands: scraped brand color / logo win. Manual mode respects the
    // user's own Style-step accent and uploaded logo, falling back to scraped only.
    accentColor:     (textSource === "url" ? harvest?.brandColor : null) ?? project.accent_color ?? project.style?.color_palette ?? harvest?.brandColor ?? "#6366f1",
    visualStyle:     project.visual_style    ?? "radiant",
    typographyStyle: project.typography_style ?? "modern",
    logoUrl:         (textSource === "url" ? harvest?.logoUrl : null) ?? project.logo_url ?? harvest?.logoUrl ?? null,
    logoWidth:       project.logo_width      ?? null,
    logoHeight:      project.logo_height     ?? null,
    fps:             30,
    musicMood:       project.style?.music_mood ?? "upbeat",
    voiceId:         project.voice_id        ?? null,
    language:        project.language        ?? "en",
    canvasWidth:     canvas.width,
    canvasHeight:    canvas.height,
    formatRatio,
    theme:           project.theme ?? 'dark',
    tone:            project.tone  ?? 'professional',
    // Director uses this to offer "product_shot" media when real screenshots exist.
    screenshotCount: screenshots.length,
  };

  // ── Step 1: Narration (single continuous voiceover script — always generated) ──
  console.log(`[v2/beats] ${projectId} — generating narration`);
  const narration = await generateNarration(project);
  const full_script = narration.full_script;
  const creativeDirection = narration.creative_direction;
  if (creativeDirection) console.log(`[v2/beats] direction: ${creativeDirection}`);

  // ── Step 2: Voiceover FIRST (so visuals can be timed to real speech) ──────
  let voiceoverAudioUrl = null, voiceoverDuration = 0, wordTimestamps = [];
  try {
    const tts = await generateFullVoiceover(full_script, projectId, projectContext.voiceId);
    voiceoverAudioUrl = tts.audio_url;
    voiceoverDuration = tts.duration_seconds;
    wordTimestamps    = tts.wordTimestamps ?? [];
  } catch (err) {
    console.error("[v2/beats] TTS failed (non-fatal):", err.message);
  }

  // ── Step 3: Visual director → timed beats ─────────────────────────────────
  const beats = await planVisualBeats({ full_script, wordTimestamps, audioDuration: voiceoverDuration, projectContext });

  // ── Step 4: Design each beat in parallel ──────────────────────────────────
  const splitTop = Math.round(canvas.height * 0.55); // media top 55%, text bottom 45%
  const beatResults = await Promise.all(beats.map(async (beat) => {
    try {
      const isMedia    = beat.presentation !== "html";
      const hasOverlay = beat.presentation === "media_full" || beat.presentation === "media_split";
      let media   = null;
      let sceneCtx = { ...projectContext, visualConcept: beat.creative_brief, creativeBrief: beat.creative_brief, wantsProductVisual: beat.wants_product_visual, beatDuration: beat.duration, layout: beat.layout };

      if (isMedia) {
        // map director media_source → asset type + layer kind
        const assetType = beat.media_source === "stock_video"  ? "stock_video"
                        : beat.media_source === "ai_image"     ? "ai"
                        : beat.media_source === "product_shot" ? "product" : "stock";
        const kind = beat.media_source === "stock_video" ? "video" : "image";
        if (beat.presentation === "media_split") {
          media   = { kind, assetType, assetHint: beat.asset_hint, region: { y: 0, height: splitTop } };
          sceneCtx = { ...sceneCtx, overlayMode: true, regionTop: splitTop, regionHeight: canvas.height - splitTop };
        } else {
          media   = { kind, assetType, assetHint: beat.asset_hint, region: { y: 0, height: canvas.height } };
          sceneCtx = { ...sceneCtx, overlayMode: true };
        }
      }

      // media_only beats carry no text — skip the designer entirely (faster + cheaper).
      if (isMedia && !hasOverlay) {
        console.log(`[v2/beats] beat ${beat.beat_index} (${beat.presentation}/${beat.media_source}/${beat.motion}) — media only, no overlay`);
        return { graph: [], media, html: null };
      }

      const pseudoScene = {
        scene_index:          beat.beat_index,
        intent:               beat.presentation,
        script_segment:       beat.spoken,
        creative_brief:       beat.creative_brief,
        wants_product_visual: beat.wants_product_visual,
      };

      // Headless path: GPT writes natural nested CSS → browser measures → layers.
      // Falls back to the absolute-only designer+parser on any failure.
      if (USE_HEADLESS_MEASURE) {
        try {
          const html  = await designFreeScene(pseudoScene, sceneCtx);
          const graph = await measureSceneHTML(html || "", beat.beat_index, canvas);
          console.log(`[v2/beats] beat ${beat.beat_index} (${beat.presentation}/${beat.motion}) — measured ${graph.length} layers${media ? ` + ${media.kind}` : ""}`);
          return { graph, media, html };
        } catch (mErr) {
          console.warn(`[v2/beats] beat ${beat.beat_index} headless measure failed, falling back to parser:`, mErr.message);
          const html  = await designScene(pseudoScene, sceneCtx);
          const graph = parseSceneHTML(html || "", beat.beat_index, canvas);
          return { graph, media, html };
        }
      }

      const html  = await designScene(pseudoScene, sceneCtx);
      const graph = parseSceneHTML(html || "", beat.beat_index, canvas);
      console.log(`[v2/beats] beat ${beat.beat_index} (${beat.presentation}/${beat.motion}) — ${graph.length} layers${media ? ` + ${media.kind}` : ""}`);
      return { graph, media, html };
    } catch (err) {
      console.error(`[v2/beats] beat ${beat.beat_index} design failed:`, err.message);
      return { graph: [], media: null, html: null };
    }
  }));

  // GPT-5.4 scene HTML per beat — saved to raw_ai_json so the design output is inspectable.
  const sceneHTMLs = beatResults.map(r => r.html ?? null);

  if (USE_HEADLESS_MEASURE) { try { await closeMeasureBrowser(); } catch {} }

  // ── Step 5: Build timeline from beats ─────────────────────────────────────
  const { timeline } = buildTimelineFromBeats(beats, beatResults, projectContext);

  // ── Step 6: Inject the single global voiceover layer ──────────────────────
  let finalTimeline = timeline;
  if (voiceoverAudioUrl) {
    const totalDur = finalTimeline.format.duration;
    finalTimeline = {
      ...finalTimeline,
      layers: [
        ...finalTimeline.layers,
        {
          id: "voiceover_full", trackId: "track_voiceover",
          type: "audio", audioType: "voiceover", src: voiceoverAudioUrl,
          start: 0, end: totalDur, zIndex: 0,
          visible: true, locked: false, trimStart: 0, trimEnd: totalDur,
          volume: 1.0, muted: false, fadeIn: 0.1, fadeOut: 0.3,
          sfx: null, keyframes: {}, animation: null, transition: null, transform: null,
        },
      ],
    };
  }

  // ── Step 7: Background music ──────────────────────────────────────────────
  await injectBackgroundMusic(finalTimeline, project);

  // ── Step 7.5: Whoosh SFX on each beat cut ─────────────────────────────────
  await attachBeatTransitionSfx(finalTimeline, beats.length);

  // ── Step 8: Resolve media + product-asset placeholders (image AND video) ──
  // Real product screenshots from the URL harvest fill "product" beats in order;
  // if we run out (or none were captured) the beat degrades to a stock image.
  let shotIdx = 0;
  const placeholderLayers = finalTimeline.layers.filter(l => (l.type === "image" || l.type === "video") && !l.src && l.assetHint);
  await Promise.all(placeholderLayers.map(async (layer) => {
    if (layer.assetType === "product") {
      layer.src = screenshots.length ? screenshots[shotIdx++ % screenshots.length] : null;
      if (!layer.src) { layer.assetType = "stock"; layer.src = await fetchPixabayImage(extractSearchQuery(layer.assetHint), formatRatio); }
    } else if (layer.assetType === "stock") {
      const query = extractSearchQuery(layer.assetHint);
      layer.src = await fetchPixabayImage(query, formatRatio);
    } else if (layer.assetType === "stock_video") {
      layer.src = await fetchPixabayVideo(extractSearchQuery(layer.assetHint), formatRatio);
      // Fallback: no matching stock clip → degrade to a stock image so the beat isn't empty.
      if (!layer.src) {
        layer.type = "image";
        layer.src  = await fetchPixabayImage(extractSearchQuery(layer.assetHint), formatRatio);
        console.warn(`[v2/beats] stock_video had no match for ${layer.id} — fell back to image`);
      }
    } else if (layer.assetType === "ai") {
      layer.src = await generateFalImage(layer.assetHint, projectId, project.visual_style);
    } else if (layer.assetType === "asset") {
      layer.assetQueued  = true;
      layer.src          = ASSET_PLACEHOLDER_SRC;
      layer.isPlaceholder = true;
    }
    if (layer.src) console.log(`[v2/beats] resolved ${layer.assetType} placeholder: ${layer.id}`);
  }));

  // Drop stock/ai media that failed to resolve — an empty image/video box should
  // never render. (asset placeholders keep ASSET_PLACEHOLDER_SRC for user upload.)
  const beforeDrop = finalTimeline.layers.length;
  finalTimeline.layers = finalTimeline.layers.filter(l =>
    !((l.type === "image" || l.type === "video") && !l.src && l.assetType && l.assetType !== "asset"));
  if (finalTimeline.layers.length !== beforeDrop) {
    console.log(`[v2/beats] dropped ${beforeDrop - finalTimeline.layers.length} unresolved media layer(s)`);
  }

  // ── Step 9: Asset manifest (product screenshots only) ─────────────────────
  const assetManifest = buildAssetManifest(finalTimeline);
  await persistAssetManifest(assetManifest, projectId);

  // ── Step 10: Save timeline ────────────────────────────────────────────────
  if (full_script) finalTimeline.full_script = full_script;
  const editorProjectId = await saveTimeline(finalTimeline, project, 'promo_video', {
    creative_direction: creativeDirection,
    beats: beats.map((b, i) => ({
      index: b.beat_index, presentation: b.presentation, motion: b.motion,
      media_source: b.media_source, spoken: b.spoken, creative_brief: b.creative_brief,
      html: sceneHTMLs[i] ?? null, // GPT-5.4 scene HTML/CSS for this beat
    })),
  });

  const totalDuration = parseFloat(finalTimeline.format.duration.toFixed(2));
  return {
    ...project,
    full_script,
    scene_format:      "v2",        // render gate expects "v2"; beat marker is pipeline_version
    pipeline_version:  "v2_beats",
    status:            "script_generated",
    duration_seconds:  totalDuration,
    editor_project_id: editorProjectId,
    _timeline:         finalTimeline,
    _assetManifest:    assetManifest,
    updated_at:        new Date().toISOString(),
  };
}

// ── Shared pipeline helpers (used by both runV2Pipeline and runTHPipeline) ─────

async function resolveImagePlaceholders(finalTimeline, project) {
  const placeholderLayers = finalTimeline.layers.filter(l => l.type === "image" && !l.src && l.assetHint);
  if (!placeholderLayers.length) return;
  await Promise.all(placeholderLayers.map(async (layer) => {
    if (layer.assetType === "stock") {
      const query = extractSearchQuery(layer.assetHint);
      layer.src = await fetchPixabayImage(query, project.format_ratio ?? "9:16");
    } else if (layer.assetType === "ai") {
      layer.src = await generateFalImage(layer.assetHint, project.id, project.visual_style);
    } else if (layer.assetType === "asset") {
      layer.assetQueued = true;
    }
    if (layer.src) console.log(`[v2/pipeline] resolved ${layer.assetType} placeholder: ${layer.id}`);
  }));
}

// Whoosh SFX on each beat cut (beat 1 onward). Attaches to the lowest-z layer of
// the incoming beat via its `sfx` field, which the renderer fires at the layer start.
async function attachBeatTransitionSfx(finalTimeline, beatCount) {
  try {
    const { data: tracks } = await supabaseAdmin.from("sfx_tracks").select("key, public_url").eq("is_active", true);
    const whoosh = (tracks ?? []).find(t => /whoosh|swoosh|woosh|swish|transition/i.test(t.key));
    if (!whoosh) return;
    let attached = 0;
    for (let i = 1; i < beatCount; i++) {
      const layers = finalTimeline.layers.filter(l => l.id?.startsWith(`s${i}_`) && l.type !== "audio");
      if (!layers.length) continue;
      const target = layers.reduce((a, b) => ((a.zIndex ?? 0) <= (b.zIndex ?? 0) ? a : b));
      target.sfx = { key: whoosh.key, src: whoosh.public_url, volume: 0.4, delay: -0.08 };
      attached++;
    }
    if (attached) console.log(`[v2/beats] transition sfx: ${attached}x "${whoosh.key}"`);
  } catch (e) {
    console.warn("[v2/beats] transition sfx skipped:", e.message);
  }
}

async function injectBackgroundMusic(finalTimeline, project, volume = 0.25) {
  try {
    const mood = pickAutoMood(project.video_goal, project.tone);
    const { data: allTracks } = await supabaseAdmin
      .from("music_tracks").select("public_url, title, mood").eq("is_active", true);
    if (allTracks?.length) {
      const moodTracks = allTracks.filter(t => t.mood === mood);
      const pool  = moodTracks.length ? moodTracks : allTracks;
      const track = pool[Math.floor(Math.random() * pool.length)];
      const musicDur = finalTimeline.format.duration;
      finalTimeline.layers.push({
        id: "music_global", trackId: "track_music",
        type: "audio", audioType: "music", src: track.public_url,
        start: 0, end: musicDur, zIndex: 0,
        visible: true, locked: false, trimStart: 0, trimEnd: musicDur,
        volume, muted: false, fadeIn: 1, fadeOut: 1,
        sfx: null, keyframes: {}, animation: null, transition: null, transform: null,
      });
      console.log(`[v2/pipeline] music injected: "${track.title}" (${mood})`);
    }
  } catch (e) {
    console.warn("[v2/pipeline] music injection skipped:", e.message);
  }
}

function buildAssetManifest(finalTimeline) {
  function deriveAspectRatio(w, h) {
    if (!w || !h) return null;
    const r = w / h;
    if (r >= 1.6)            return '16:9 — Landscape';
    if (r <= 0.65)           return '9:16 — Portrait';
    if (r > 0.9 && r < 1.1) return '1:1 — Square';
    if (r > 1.1 && r < 1.6) return '4:3 — Landscape';
    return '3:4 — Portrait';
  }
  const queuedLayers = finalTimeline.layers.filter(
    l => l.type === 'image' && l.assetQueued === true && l.assetType === 'asset'
  );
  const userRequired = queuedLayers.map(layer => {
    const sceneIndex = parseInt((layer.id.match(/^s(\d+)_/) || [])[1] ?? '0', 10);
    const w = Math.round(layer.transform?.width  ?? 0);
    const h = Math.round(layer.transform?.height ?? 0);
    return {
      scene_id:     sceneIndex + 1,
      layer_id:     layer.id,
      asset_hint:   layer.assetHint || 'product interface screenshot',
      asset_type:   'asset',
      width:        w || null,
      height:       h || null,
      aspect_ratio: deriveAspectRatio(w, h),
      status:       'pending',
      asset_url:    null,
    };
  });
  return {
    user_required:               userRequired,
    ai_generate:                 [],
    stock_fetch:                 [],
    placeholders:                [],
    total_user_uploads_required: userRequired.length,
    all_assets_provided:         userRequired.length === 0,
  };
}

async function persistAssetManifest(assetManifest, projectId) {
  console.log(`[v2/pipeline] asset manifest: ${assetManifest.user_required.length} user uploads required`);
  try {
    await supabaseAdmin.from("promo_videos")
      .update({ asset_manifest: assetManifest }).eq("id", projectId);
  } catch (e) {
    console.warn("[v2/pipeline] asset manifest save failed (non-fatal):", e.message);
  }
}

async function saveTimeline(finalTimeline, project, source = 'promo_video', rawAiJson = null) {
  try {
    const { data: editorRow } = await supabaseAdmin
      .from("projects")
      .insert({
        user_id:           project.user_id,
        name:              `${project.product_name ?? "Promo Video"} — Promo`,
        safe_project_json: finalTimeline,
        orientation:       project.format_ratio ?? '9:16',
        mode:              "timeline",
        source,
        editor_version:    "timeline",
        raw_ai_json:       rawAiJson,
      })
      .select("id")
      .single();
    const editorProjectId = editorRow?.id ?? null;
    console.log(`[v2/pipeline] timeline saved to projects (editor: ${editorProjectId})`);
    return editorProjectId;
  } catch (e) {
    console.warn("[v2/pipeline] projects insert failed (non-fatal):", e.message);
    return null;
  }
}

// ── TH transcript normalizer ───────────────────────────────────────────────────

async function normalizeTHTranscript(project) {
  const { scenes: whisperSegments, full_transcript } = project.th_transcript ?? {};

  if (!whisperSegments?.length) {
    throw new Error('No transcript found.');
  }

  const prompt = `You are a short-form video editor making visual decisions for a talking-head video (TikTok/Reels/Shorts style).

The speaker's video plays as the base layer throughout. Your job is to decide, for each spoken moment, what visual treatment to apply — and to synchronize visuals tightly to the speech.

TRANSCRIPT (with timestamps):
${whisperSegments.map(s => `[${s.start}s–${s.end}s]: "${s.spoken}"`).join('\n')}

---

CORE RULE — SPEECH-SYNCED VISUALS:
Visuals must appear the moment the corresponding information is spoken. Do NOT keep th_full running while the speaker says something visual. Every noun, category, list, feature, statistic, product, website, or claim triggers a visual within 0–1 seconds of being spoken.

CRITICAL: The purpose of grouping is NOT to preserve sentences. The purpose of grouping is to maximize visual storytelling. Split based on visual beats, not grammar.

A new group must be created whenever:
- A new concept is introduced
- A list begins
- A feature or category is mentioned
- A comparison is introduced
- A CTA begins
- A reveal begins
- Any visual opportunity appears

GROUPING RULES:
- Split on every new concept, category, or topic shift — even if only 1.5–2 seconds long.
- If the speaker reads a list of related categories, features, examples, resources, or benefits in rapid succession, keep them in a SINGLE visual scene. Animate items appearing progressively as they are spoken. Do NOT create a new scene for every list item. A list that takes 6 seconds to speak is ONE 6-second scene, not 6 scenes.
- Maximum group duration: 5 seconds. Split anything longer.
- Minimum group duration: 1.5 seconds. Merge only if truly no visual opportunity exists.
- Talking-head fullscreen (th_full) scenes must never exceed 3 seconds.
- Maximum total groups: 10.

CRITICAL LIST RULE — this overrides everything else:
When the speaker reads multiple items that are clearly part of the same list — even if they span many Whisper segments — they form ONE single group. Do not start a new group mid-list. The list ends when the speaker moves to a completely different topic.

CONCRETE EXAMPLE using this exact type of script:
WRONG (what you must NOT do):
Group 2: "Free Games" → th_pip (1.6s)
Group 3: "Open Source Software, Learning Materials, Public Domain Books" → th_pip (3.1s)
Group 4: "Tools" → th_split (0.8s)
Group 5: "Extensions और काफी इंटरेस्टिंग कलेक्शन्स" → th_pip (1.8s)

CORRECT (what you must do):
Group 2: "Free Games, Open Source Software, Learning Materials, Public Domain Books, Tools, Extensions और काफी इंटरेस्टिंग कलेक्शन्स" → th_pip (7.4s, visual_source: "categories", archetype: feature_grid)
The entire list = ONE group. One card grid showing all 6 categories.

TREATMENT RULES:

"th_full": Use ONLY for the opening 2–3 seconds of the hook, pure transitions, or goodbyes. If the speaker says ANYTHING that can be shown visually, do NOT use th_full.

"th_hero": TH video fills canvas. GPT-5.4 overlays a title/badge/stat in top safe zone (y 0–15%) or bottom safe zone (y 68–100%) only. Use for: key one-liner statements where speaker stays prominent but a text overlay reinforces the point.

"th_pip": Full canvas generated visual. Speaker appears as small circular PiP bottom-left. Use for: lists, category grids, feature showcases, resource libraries, UI demos — when content needs full screen but speaker should stay visible.

"th_split": TH video top 45%, generated visual bottom 55%. Use for: when speaker references one specific thing to show below them — a named feature, a comparison, a step.

"content_only": Full screen generated visual, speaker hidden. Use for: dramatic reveals, key stats, product name reveal, save/follow CTA takeover. Max 1–2 per video.

VARIETY RULE: Never use the same treatment more than once in a row (exception: th_full at the very start only).

TIMING EXAMPLE for a script like this one:
- "Today I found a website..." → th_full (2s, opening hook only)
- "...with rare internet resources" → th_hero (2s, overlay title "RARE INTERNET RESOURCES")
- "Free Games, Open Source, Books, Tools..." → th_pip (4s, animated category grid fills screen)
- "Save this reel right now" → content_only (2s, bold CTA)
- "These sites don't show up on Google" → th_split (3s, Google vs hidden comparison)
- "Just open the website, select a category..." → th_pip (3s, UI walkthrough mockup)
- "The website is called DeepWebNest" → content_only (2s, hero name reveal)
- "Save and follow for daily websites" → content_only (2s, CTA)

---

VISUAL DIRECTION (required for all non-th_full scenes):
One short phrase describing what to show visually — must match the archetype.
Examples:
- feature_grid: "6 resource category cards, icon per card, staggered reveal"
- split_composition: "Google search bar left, hidden gems vault right"
- minimal_cta: "bold save CTA, animated bookmark icon"
- typography_hero: "RARE INTERNET RESOURCES title overlay, bottom safe zone"
- process_steps: "3 numbered steps, sequential reveal"
- single_stat: "one dominant number, radial glow behind"
Do NOT write layout instructions, pixel sizes, animation timing, or color details. GPT-5.4 handles all of that.

ARCHETYPE — pick one per non-th_full scene:
typography_hero | single_stat | split_composition | numbered_list | feature_grid | full_bleed_image | minimal_cta | proof_social | process_steps | quote_statement

VISUAL SOURCE — pick one per non-th_full scene:
- "categories": the spoken content is a list, grid, features, or named items — build cards, tiles, or a grid entirely in HTML, NO image placeholder
- "asset": a specific product screenshot or UI mockup is needed — include one image-placeholder
- null: th_full scenes only

---

Return ONLY valid JSON:
{
  "groups": [
    {
      "group_index": 0,
      "intent": "hook",
      "treatment": "th_full",
      "script_segment": "exact spoken text",
      "start": 0.0,
      "end": 2.5,
      "duration_seconds": 2.5,
      "visual_direction": null,
      "visual_source": null,
      "archetype": null
    }
  ],
  "full_transcript": "complete transcript"
}

intent options: "hook" | "problem" | "solution" | "feature" | "proof" | "cta"
treatment options: "th_full" | "th_hero" | "th_pip" | "th_split" | "content_only"
visual_direction: detailed string for non-th_full scenes, null for th_full
visual_source: "categories" | "asset" | null
archetype: pick one for non-th_full scenes, null for th_full`;

  const response = await openai.chat.completions.create({
    model:           'gpt-4.1',
    messages:        [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' },
    temperature:     0.1,
  });

  const { groups, full_transcript: cleanedTranscript } = JSON.parse(
    response.choices[0].message.content
  );
  console.log('[normalizeTHTranscript] raw groups:', JSON.stringify(groups, null, 2));

  const thPatternMap = {
    th_full:      'th_full',
    th_hero:      'hero',
    th_pip:       'pip',
    th_split:     'split',
    content_only: 'content_only',
  };

  const scenes = (groups ?? []).map(g => ({
    ...g,
    scene_index:    g.group_index,
    spoken:         g.script_segment,
    thPattern:      thPatternMap[g.treatment] ?? 'th_full',
    visual_concept: g.visual_direction ?? '',
    visual_source:  g.visual_source ?? null,
    archetype:      g.archetype ?? null,
    classification: g.treatment === 'th_full' ? 'th_only' : 'generate_scene',
  }));

  const genCount = scenes.filter(s => s.classification === 'generate_scene').length;
  console.log(`[v2/pipeline-th] grouped into ${scenes.length} scenes: ${genCount} with visuals, ${scenes.length - genCount} th_full`);
  return { scenes, full_transcript: cleanedTranscript ?? full_transcript, groups };
}

// ── TH v2 pipeline ─────────────────────────────────────────────────────────────

async function runTHPipeline(project) {
  const projectId   = project.id;
  const formatRatio = project.format_ratio ?? '9:16';
  const canvas      = CANVAS_SIZES[formatRatio] ?? CANVAS_SIZES['9:16'];

  console.log(`[v2/pipeline-th] ${projectId} — starting TH pipeline`);

  // Step 1 — Normalize Whisper transcript into intent-tagged scene segments
  const { scenes, full_transcript, groups: rawGroups } = await normalizeTHTranscript(project);

  // Step 2 — Build project context
  const projectContext = {
    projectId,
    productName:        project.product_name     ?? 'Product',
    productDescription: project.product_description ?? '',
    niche:              project.style?.niche     ?? 'saas',
    accentColor:        project.accent_color     ?? '#6366f1',
    visualStyle:        project.visual_style     ?? 'radiant',
    typographyStyle:    project.typography_style ?? 'modern',
    theme:              project.theme            ?? 'dark',
    language:           project.language         ?? 'en',
    tone:               project.tone             ?? 'professional',
    logoUrl:            project.logo_url         ?? null,
    logoWidth:          project.logo_width       ?? null,
    logoHeight:         project.logo_height      ?? null,
    canvasWidth:        canvas.width,
    canvasHeight:       canvas.height,
    formatRatio,
    videoType:          'talking_head',
    fps:                30,
    patternName:        null,
  };

  // Step 3 — Design scenes: th_full = fullscreen TH video only, split/content_only = generate visuals
  const genNeeded = scenes.filter(s => s.thPattern !== 'th_full').length;
  console.log(`[v2/pipeline-th] ${projectId} — designing ${genNeeded} of ${scenes.length} scenes`);
  const sceneGraphs     = [];
  const thSceneHTMLs    = new Array(scenes.length).fill(null);
  const generatedScenes = [];

  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i];

    if (scene.thPattern === 'th_full') {
      console.log(`[v2/pipeline-th] scene ${i} — th_full (${scene.duration_seconds?.toFixed(1)}s) — fullscreen`);
      sceneGraphs.push([]);
      continue;
    }

    try {
      const sceneProjectContext = {
        ...projectContext,
        archetype:      scene.archetype      ?? null,
        sceneIntent:    scene.intent,
        visualConcept:  scene.visual_concept,
        visual_source:  scene.visual_source  ?? null,
        previousScenes: generatedScenes.slice(-2).map(s => ({
          index:          s.scene_index,
          intent:         s.intent,
          archetype:      s.archetype        ?? null,
          visual_concept: s.visual_concept,
        })),
      };
      const html = await designScene(scene, sceneProjectContext);
      thSceneHTMLs[i] = html;
      const graph = parseSceneHTML(html || '', i, canvas);
      console.log(`[v2/pipeline-th] scene ${i} (${scene.intent}/${scene.thPattern}) — ${graph.length} layers`);
      sceneGraphs.push(graph);
      generatedScenes.push(scene);
    } catch (err) {
      console.error(`[v2/pipeline-th] scene ${i} design failed:`, err.message);
      sceneGraphs.push([]);
    }
  }

  // Step 4 — Build timeline from scene graphs
  const { timeline: rawTimeline, asset_queue } = buildTimeline(sceneGraphs, scenes, projectContext);

  // Step 5 — Inject TH video layer spanning full duration
  // src is null here — filled in at render time when user uploads the video to Supabase
  const totalDur      = rawTimeline.format.duration;
  const finalTimeline = {
    ...rawTimeline,
    layers: [
      {
        id:          'th_video_base',
        trackId:     'track_th_base',
        name:        'TH Video',
        type:        'video',
        src:         null,
        objectFit:   'cover',
        start:       0,
        end:         totalDur,
        zIndex:      0,
        visible:     true,
        locked:      false,
        sfx:         null,
        keyframes:   { x: [], y: [], blur: [], scale: [], opacity: [], rotation: [] },
        transition:  { in: { type: 'none', duration: 0 }, out: { type: 'none', duration: 0 } },
        transform:   { x: 0, y: 0, blur: 0, scale: 1, width: canvas.width, height: canvas.height, opacity: 1, rotation: 0, borderColor: '#ffffff', borderWidth: 0, borderRadius: 0 },
        volume:      1,
        muted:       false,
      },
      ...rawTimeline.layers,
    ],
  };

  // Step 5b — Inject positioned TH video clip layers for hero/split/pip scenes
  // Compute scene start/end timings by walking cumulative durations (mirrors buildTimeline cursor)
  {
    let tc = 0;
    for (let i = 0; i < scenes.length; i++) {
      const scene  = scenes[i];
      const dur    = parseFloat((scene.duration_seconds ?? 0).toFixed(4));
      const tStart = parseFloat(tc.toFixed(4));
      const tEnd   = parseFloat((tc + dur).toFixed(4));
      tc = tEnd;

      if (scene.thPattern === 'th_full' || scene.thPattern === 'content_only' || !scene.thPattern) continue;

      const sid = `s${i}_th`;
      let clipLayer = null;

      if (scene.thPattern === 'hero') {
        clipLayer = {
          id:         `${sid}_hero`,
          trackId:    'track_th_clip',
          name:       'TH Hero',
          type:       'video',
          src:        '__TH_VIDEO__',
          objectFit:  'cover',
          start:      tStart,
          end:        tEnd,
          zIndex:     2,
          visible:    true,
          locked:     false,
          sfx:        null,
          keyframes:  { x: [], y: [], blur: [], scale: [], opacity: [], rotation: [] },
          transition: { in: { type: 'none', duration: 0 }, out: { type: 'none', duration: 0 } },
          transform:  { x: 0, y: 0, blur: 0, scale: 1, width: canvas.width, height: canvas.height, opacity: 1, rotation: 0, borderColor: '#ffffff', borderWidth: 0, borderRadius: 0 },
          volume:     0,
          muted:      true,
        };
      } else if (scene.thPattern === 'split') {
        const splitH = Math.round(canvas.height * 0.45);
        clipLayer = {
          id:         `${sid}_split`,
          trackId:    'track_th_clip',
          name:       'TH Split',
          type:       'video',
          src:        '__TH_VIDEO__',
          objectFit:  'cover',
          start:      tStart,
          end:        tEnd,
          zIndex:     2,
          visible:    true,
          locked:     false,
          sfx:        null,
          keyframes:  { x: [], y: [], blur: [], scale: [], opacity: [], rotation: [] },
          transition: { in: { type: 'none', duration: 0 }, out: { type: 'none', duration: 0 } },
          transform:  { x: 0, y: 0, blur: 0, scale: 1, width: canvas.width, height: splitH, opacity: 1, rotation: 0, borderColor: '#ffffff', borderWidth: 0, borderRadius: 0 },
          volume:     0,
          muted:      true,
        };
      } else if (scene.thPattern === 'pip') {
        const pipSize = Math.floor(canvas.width * 0.305); // ~330px at 1080
        const pipY = canvas.height - pipSize - 40; // ~1550px at 1920
        clipLayer = {
          id:         `${sid}_pip`,
          trackId:    'track_th_clip',
          name:       'TH PiP',
          type:       'video',
          src:        '__TH_VIDEO__',
          objectFit:  'cover',
          start:      tStart,
          end:        tEnd,
          zIndex:     50,
          visible:    true,
          locked:     false,
          sfx:        null,
          keyframes:  { x: [], y: [], blur: [], scale: [], opacity: [{ time: 0.1, value: 0 }, { time: 0.4, value: 1 }], rotation: [] },
          transition: { in: { type: 'fade', duration: 0.3 }, out: { type: 'none', duration: 0 } },
          transform:  { x: 40, y: pipY, blur: 0, scale: 1, width: pipSize, height: pipSize, opacity: 1, rotation: 0, borderColor: '#ffffff', borderWidth: 3, borderRadius: pipSize / 2 },
          volume:     0,
          muted:      true,
        };
      }

      if (clipLayer) finalTimeline.layers.push(clipLayer);
    }
  }

  // Step 6 — Resolve image placeholders
  await resolveImagePlaceholders(finalTimeline, project);

  // Step 7 — Background music (quiet — TH audio is the primary track)
  await injectBackgroundMusic(finalTimeline, project, 0.12);

  // Step 8 — Asset manifest
  const assetManifest = buildAssetManifest(finalTimeline);
  await persistAssetManifest(assetManifest, projectId);

  // Step 9 — Save timeline
  if (full_transcript) finalTimeline.full_script = full_transcript;
  const editorProjectId = await saveTimeline(finalTimeline, project, 'promo_video_th', {
    groups:     rawGroups ?? null,
    sceneHTMLs: thSceneHTMLs,
  });

  return {
    ...project,
    scenes,
    script:            full_transcript,
    full_script:       full_transcript,
    scene_format:      'v2',
    pipeline_version:  'v2',
    status:            'script_generated',
    has_script:        true,
    duration_seconds:  parseFloat(totalDur.toFixed(2)),
    editor_project_id: editorProjectId,
    _timeline:         finalTimeline,
    _asset_queue:      asset_queue,
    _assetManifest:    assetManifest,
    updated_at:        new Date().toISOString(),
  };
}
