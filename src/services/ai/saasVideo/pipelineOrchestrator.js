/**
 * pipelineOrchestrator.js
 * src/services/ai/saasVideo/pipelineOrchestrator.js
 *
 * SaaS Video (v3) — faceless pipeline. Self-contained: every module it uses
 * lives in this folder. The Promo Video (v2) pipeline is untouched.
 *
 * Stage order is the whole point (vs v2):
 *   0. Harvest real assets from the product URL (copy, brand, screenshots)
 *   1. Creative director — ONE call plans the whole film against real assets
 *   2. Script writer — executes the plan, grounded in real website copy
 *   3. TTS FIRST — voiceover + word timestamps lock scene durations
 *   4. Scene design — fully PARALLEL, duration-aware, asset-grounded
 *   5. Mechanical lint → targeted repair → re-parse
 *   6. Assemble — timeline, voiceover, captions, music, background motion
 *   7. Save with per-scene regen context preserved
 */

import { supabaseAdmin }         from "../../../server/middleware/shared.js";
import { harvestAssets }         from "./assetHarvester.js";
import { directFilm }            from "./creativeDirector.js";
import { writeScript }           from "./scriptWriter.js";
import { resolveFootage }        from "./footageResolver.js";
import { designAllScenes }       from "./sceneDesigner.js";
import { parseSceneHTML }        from "./htmlParser.js";
import { lintSceneGraph, repairSceneHTML } from "./sceneLinter.js";
import { buildTimeline }         from "./timelineBuilder.js";
import { generateFullVoiceover } from "./ttsGenerator.js";
import { buildCaptionLayers }    from "./captionBuilder.js";

const CANVAS = { width: 1080, height: 1920 };
const FPS    = 30;

export const SAAS_STATUS_STEPS = [
  "Reading your website…",
  "Directing your video…",
  "Writing the script…",
  "Recording the voiceover…",
  "Sourcing footage…",
  "Designing your scenes…",
  "Quality-checking every frame…",
  "Composing the timeline…",
  "Almost ready…",
];

// ── Word-timestamp → scene duration assignment (proven pattern) ─────────────

function assignWordTimestamps(scenes, wordTimestamps) {
  if (!wordTimestamps?.length) return;
  let wordIdx = 0;
  for (const scene of scenes) {
    const segWords = (scene.script_segment ?? "").trim().split(/\s+/).filter(Boolean).length;
    if (segWords === 0 || wordIdx >= wordTimestamps.length) continue;

    const startWord = wordTimestamps[wordIdx];
    const endWord   = wordTimestamps[Math.min(wordIdx + segWords - 1, wordTimestamps.length - 1)];

    scene.vo_start = parseFloat((startWord?.start ?? 0).toFixed(3));
    scene.vo_end   = parseFloat((endWord?.end ?? scene.vo_start + 3).toFixed(3));
    scene.duration_seconds = parseFloat(Math.max(1.2, scene.vo_end - scene.vo_start).toFixed(3));

    wordIdx = Math.min(wordIdx + segWords, wordTimestamps.length);
  }
}

function estimateDurations(scenes) {
  // No-TTS fallback: ~2.7 words/sec
  for (const scene of scenes) {
    if (scene.duration_seconds == null) {
      const words = (scene.script_segment ?? "").trim().split(/\s+/).filter(Boolean).length;
      scene.duration_seconds = Math.max(2.0, parseFloat((words / 2.7).toFixed(2)));
    }
  }
}

// ── Motion, footage layers, transitions, SFX ─────────────────────────────────

const NO_KF = { x: [], y: [], scale: [], rotation: [], opacity: [], blur: [] };

function motionKeyframes(motion, dur) {
  if (motion === "ken_burns") {
    return {
      ...NO_KF,
      scale: [{ time: 0, value: 1.10 }, { time: dur, value: 1.20 }],
      x:     [{ time: 0, value: 0 },    { time: dur, value: -28 }],
    };
  }
  if (motion === "punch_in") {
    return { ...NO_KF, scale: [{ time: 0, value: 1.0 }, { time: dur, value: 1.07 }] };
  }
  return { ...NO_KF };
}

