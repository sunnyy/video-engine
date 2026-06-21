/**
 * pipelineOrchestrator.js
 * Product Video pipeline v4 — base-image-first, identity-preserving Nano Banana shots
 * + headless-measured overlay + eased motion. Merges Product Ad Studio's proven
 * generation backend (routes/productAd.js) with the modern overlay/motion frontend.
 *
 * Flow:
 *  1.  Director (GPT-4.1 vision) — validation + brief + base-image prompt + per-scene
 *      plan (shot prompt / anchor / display block / script / render / motion).
 *  2.  Base image — Nano Banana edit cleans the upload into a studio packshot.
 *  3.  TTS (ElevenLabs w/ timestamps) → per-scene durations (clamped 3–4s; no stretch).
 *  4.  Scene shots (Nano Banana edit on the base) + overlay design (GPT-5.4) →
 *      headless measure — shots sequential, overlays in parallel.
 *  5.  Prepend pipeline shot (z0) + scrim (z1) beneath each overlay → buildTimeline.
 *  6.  Scene transitions + voiceover + music + logo → save (source: product_video).
 *
 * visualMode is passed through; only "image" is implemented. The per-scene `render`
 * flag + `motion_prompt` are carried for the deferred image-to-video step.
 */

import { supabaseAdmin }            from "../../../server/middleware/shared.js";
import { generateFullVoiceover }    from "../saasVideo/ttsGenerator.js";
import { pickAutoMood }             from "../../../core/registries/musicRegistry.js";
import { generateProductPlan }      from "./productDirector.js";
import { generateBaseImage, generateAllSceneShots } from "./shotGenerator.js";
import { designProductScene }       from "./sceneDesigner.js";
import { measureSceneHTML, closeMeasureBrowser } from "../shared/converter.js";
import { applyTransitions, assignSceneTransitions } from "../shared/transitions.js";
import { injectMusic }            from "../shared/music.js";
import { buildTimeline }            from "./timelineBuilder.js";

const CANVAS = { width: 1080, height: 1920 }; // default (9:16)
const FPS    = 30;
// Map the chosen orientation to canvas dimensions — drives shots, overlay design, measure + saved format.
function orientationToCanvas(orientation) {
  switch (orientation) {
    case "16:9": return { width: 1920, height: 1080 };
    case "1:1":  return { width: 1080, height: 1080 };
    case "4:5":  return { width: 1080, height: 1350 };
    default:     return { width: 1080, height: 1920 }; // 9:16
  }
}

// ── Timestamp assignment ───────────────────────────────────────────────────────

function assignWhisperTimestamps(scenes, whisperWords) {
  if (!whisperWords?.length) return;
  let wordIdx = 0;
  for (const scene of scenes) {
    const segWords = (scene.script_segment ?? "").trim().split(/\s+/).filter(Boolean).length;
    if (!segWords || wordIdx >= whisperWords.length) continue;
    const startWord = whisperWords[wordIdx];
    const endWord   = whisperWords[Math.min(wordIdx + segWords - 1, whisperWords.length - 1)];
    scene.vo_start         = parseFloat((startWord?.start ?? 0).toFixed(3));
    scene.vo_end           = parseFloat((endWord?.end ?? scene.vo_start + 3).toFixed(3));
    scene.duration_seconds = parseFloat(Math.max(1.0, scene.vo_end - scene.vo_start).toFixed(3));
    wordIdx = Math.min(wordIdx + segWords, whisperWords.length);
  }
}

// ── Pipeline-built media for each scene (full-bleed product shot + scrim) ─────
// The designer builds ONLY the transparent text overlay; the product photo and a
// legibility scrim (darker top + bottom, clear middle so the product reads) are
// owned here and sit BENEATH the text — no z-index fights. Works for a still shot
// now or an animated clip later (swap type:"image" → type:"video").
function mediaScrimEntries(sceneIndex, src, canvas = CANVAS) {
  const base = {
    role: "background", animation: "none", sceneElement: "background",
    rotation: 0, opacity: 1, borderRadius: 0, borderWidth: 0, borderColor: "#ffffff",
    filter: null, boxShadow: null, mixBlendMode: null, backdropFilter: null, style: {},
  };
  return [
    { ...base, id: `s${sceneIndex}_media`, trackId: `s${sceneIndex}_media`,
      layer: "image", type: "image", zIndex: 0, x: 0, y: 0, width: canvas.width, height: canvas.height,
      src, objectFit: "cover", assetType: "product-shot" },
    { ...base, id: `s${sceneIndex}_scrim`, trackId: `s${sceneIndex}_scrim`,
      layer: "gradient", type: "gradient", zIndex: 1, x: 0, y: 0, width: canvas.width, height: canvas.height,
      background: "linear-gradient(180deg, rgba(0,0,0,0.62) 0%, rgba(0,0,0,0.18) 30%, rgba(0,0,0,0.02) 50%, rgba(0,0,0,0.30) 78%, rgba(0,0,0,0.82) 100%)" },
  ];
}

