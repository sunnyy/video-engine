/**
 * pipelineOrchestrator.js
 * Social Video pipeline — turns a social media post URL into a timeline.
 *
 * Steps:
 *   1.  Fetch social content (text, image, metrics)
 *   2.  Generate script (GPT-4.1) → scenes, palette, fontPair, musicMood
 *   3.  Voiceover FIRST (ElevenLabs w/ timestamps) → assign scene durations from speech
 *   4.  Resolve media (post image → real entity → stock → capped AI), before design
 *   5.  Design scenes (free HTML/CSS, GPT-5.4) → headless-measure → scene graphs
 *   6.  Build timeline + scene transitions
 *   7.  Inject resolved media into placeholders
 *   8.  Inject background music
 *   9.  Save to projects table (source: "social_video")
 */

import { supabaseAdmin }          from "../../../server/middleware/shared.js";
import { fetchSocialContent }     from "./contentFetcher.js";
import { generateSocialScript }   from "./scriptGenerator.js";
import { designSocialScene }      from "./sceneDesigner.js";
import { resolveSocialMedia }     from "./mediaResolver.js";
import { measureSceneHTML, closeMeasureBrowser } from "../shared/converter.js";
import { applyTransitions, assignSceneTransitions } from "../shared/transitions.js";
import { buildTimeline }          from "./timelineBuilder.js";
import { injectMusic }            from "../shared/music.js";
import { moderateInput }          from "../shared/moderation.js";
import { generateFullVoiceover }  from "../promoVideo/ttsGenerator.js";

const CANVAS = { width: 1080, height: 1920 };
const FPS    = 30;

// ── Timestamp assignment (same pattern as promoVideo) ────────────────────────

function assignWordTimestamps(scenes, wordTimestamps) {
  if (!wordTimestamps?.length) return;
  let wordIdx = 0;

  for (const scene of scenes) {
    const segWords = (scene.script_segment ?? "").trim().split(/\s+/).filter(Boolean).length;
    if (segWords === 0 || wordIdx >= wordTimestamps.length) continue;

    const startWord = wordTimestamps[wordIdx];
    const endWord   = wordTimestamps[Math.min(wordIdx + segWords - 1, wordTimestamps.length - 1)];

    scene.vo_start = parseFloat((startWord?.start ?? 0).toFixed(3));
    scene.vo_end   = parseFloat((endWord?.end ?? scene.vo_start + (scene.duration_seconds ?? 3)).toFixed(3));

    const whisperDur = scene.vo_end - scene.vo_start;
    scene.duration_seconds = parseFloat(Math.max(1.0, whisperDur).toFixed(3));

    wordIdx = Math.min(wordIdx + segWords, wordTimestamps.length);
  }
}

// ── Pipeline-built media for image scenes (full-bleed image + scrim, low z) ──
// The designer builds ONLY the overlay text (transparent), so the image and a
// legibility scrim are owned here and sit BENEATH the text — no z-index fights.
function mediaScrimEntries(sceneIndex, src, meta, kind = "image") {
  const W = CANVAS.width, H = CANVAS.height;
  const mediaLayer = kind === "video"
    ? { layer: "video", type: "video", objectFit: "cover", assetType: "social-image", muted: true, volume: 0 }
    : { layer: "image", type: "image", objectFit: "cover", assetType: "social-image" };
  const base = {
    role: "background", animation: "none", sceneElement: "background",
    rotation: 0, opacity: 1, borderRadius: 0, borderWidth: 0, borderColor: "#ffffff",
    filter: null, boxShadow: null, mixBlendMode: null, backdropFilter: null, style: {},
  };
  const scrim = (z) => ({
    ...base, id: `s${sceneIndex}_scrim`, trackId: `s${sceneIndex}_scrim`,
    layer: "gradient", type: "gradient", zIndex: z, x: 0, y: 0, width: W, height: H,
    background: "linear-gradient(180deg, rgba(0,0,0,0.28) 0%, rgba(0,0,0,0.05) 40%, rgba(0,0,0,0.55) 74%, rgba(0,0,0,0.85) 100%)",
  });

  // Landscape/wide → contain the real image in the upper band over a blurred
  // cover-fill of itself (no crop), so the designer's text drops into the lower area.
  if (meta?.treatment === "framed") {
    return [
      { ...base, id: `s${sceneIndex}_mediabg`, trackId: `s${sceneIndex}_mediabg`,
        layer: "image", type: "image", zIndex: 0, x: 0, y: 0, width: W, height: H,
        src, objectFit: "cover", assetType: "social-image", filter: "blur(46px) brightness(0.45)" },
      scrim(1),
      { ...base, id: `s${sceneIndex}_media`, trackId: `s${sceneIndex}_media`,
        layer: "image", type: "image", zIndex: 2,
        x: 40, y: Math.round(H * 0.10), width: W - 80, height: Math.round(H * 0.50),
        src, objectFit: "contain", assetType: "social-image", borderRadius: 18 },
    ];
  }

  // Portrait/square → full-bleed cover + scrim (image OR stock video)
  return [
    { ...base, ...mediaLayer, id: `s${sceneIndex}_media`, trackId: `s${sceneIndex}_media`,
      zIndex: 0, x: 0, y: 0, width: W, height: H, src },
    scrim(1),
  ];
}