/** Full-canvas footage layer (video or moving image) behind a scene. */
function buildFootageLayer(scene, start, end) {
  const dur = parseFloat((end - start).toFixed(3));
  const isVideo = scene.background.kind === "video";
  return {
    id:      `s${scene.scene_index}_footage`,
    trackId: `s${scene.scene_index}_footage`,
    name:    isVideo ? "Footage" : "Still",
    type:    isVideo ? "video" : "image",
    src:     scene.background.src,
    start, end,
    zIndex:  0,
    visible: true,
    locked:  false,
    sfx:     null,
    ...(isVideo
      ? { muted: true, volume: 0, trimStart: 0, trimEnd: dur, playbackRate: 1 }
      : {}),
    objectFit: "cover",
    keyframes: motionKeyframes(scene.motion, dur),
    transition: { in: { type: "none", duration: 0 }, out: { type: "none", duration: 0 } },
    transform: {
      x: 0, y: 0, width: 1080, height: 1920,
      opacity: 1, scale: 1, blur: 0, rotation: 0,
      borderRadius: 0, borderWidth: 0, borderColor: "#ffffff",
    },
  };
}

/** Scene start/end windows derived from the built timeline's own layers. */
function sceneWindows(layers, sceneCount) {
  const windows = [];
  for (let i = 0; i < sceneCount; i++) {
    const sceneLayers = layers.filter(l => l.id?.startsWith(`s${i}_`));
    if (sceneLayers.length === 0) { windows.push(null); continue; }
    windows.push({
      start: Math.min(...sceneLayers.map(l => l.start)),
      end:   Math.max(...sceneLayers.map(l => l.end)),
    });
  }
  return windows;
}

const TRANSITION_DURATION = 0.35;
const TRANSITION_MAP = {
  zoom:         { out: "zoom-in",    in: "zoom-in" },
  "slide-left": { out: "slide-left", in: "slide-left" },
  "slide-up":   { out: "slide-up",   in: "slide-up" },
  fade:         { out: "fade",       in: "fade" },
};

/**
 * Scene-cut transitions: the whole outgoing scene exits with the director's
 * transition; the incoming scene's background/footage enters with the matching
 * move (content elements keep their own staggered entrance animations).
 */
function applyTransitions(layers, scenes) {
  for (let i = 0; i < scenes.length - 1; i++) {
    const t = TRANSITION_MAP[scenes[i].transition_out];
    if (!t) continue;

    for (const layer of layers) {
      if (!layer.id?.startsWith(`s${i}_`) || layer.type === "audio") continue;
      layer.transition = {
        in:  layer.transition?.in ?? { type: "none", duration: 0 },
        out: { type: t.out, duration: TRANSITION_DURATION },
      };
    }
    for (const layer of layers) {
      const isNextBg = layer.id === `s${i + 1}_footage` || (layer.id?.startsWith(`s${i + 1}_`) && /background/.test(layer.id));
      if (!isNextBg) continue;
      layer.transition = {
        in:  { type: t.in, duration: TRANSITION_DURATION },
        out: layer.transition?.out ?? { type: "none", duration: 0 },
      };
    }
  }
}

/** Whoosh SFX on scene cuts, if the sfx library has one. */
async function attachTransitionSfx(layers, scenes) {
  try {
    const { data: tracks } = await supabaseAdmin
      .from("sfx_tracks")
      .select("key, public_url, duration")
      .eq("is_active", true);
    const whoosh = (tracks ?? []).find(t => /whoosh|swoosh|swish|woosh|transition/i.test(t.key));
    if (!whoosh) { console.log("[saas] no whoosh sfx in library — skipping transition sfx"); return; }

    let attached = 0;
    for (let i = 0; i < scenes.length - 1; i++) {
      if (!TRANSITION_MAP[scenes[i].transition_out]) continue;
      const target = layers.find(l => l.id === `s${i + 1}_footage`)
        ?? layers.find(l => l.id?.startsWith(`s${i + 1}_`) && /background/.test(l.id));
      if (!target) continue;
      target.sfx = { key: whoosh.key, src: whoosh.public_url, volume: 0.45, delay: -0.1 };
      attached++;
    }
    if (attached > 0) console.log(`[saas] transition sfx attached: ${attached}x "${whoosh.key}"`);
  } catch (e) {
    console.warn("[saas] sfx attach skipped:", e.message);
  }
}