// ── Overlay z-order normalizer ───────────────────────────────────────────────
// The headless measurer takes GPT's CSS z-index literally, and GPT sometimes puts
// a decorative panel (card/glow) ABOVE the content it should sit behind — e.g. a
// blurred card landing on top of an icon or label. Re-stack the overlay by ROLE so
// structure stays at the back and content/icons always read on top, regardless of
// whatever z-index GPT wrote. Runs on the overlay graph only (sits above media z0 +
// scrim z1); relative order within a band is preserved.
const OVERLAY_Z = {
  glow: 2,
  card: 3,
  decoration: 5,
  divider: 6,
  badge: 8,
  icon: 9,
  label: 10, kicker: 10, subhead: 10, body: 10,
  "stat-number": 11, headline: 11,
  cta: 12,
};
function normalizeOverlayZ(overlay, canvas = CANVAS) {
  const W = canvas.width, H = canvas.height;
  // Safety net: drop any element that lands (mostly) OUTSIDE the frame — a runaway
  // overflow stack. The designer is told to fit; this guarantees no off-frame garbage.
  const kept = overlay.filter((e) => {
    const cx = e.x + e.width / 2, cy = e.y + e.height / 2;
    return e.y < H - 8 && cy > -40 && cy < H + 40 && cx > -40 && cx < W + 40;
  });
  if (kept.length !== overlay.length) {
    console.log(`[productPipeline] dropped ${overlay.length - kept.length} off-frame overlay element(s)`);
  }
  for (const e of kept) e.zIndex = OVERLAY_Z[e.role] ?? 10;
  return kept;
}

// ── Ken Burns (subtle motion on still product shots) ─────────────────────────
// The product shot is a static background layer, so without this it sits frozen
// under the text. Give each still scene a slow, varied push-in / pan so the hero
// shot has life. Varied per scene so consecutive shots don't move identically.
// Video scenes (later) carry real clip motion and skip this. Translate amounts
// stay within the scale's overscan so the frame edges never reveal.
function applyKenBurns(layers, scenes) {
  for (let i = 0; i < scenes.length; i++) {
    if (scenes[i].render === "video") continue;
    const media = layers.find(l => l.id === `s${i}_media`);
    if (!media?.transform) continue;
    const dur = Math.max(0.1, (media.end ?? 0) - (media.start ?? 0));
    const kf  = { x: [], y: [], scale: [], rotation: [], opacity: [], blur: [] };
    switch (i % 4) {
      case 0: // slow push-in
        kf.scale = [{ time: 0, value: 1.0 }, { time: dur, value: 1.07 }];
        break;
      case 1: // slow pull-back
        kf.scale = [{ time: 0, value: 1.07 }, { time: dur, value: 1.0 }];
        break;
      case 2: // held zoom + horizontal drift
        media.transform.scale = 1.08;
        kf.scale = [{ time: 0, value: 1.08 }, { time: dur, value: 1.08 }];
        kf.x     = [{ time: 0, value: 32 }, { time: dur, value: -32 }];
        break;
      default: // held zoom + vertical drift
        media.transform.scale = 1.08;
        kf.scale = [{ time: 0, value: 1.08 }, { time: dur, value: 1.08 }];
        kf.y     = [{ time: 0, value: 46 }, { time: dur, value: -46 }];
        break;
    }
    media.keyframes = kf;
  }
}

// ── Logo injection ─────────────────────────────────────────────────────────────

function injectLogo(timeline, logoUrl, scenes) {
  if (!logoUrl) return;
  let cursor = 0;
  for (let i = 0; i < scenes.length; i++) {
    const dur   = scenes[i].duration_seconds ?? 4;
    const start = parseFloat(cursor.toFixed(4));
    const end   = parseFloat((cursor + dur).toFixed(4));
    cursor = end;
    const isHookOrCTA = ["hook", "cta", "standalone", "showcase"].includes(scenes[i].intent) && (i === 0 || i === scenes.length - 1);
    if (!isHookOrCTA) continue;
    timeline.layers.push({
      id: `s${i}_logo`, trackId: `s${i}_logo`,
      name: "Logo", type: "image", src: logoUrl,
      objectFit: "contain",
      start, end, zIndex: 20,
      visible: true, locked: false,
      sfx: null, filter: null, boxShadow: null, mixBlendMode: null, backdropFilter: null,
      keyframes: { x: [], y: [], scale: [], rotation: [], opacity: [{ time: 0, value: 0 }, { time: 0.4, value: 1 }], blur: [] },
      transition: { in: { type: "fade", duration: 0.4 }, out: { type: "none", duration: 0 } },
      transform: { x: 60, y: 100, width: 200, height: 80, opacity: 0.92, rotation: 0, scale: 1, blur: 0, borderRadius: 0, borderWidth: 0, borderColor: "#ffffff" },
    });
  }
}