// Scene transitions are shared: ../shared/transitions.js (applyTransitions +
// assignSceneTransitions). AI Video keeps its own beat-aware variant.

// ── Main export ───────────────────────────────────────────────────────────────

// ── Phase 1: PLAN (fetch + script) — returned for the user to confirm/edit the
// script BEFORE the voiceover & everything else is generated from it (no re-run).
export async function planSocial(params, onStep) {
  const { url, targetDuration = 25, language = "en" } = params;
  const step = (msg) => { console.log(`[social] ${msg}`); onStep?.({ step: msg }); };

  step("Tuning in…");
  const content = await fetchSocialContent(url);
  console.log(`[social] platform=${content.platform} author="${content.author}" images=${content.imageUrls?.length ?? (content.imageUrl ? 1 : 0)}`);

  // Safety: the real input is the scraped post — moderate its text before scripting.
  await moderateInput(content.text, { label: "social post content" });

  step("Shaping the story…");
  const wordCount = (content.text || "").split(/\s+/).filter(Boolean).length;
  const effectiveDuration = content.isThread
    ? Math.min(targetDuration + content.threadLength * 3, 60)
    : wordCount > 300
      ? Math.min(targetDuration + Math.floor(wordCount / 100) * 5, 60)
      : targetDuration;
  if (wordCount > 300) console.log(`[social] long post detected: ${wordCount} words → duration ${effectiveDuration}s`);
  const { full_script, scenes: rawScenes, palette, fontPair, musicMood, projectName: gptName, creativeDirection } =
    await generateSocialScript({ content, targetDuration: effectiveDuration, language });

  const scenes = rawScenes.map(s => ({ ...s }));
  if (creativeDirection) console.log(`[social] creative direction: ${creativeDirection}`);
  const projectName = gptName ?? (content.author ? `${content.author} — Social Video` : `Social Video — ${new Date().toLocaleDateString()}`);

  return { content, scenes, full_script, palette, fontPair, musicMood, projectName, creativeDirection, sourceUrl: url };
}