/** Subtle zoom on designed (non-footage) scene backgrounds so nothing is static. */
function addBackgroundZoom(layers, footageSceneIndices) {
  for (const layer of layers) {
    const isBg = (layer.id ?? "").includes("background") && (layer.type === "gradient" || layer.type === "image");
    if (!isBg) continue;
    const sceneIdx = parseInt(layer.id.match(/^s(\d+)_/)?.[1] ?? "-1", 10);
    if (footageSceneIndices.has(sceneIdx)) continue; // scrims over footage stay still
    const dur = parseFloat(((layer.end ?? 0) - (layer.start ?? 0)).toFixed(3));
    if (dur <= 0) continue;
    layer.keyframes = {
      ...(layer.keyframes ?? {}),
      scale: [{ time: 0, value: 1.0 }, { time: dur, value: 1.045 }],
    };
  }
}

// ── Main export ──────────────────────────────────────────────────────────────

export async function runSaasPipeline(params, onStep) {
  const {
    url, userId,
    productName = "", description = "", tone = "professional", goal = "promo",
    sceneCount = "auto", language = "en", voiceId = null,
    includeCaptions = false, customScript = null,
  } = params;

  const runId = `saas-${userId}-${Date.now()}`;
  const step  = (msg) => { console.log(`[saas] ${msg}`); onStep?.({ step: msg }); };

  // ── Stage 0: Harvest real assets ──────────────────────────────────────────
  step(SAAS_STATUS_STEPS[0]);
  const harvest = await harvestAssets(url, runId);

  // ── Stage 1: Creative direction (one call, whole film) ───────────────────
  step(SAAS_STATUS_STEPS[1]);
  const brief = await directFilm({ harvest, productName, description, tone, goal, sceneCount });

  // ── Stage 2: Script ───────────────────────────────────────────────────────
  step(SAAS_STATUS_STEPS[2]);
  const { full_script, scenes } = await writeScript({ brief, harvest, tone, language, customScript });

  // ── Stage 3: TTS FIRST — lock timing before any design happens ───────────
  step(SAAS_STATUS_STEPS[3]);
  let voiceoverUrl      = null;
  let voiceoverDuration = 0;
  let wordTimestamps    = [];

  const ttsScript = scenes.map(s => s.script_segment).join(" ").trim();
  if (ttsScript) {
    try {
      const tts = await generateFullVoiceover(ttsScript, runId, voiceId);
      voiceoverUrl      = tts.audio_url;
      voiceoverDuration = tts.duration_seconds ?? 0;
      wordTimestamps    = tts.wordTimestamps ?? [];
      if (wordTimestamps.length) assignWordTimestamps(scenes, wordTimestamps);
    } catch (e) {
      console.warn("[saas] TTS failed (non-fatal — falling back to estimated timing):", e.message);
    }
  }
  estimateDurations(scenes);

  // Extend last scene to cover the full audio + a short trail
  if (scenes.length > 0) {
    const TRAIL  = 0.4;
    const sumDur = scenes.reduce((a, s) => a + s.duration_seconds, 0);
    const last   = scenes[scenes.length - 1];
    if (voiceoverDuration > sumDur) {
      last.duration_seconds = parseFloat((last.duration_seconds + voiceoverDuration - sumDur).toFixed(3));
    }
    last.duration_seconds = parseFloat((last.duration_seconds + TRAIL).toFixed(3));
  }

  // ── Stage 3.5: Resolve footage — director proposed, code disposes ────────
  step(SAAS_STATUS_STEPS[4]);
  await resolveFootage(scenes, harvest, runId);

  // ── Stage 4: Parallel, duration-aware scene design ────────────────────────
  step(SAAS_STATUS_STEPS[5]);
  const designCtx = {
    canvasWidth:    CANVAS.width,
    canvasHeight:   CANVAS.height,
    formatRatio:    "9:16",
    screenshotUrls: harvest.screenshotUrls,
    onScreenLanguage: "English",
    includeCaptions,
  };
  const designResults = await designAllScenes(scenes, brief, designCtx);
  const sceneHTMLs = scenes.map((s) => designResults.find(r => r.sceneIndex === s.scene_index)?.html ?? "");

  // ── Stage 5: Parse → lint → targeted repair → re-parse ───────────────────
  step(SAAS_STATUS_STEPS[6]);
  // Vocabulary for typo detection: every word the designer could legitimately display
  const vocabText = [
    full_script, brief.product_name, brief.positioning, brief.niche,
    harvest.title, harvest.description,
    ...(harvest.headlines ?? []), ...(harvest.bullets ?? []),
  ].filter(Boolean).join(" ");

  const sceneGraphs = await Promise.all(scenes.map(async (scene, i) => {
    let html  = sceneHTMLs[i];
    let graph = parseSceneHTML(html || "", scene.scene_index, CANVAS);

    const lintOpts = {
      canvasW: CANVAS.width, canvasH: CANVAS.height,
      productName: brief.product_name, intent: scene.intent,
      captionsEnabled: includeCaptions,
      isFootage: !!scene.background,
      isMockup:  scene.visual_source === "mockup",
      vocabText,
    };
    const violations = lintSceneGraph(graph, lintOpts);

    if (violations.length > 0 && html) {
      console.log(`[saas/lint] scene ${scene.scene_index}: ${violations.length} violation(s) — repairing`);
      const repaired = await repairSceneHTML(html, violations, `scene ${scene.scene_index}`);
      if (repaired !== html) {
        const repairedGraph = parseSceneHTML(repaired, scene.scene_index, CANVAS);
        const remaining = lintSceneGraph(repairedGraph, lintOpts);
        // Accept the repair if it didn't make things worse
        if (repairedGraph.length >= 2 && remaining.length <= violations.length) {
          html  = repaired;
          graph = repairedGraph;
          sceneHTMLs[i] = repaired;
          if (remaining.length > 0) console.warn(`[saas/lint] scene ${scene.scene_index}: ${remaining.length} violation(s) remain after repair`);
        }
      }
    } else if (violations.length === 0) {
      console.log(`[saas/lint] scene ${scene.scene_index}: clean`);
    }

    return graph;
  }));

  // ── Stage 6: Assemble timeline ────────────────────────────────────────────
  step(SAAS_STATUS_STEPS[7]);
  const projectContext = {
    productName:  brief.product_name,
    niche:        brief.niche,
    accentColor:  brief.accent_color,
    musicMood:    brief.music_mood,
    canvasWidth:  CANVAS.width,
    canvasHeight: CANVAS.height,
    fps:          FPS,
  };
  const { timeline } = buildTimeline(sceneGraphs, scenes, projectContext);
  let finalTimeline  = timeline;
  const totalDur     = finalTimeline.format.duration;

  // ── Footage layers: real video/image backgrounds under each footage scene ─
  const windows            = sceneWindows(finalTimeline.layers, scenes.length);
  const footageSceneIdx    = new Set();
  const footageLayers      = [];
  for (const scene of scenes) {
    if (!scene.background?.src) continue;
    const win = windows[scene.scene_index];
    if (!win) continue;
    footageSceneIdx.add(scene.scene_index);
    // Designed layers move up one z-level; footage takes zIndex 0 underneath
    for (const layer of finalTimeline.layers) {
      if (!layer.id?.startsWith(`s${scene.scene_index}_`)) continue;
      layer.zIndex = (layer.zIndex ?? 0) + 1;
      // Scrim safety clamp: the legibility layer must cover the full canvas.
      // (GPT sometimes writes width:100% which the parser reads as 100px.)
      if (/^s\d+_background/.test(layer.id) && layer.transform) {
        layer.transform = { ...layer.transform, x: 0, y: 0, width: CANVAS.width, height: CANVAS.height };
      }
    }
    footageLayers.push(buildFootageLayer(scene, win.start, win.end));
  }
  if (footageLayers.length > 0) {
    finalTimeline.layers = [...footageLayers, ...finalTimeline.layers];
    console.log(`[saas] footage layers injected: ${footageLayers.length}`);
  }

  // ── Scene-cut transitions + whoosh SFX + designed-scene motion ───────────
  applyTransitions(finalTimeline.layers, scenes);
  await attachTransitionSfx(finalTimeline.layers, scenes);
  addBackgroundZoom(finalTimeline.layers, footageSceneIdx);

  // Voiceover layer
  if (voiceoverUrl) {
    finalTimeline.layers.push({
      id: "voiceover_full", trackId: "track_voiceover",
      type: "audio", audioType: "voiceover", src: voiceoverUrl,
      start: 0, end: totalDur, zIndex: 0,
      visible: true, locked: false, trimStart: 0, trimEnd: totalDur,
      volume: 1.0, muted: false, fadeIn: 0.1, fadeOut: 0.3,
      sfx: null, keyframes: {}, animation: null, transition: null, transform: null,
    });
  }

  // Captions from the word timestamps we already have
  if (includeCaptions && wordTimestamps.length > 0) {
    const captionLayers = buildCaptionLayers(wordTimestamps, {
      canvasW: CANVAS.width, canvasH: CANVAS.height,
      theme: brief.theme, accentColor: brief.accent_color, totalDuration: totalDur,
    });
    finalTimeline.layers.push(...captionLayers);
    console.log(`[saas] captions: ${captionLayers.length} chunks`);
  }

  // Background music by the director's mood
  try {
    const { data: allTracks } = await supabaseAdmin
      .from("music_tracks")
      .select("public_url, title, mood")
      .eq("is_active", true);
    if (allTracks?.length) {
      const pool = allTracks.filter(t => t.mood === brief.music_mood).length
        ? allTracks.filter(t => t.mood === brief.music_mood)
        : allTracks;
      const track = pool[Math.floor(Math.random() * pool.length)];
      finalTimeline.layers.push({
        id: "music_global", trackId: "track_music",
        type: "audio", audioType: "music", src: track.public_url,
        start: 0, end: totalDur, zIndex: 0,
        visible: true, locked: false, trimStart: 0, trimEnd: totalDur,
        volume: 0.22, muted: false, fadeIn: 1, fadeOut: 1.5,
        sfx: null, keyframes: {}, animation: null, transition: null, transform: null,
      });
      console.log(`[saas] music: "${track.title}" (${brief.music_mood})`);
    }
  } catch (e) {
    console.warn("[saas] music injection skipped:", e.message);
  }

  if (full_script) finalTimeline.full_script = full_script;

  // ── Stage 7: Save with per-scene regen context ────────────────────────────
  step(SAAS_STATUS_STEPS[8]);
  let editorProjectId = null;
  try {
    const { data: row } = await supabaseAdmin
      .from("projects")
      .insert({
        user_id:           userId,
        name:              brief.project_name,
        safe_project_json: finalTimeline,
        orientation:       "9:16",
        mode:              "timeline",
        source:            "saas_video",
        editor_version:    "timeline",
        raw_ai_json: {
          pipeline: "saas_video_v3",
          sourceUrl: url,
          brief: {
            product_name: brief.product_name,
            positioning:  brief.positioning,
            niche:        brief.niche,
            accent_color: brief.accent_color,
            theme:        brief.theme,
            visual_style: brief.visual_style,
            music_mood:   brief.music_mood,
          },
          harvest: {
            title:          harvest.title,
            logoUrl:        harvest.logoUrl,
            brandColor:     harvest.brandColor,
            screenshotUrls: harvest.screenshotUrls,
          },
          // Everything needed to regenerate any single scene later
          scenes: scenes.map(s => ({
            scene_index:      s.scene_index,
            intent:           s.intent,
            archetype:        s.archetype,
            visual_concept:   s.visual_concept,
            visual_source:    s.visual_source,
            shot_query:       s.shot_query ?? null,
            motion:           s.motion ?? null,
            transition_out:   s.transition_out ?? null,
            screenshot_index: s.screenshot_index,
            background:       s.background ? { kind: s.background.kind, src: s.background.src, provider: s.background.provider } : null,
            script_segment:   s.script_segment,
            duration_seconds: s.duration_seconds,
          })),
          sceneHTMLs,
        },
      })
      .select("id")
      .single();
    editorProjectId = row?.id ?? null;
    console.log(`[saas] saved project: ${editorProjectId}`);
  } catch (e) {
    console.warn("[saas] projects insert failed (non-fatal):", e.message);
  }

  return {
    projectId:        editorProjectId,
    projectName:      brief.project_name,
    duration_seconds: parseFloat(totalDur.toFixed(2)),
    sceneCount:       scenes.length,
  };
}