// Mood → display/body font pairing (variety without rigidity).
const FONT_PAIRS = {
  premium:    { hero: "Playfair Display", supporting: "Inter" },
  elegant:    { hero: "Cormorant Garamond", supporting: "Inter" },
  minimalist: { hero: "Outfit", supporting: "Inter" },
  bold:       { hero: "Anton", supporting: "Inter" },
  playful:    { hero: "Poppins", supporting: "Inter" },
  organic:    { hero: "Fraunces", supporting: "Inter" },
};
function fontPairFor(mood) { return FONT_PAIRS[mood] ?? FONT_PAIRS.premium; }

// ── Save ───────────────────────────────────────────────────────────────────────

async function saveTimeline(timeline, project, scenes, sceneHTMLs = []) {
  try {
    const { data: row } = await supabaseAdmin
      .from("projects")
      .insert({
        user_id:           project.userId,
        name:              timeline.name,
        safe_project_json: timeline,
        orientation:       project.orientation ?? "9:16",
        mode:              "timeline",
        source:            "product_video",
        editor_version:    "timeline",
        raw_ai_json: {
          brief:      project._brief ?? null,
          sceneHTMLs,
          scenes: scenes.map(s => ({
            intent:         s.intent,
            creative_direction: s.creative_direction,
            shot_type:      s.shot_type,
            image_generation_prompt: s.image_generation_prompt,
            anchor:         s.anchor,
            display:        s.display,
            render:         s.render,
            motion_prompt:  s.motion_prompt,
            script_segment: s.script_segment,
          })),
        },
      })
      .select("id")
      .single();
    console.log(`[productPipeline] saved → project ${row?.id}`);
    return row?.id ?? null;
  } catch (e) {
    console.warn("[productPipeline] save failed (non-fatal):", e.message);
    return null;
  }
}

// ── Main export ────────────────────────────────────────────────────────────────

/**
 * runProductVideoPipeline(project)
 *
 * @param {object} project
 *   userId, productImageUrl, brandName, productDescription, ctaText,
 *   offerText, website, logoUrl, accentColor, visualMode, sceneCount,
 *   goal, voiceId
 * @returns {{ editor_project_id, total_duration, shots }}
 */