// ── Phase 2: PRODUCE (voiceover → media → design → build → save) from a plan whose
// scenes may carry the user's edited script_segment text.
export async function produceSocial(plan, params, onStep) {
  const { userId, voiceId = null, includeAuthor = false, styleId = "auto" } = params;
  const { content, full_script, palette, fontPair, musicMood, projectName, creativeDirection, sourceUrl } = plan;
  const scenes = plan.scenes.map(s => ({ ...s }));
  const orientation = params.orientation ?? "9:16"; // drives stock search + saved project

  const step  = (msg) => { console.log(`[social] ${msg}`); onStep?.({ step: msg }); };
  const runId = `social-${userId}-${Date.now()}`;
  const url   = sourceUrl;

  const projectContext = {
    palette,
    fontPair,
    musicMood,
    author:        content.author      ?? "",
    authorHandle:  content.authorHandle ?? "",
    platform:      content.platform    ?? "twitter",
    includeAuthor: includeAuthor && !!(content.author || content.authorHandle),
    canvasWidth:   CANVAS.width,
    canvasHeight:  CANVAS.height,
    fps:           FPS,
    voiceId,
  };

  // ── Step 3: Voiceover FIRST — so scenes are timed to real speech, and the
  // designer runs after the durations are known (voiceover-first pipeline) ──
  step("Adding the spark…");
  let voiceoverUrl      = null;
  let voiceoverDuration = 0;

  const ttsScript = scenes.map(s => s.script_segment).join(" ").trim();
  if (ttsScript) {
    try {
      const ttsResult = await generateFullVoiceover(ttsScript, runId, voiceId);
      voiceoverUrl      = ttsResult.audio_url;
      voiceoverDuration = ttsResult.duration_seconds;
      if (ttsResult.wordTimestamps?.length) assignWordTimestamps(scenes, ttsResult.wordTimestamps);
    } catch (err) {
      console.warn("[social] TTS failed (non-fatal):", err.message);
    }
  }

  // Extend last scene to cover any trailing voiceover audio
  if (voiceoverDuration > 0 && scenes.length > 0) {
    const TRAIL = 0.4;
    const sumDur = scenes.reduce((acc, s) => acc + (s.duration_seconds ?? 0), 0);
    const last   = scenes[scenes.length - 1];
    if (voiceoverDuration > sumDur) {
      last.duration_seconds = parseFloat(((last.duration_seconds ?? 0) + voiceoverDuration - sumDur).toFixed(3));
    }
    last.duration_seconds = parseFloat(((last.duration_seconds ?? 0) + TRAIL).toFixed(3));
  }

  // ── Step 3.5: Resolve media (post image → real entity → stock → capped AI) ──
  // Runs BEFORE design so the designer knows which scenes carry an image.
  step("Setting the mood…");
  try {
    await resolveSocialMedia(scenes, content, runId, orientation, styleId);
  } catch (e) {
    console.warn("[social] media resolution failed (non-fatal):", e.message);
  }

  // ── Step 4: Design scenes (free HTML/CSS) + headless measure, in parallel ──
  step("Bringing it to life…");
  const sceneResults = await Promise.all(
    scenes.map(async (scene) => {
      try {
        const html  = await designSocialScene(scene, projectContext);
        const graph = await measureSceneHTML(html || "", scene.scene_index, CANVAS);
        console.log(`[social] scene ${scene.scene_index} (${scene.intent}) — ${graph.length} layers`);
        return { graph, html };
      } catch (err) {
        console.error(`[social] scene ${scene.scene_index} design failed:`, err.message);
        return { graph: [], html: null };
      }
    })
  );
  try { await closeMeasureBrowser(); } catch {}
  const sceneGraphs = sceneResults.map(r => r.graph);
  const sceneHTMLs  = sceneResults.map(r => r.html);

  // For image scenes, the designer built a transparent overlay — inject the
  // pipeline-owned full-bleed image + scrim beneath it (low z).
  scenes.forEach((scene, i) => {
    if (scene.resolvedImage) sceneGraphs[i] = [...mediaScrimEntries(i, scene.resolvedImage, scene.assetMeta, scene.resolvedKind), ...(sceneGraphs[i] ?? [])];
  });

  // ── Step 5: Build timeline ─────────────────────────────────────────────────
  step("Putting it together…");
  const { timeline } = buildTimeline(sceneGraphs, scenes, { ...projectContext, productName: projectName });

  // Assign a varied transition per scene cut, then apply (whole-scene in/out).
  assignSceneTransitions(scenes);
  applyTransitions(timeline.layers, scenes);

  // ── Step 7: Inject voiceover layer ────────────────────────────────────────
  let finalTimeline = timeline;
  if (voiceoverUrl) {
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
          src:       voiceoverUrl,
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

  // (Image scenes already carry their full-bleed media + scrim, built as graph
  // entries before buildTimeline — no placeholder injection needed.)

  // ── Step 8: Background music ──────────────────────────────────────────────
  await injectMusic(finalTimeline, { mood: musicMood, volume: 0.2, fadeIn: 1, fadeOut: 1, label: "social" });

  if (full_script) finalTimeline.full_script = full_script;

  // ── Step 10: Save to projects table ──────────────────────────────────────
  step("Almost ready…");

  let editorProjectId = null;
  try {
    const { data: row } = await supabaseAdmin
      .from("projects")
      .insert({
        user_id:           userId,
        name:              projectName,
        safe_project_json: finalTimeline,
        orientation:       orientation,
        mode:              "timeline",
        source:            "social_video",
        editor_version:    "timeline",
        raw_ai_json: {
          platform:  content.platform,
          author:    content.author,
          sourceUrl: url,
          creative_direction: creativeDirection ?? null,
          scenes:    scenes.map(s => ({
            sceneIndex:    s.scene_index,
            intent:        s.intent,
            creative_brief: s.creative_brief ?? s.visual_concept ?? null,
          })),
          sceneHTMLs,
        },
      })
      .select("id")
      .single();
    editorProjectId = row?.id ?? null;
    console.log(`[social] saved project: ${editorProjectId}`);
  } catch (e) {
    console.warn("[social] projects insert failed (non-fatal):", e.message);
  }

  return {
    projectId:   editorProjectId,
    projectName,
    scenes,
    full_script,
    platform:    content.platform,
    duration_seconds: parseFloat(finalTimeline.format.duration.toFixed(2)),
  };
}

// Combined plan→produce (no confirmation) — used by /generate and the legacy page.
export async function runSocialPipeline(params, onStep) {
  const plan = await planSocial(params, onStep);
  return produceSocial(plan, params, onStep);
}