export async function runProductVideoPipeline(project, onStep) {
  const { userId, productImageUrl, visualMode = "image" } = project;
  const canvas = orientationToCanvas(project.orientation ?? "9:16");
  const runId = `pv4-${Date.now()}`;

  // ── Step 1: Director (vision) — full plan from the product photo ───────────
  onStep?.(0);
  console.log("[productPipeline] step 1 — director (vision plan)");
  const plan = await generateProductPlan(productImageUrl, {
    brandName:          project.brandName,
    productDescription: project.productDescription,
    ctaText:            project.ctaText ?? "Shop Now",
    offerText:          project.offerText,
    website:            project.website,
    goal:               project.goal ?? "promo",
    sceneCount:         project.sceneCount ?? 3,
  });

  const brief       = plan.brief;
  const scenes      = plan.scenes.map(s => ({ ...s }));
  const full_script = plan.full_script;
  const accentColor = project.accentColor ?? brief.accent_color;
  const productMood = brief.product_mood;

  // ── Step 2: Base image — clean studio packshot (canonical reference) ───────
  onStep?.(1);
  console.log("[productPipeline] step 2 — base image");
  const baseImageUrl = await generateBaseImage(productImageUrl, {
    userId, runId,
    prompt:       plan.base_image_prompt,
    hasWatermark: brief.has_watermark,
    orientation:  project.orientation ?? "9:16",
  });

  // ── Step 3: Voiceover → per-scene durations (clamped 3–4s; no stretch) ─────
  console.log("[productPipeline] step 3 — voiceover");
  let voiceoverUrl = null;
  try {
    const voiceId = (project.voiceId && project.voiceId.length > 8) ? project.voiceId : null;
    const tts = await generateFullVoiceover(full_script, runId, voiceId);
    voiceoverUrl = tts.audio_url;
    if (tts.wordTimestamps?.length) assignWhisperTimestamps(scenes, tts.wordTimestamps);
  } catch (err) {
    console.error("[productPipeline] TTS failed (non-fatal):", err.message);
  }

  // Clamp scene durations so each beat stays short (the 19s bug was the old
  // "extend last scene to the full voiceover" logic — removed).
  const single = scenes.length === 1;
  const MIN = single ? 4.0 : 2.5;
  const MAX = single ? 7.0 : 4.5;
  for (const scene of scenes) {
    const raw = scene.duration_seconds ?? 3.5;
    scene.duration_seconds = parseFloat(Math.min(MAX, Math.max(MIN, raw)).toFixed(3));
  }

  const projectContext = {
    brandName:    project.brandName ?? brief.product_name ?? "Brand",
    ctaText:      project.ctaText   ?? "Shop Now",
    website:      project.website   ?? "",
    accentColor,
    secondaryColor: brief.secondary_color ?? null,
    theme:        brief.product_theme ?? "dark",
    productMood,
    fontPair:     fontPairFor(productMood),
    canvasWidth:  canvas.width,
    canvasHeight: canvas.height,
    fps:          FPS,
    musicMood:    productMood ?? "premium",
    productName:  project.brandName ?? brief.product_name ?? "Product",
  };

  // ── Step 4a: Scene shots first (the designer needs to SEE them) ────────────
  onStep?.(2);
  console.log(`[productPipeline] step 4a — ${scenes.length} scene shots`);
  const shotUrls = await generateAllSceneShots(baseImageUrl, scenes, { userId, runId, orientation: project.orientation ?? "9:16" });

  // ── Step 4b: Overlay design (vision on each shot) + headless measure ───────
  console.log("[productPipeline] step 4b — overlays (vision)");
  const overlayResults = await Promise.all(scenes.map(async (scene, idx) => {
    try {
      const sceneImageUrl = shotUrls[idx] ?? baseImageUrl ?? productImageUrl;
      const html    = await designProductScene(scene, brief, { ...projectContext, sceneImageUrl });
      const overlay = await measureSceneHTML(html || "", scene.scene_index, canvas);
      return { html, overlay };
    } catch (err) {
      console.error(`[productPipeline] scene ${scene.scene_index} overlay failed:`, err.message);
      return { html: null, overlay: [] };
    }
  }));
  try { await closeMeasureBrowser(); } catch {}

  // ── Step 5: Assemble graphs — pipeline shot (z0) + scrim (z1) + overlay ────
  const validShots = shotUrls.map(u => u ?? baseImageUrl ?? productImageUrl);
  const sceneGraphs = scenes.map((scene, i) => {
    const overlay = normalizeOverlayZ(overlayResults[i]?.overlay ?? [], canvas);
    console.log(`[productPipeline] scene ${i} (${scene.intent}) — ${overlay.length} overlay layers, shot=${shotUrls[i] ? "ok" : "base-fallback"}`);
    return [...mediaScrimEntries(i, validShots[i], canvas), ...overlay];
  });
  const sceneHTMLs = overlayResults.map(r => r?.html ?? null);

  // ── Step 6: Build timeline + scene transitions ─────────────────────────────
  onStep?.(3);
  console.log("[productPipeline] building timeline");
  const { timeline: rawTimeline } = buildTimeline(sceneGraphs, scenes, projectContext);
  const timeline = {
    ...rawTimeline,
    name: `${project.brandName || brief.product_name || "Product"} — Product Ad`,
    meta: { ...rawTimeline.meta, source: "product_video", scene_format: "v4" },
  };
  timeline.full_script = full_script;   // for easy access in safe_project_json

  assignSceneTransitions(scenes);
  applyTransitions(timeline.layers, scenes);
  applyKenBurns(timeline.layers, scenes);

  // Voiceover
  if (voiceoverUrl) {
    const totalDur = timeline.format.duration;
    timeline.layers.push({
      id: "voiceover_full", trackId: "track_voiceover",
      type: "audio", audioType: "voiceover", src: voiceoverUrl,
      start: 0, end: totalDur, zIndex: 0,
      visible: true, locked: false, trimStart: 0, trimEnd: totalDur,
      volume: 1.0, muted: false, fadeIn: 0.1, fadeOut: 0.3,
      sfx: null, keyframes: {}, animation: null, transition: null, transform: null,
    });
  }

  await injectMusic(timeline, { mood: pickAutoMood(null, productMood ?? "premium"), volume: 0.25, fadeIn: 1, fadeOut: 1, label: "productPipeline" });
  if (project.logoUrl) injectLogo(timeline, project.logoUrl, scenes);

  // ── Save ───────────────────────────────────────────────────────────────────
  onStep?.(4);
  const editorProjectId = await saveTimeline(timeline, { ...project, _brief: brief }, scenes, sceneHTMLs);

  const totalDuration = parseFloat(timeline.format.duration.toFixed(2));
  console.log(`[productPipeline] done — ${scenes.length} scenes, ${totalDuration}s, mode=${visualMode}, project=${editorProjectId}`);

  return {
    editor_project_id: editorProjectId,
    total_duration:    totalDuration,
    shots:             validShots.map((url, i) => ({ url, intent: scenes[i]?.intent ?? "scene" })),
    full_script,
    scenes,
  };
}
