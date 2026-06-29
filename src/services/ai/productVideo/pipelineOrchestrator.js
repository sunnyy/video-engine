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
 * visualMode drives motion: "image" → all stills (Ken Burns); "video" → every scene
 * animated; "hybrid" → the director picks which scenes become clips. render:"video"
 * scenes have their still shot animated into a clip (Pixverse image-to-video) using
 * the scene's `motion_prompt`; clip failures fall back to the still + Ken Burns.
 */

import { supabaseAdmin }            from "../../../server/middleware/shared.js";
import { simplifyTimelineKeyframes } from "../shared/motion.js";
import { generateFullVoiceover }    from "../saasVideo/ttsGenerator.js";
import { VoiceoverError }            from "../shared/voiceoverError.js";
import { saveIncompleteProject }     from "../shared/incompleteProject.js";
import { pickAutoMood }             from "../../../core/registries/musicRegistry.js";
import { generateProductPlan }      from "./productDirector.js";
import { generateBaseImage, generateAllSceneShots, generateSceneClip } from "./shotGenerator.js";
import { designProductScene }       from "./sceneDesigner.js";
import { measureSceneHTML, closeMeasureBrowser } from "../shared/converter.js";
import { applyTransitions, assignSceneTransitions } from "../shared/transitions.js";
import { injectMusic }            from "../shared/music.js";
import { buildTimeline }            from "./timelineBuilder.js";

const CANVAS = { width: 1080, height: 1920 }; // default (9:16)
const FPS    = 30;
// i2v clips come back ~5s and look slow; play them faster and size the clip scene to fit
// the sped-up source so the FULL motion is visible (not just the static first second).
const CLIP_SPEED  = 1.3;
const CLIP_SRC_S  = 5;                       // pixverse min duration for our ≤5s requests
const CLIP_WINDOW = +(CLIP_SRC_S / CLIP_SPEED).toFixed(2); // ≈ 3.85s of screen time

// ── Pure media-planning (no paid calls) — shared by the real run AND the pre-flight ──
// Decide which scenes become motion clips. image → none; video → all non-CTA; hybrid →
// the most motion-worthy non-CTA scenes (LIFESTYLE first), capped 1 (≤3) / 2 (≥5).
function selectClipFlags(scenes, visualMode) {
  const n = scenes.length;
  const eligible  = (i) => scenes[i].intent !== "cta" && scenes[i].shot_role !== "cta";
  const worthy    = (i) => eligible(i) && (scenes[i].motion_value === "high" || scenes[i].render === "video");
  const lifestyle = (i) => scenes[i].shot_role === "lifestyle" || scenes[i].intent === "lifestyle";
  if (visualMode === "video") return scenes.map((_, i) => eligible(i));
  if (visualMode === "image") return scenes.map(() => false);
  const cap = n >= 5 ? 2 : 1;
  const ranked = scenes.map((s, i) => i).filter(worthy).sort((a, b) => (lifestyle(a) ? 0 : 1) - (lifestyle(b) ? 0 : 1));
  const chosen = new Set(ranked.slice(0, cap));
  return scenes.map((_, i) => chosen.has(i));
}

// Finalize scene durations (mutates): hybrid clip scenes get enough time for the sped-up
// clip; the video never ends before the voiceover. isClip(i) → whether scene i is a clip.
function finalizeSceneDurations(scenes, { visualMode, isClip, voiceoverDuration }) {
  const n = scenes.length;
  if (visualMode === "hybrid") {
    for (let i = 0; i < n; i++) if (isClip(i)) scenes[i].duration_seconds = Math.max(scenes[i].duration_seconds || 0, CLIP_WINDOW);
  }
  if (voiceoverDuration > 0) {
    const total = scenes.reduce((a, s) => a + (s.duration_seconds || 0), 0);
    const deficit = (voiceoverDuration + 0.35) - total;
    if (deficit > 0) scenes[n - 1].duration_seconds = +(((scenes[n - 1].duration_seconds || 0) + deficit).toFixed(3));
  }
}

// Pre-flight: exercise the deterministic media-planning on a CLONE of the plan BEFORE any
// paid image/clip/TTS call, so a logic bug aborts free instead of mid-pipeline.
function preflightMediaPlan(scenes, visualMode) {
  if (!Array.isArray(scenes) || !scenes.length) throw new Error("no scenes to plan");
  const probe = scenes.map(s => ({ ...s, duration_seconds: s.duration_seconds ?? 3.5 }));
  const flags = selectClipFlags(probe, visualMode);
  finalizeSceneDurations(probe, { visualMode, isClip: (i) => flags[i], voiceoverDuration: 10 });
}
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
function mediaScrimEntries(sceneIndex, src, canvas = CANVAS, kind = "image") {
  const base = {
    role: "background", animation: "none", sceneElement: "background",
    rotation: 0, opacity: 1, borderRadius: 0, borderWidth: 0, borderColor: "#ffffff",
    filter: null, boxShadow: null, mixBlendMode: null, backdropFilter: null, style: {},
  };
  const isVideo = kind === "video";
  const media = isVideo
    ? { ...base, id: `s${sceneIndex}_media`, trackId: `s${sceneIndex}_media`,
        layer: "video", type: "video", zIndex: 0, x: 0, y: 0, width: canvas.width, height: canvas.height,
        src, objectFit: "cover", assetType: "product-clip",
        // i2v clips run ~5s and look sluggish — play faster so the motion reads punchy.
        playbackRate: CLIP_SPEED,
        trimStart: 0, trimEnd: null, volume: 0, muted: true, loop: true }
    : { ...base, id: `s${sceneIndex}_media`, trackId: `s${sceneIndex}_media`,
        layer: "image", type: "image", zIndex: 0, x: 0, y: 0, width: canvas.width, height: canvas.height,
        src, objectFit: "cover", assetType: "product-shot" };
  return [
    media,
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
    // Strip redundant keyframes (constant tracks, plain fades) — motion identical, far less bloat.
    simplifyTimelineKeyframes(timeline);
    const rawJson = {
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
    };
    if (project.existingProjectId) {
      // FINISHING a previously-incomplete project — overwrite the placeholder + clear the flag.
      const { error } = await supabaseAdmin.from("projects")
        .update({ name: timeline.name, safe_project_json: timeline, orientation: project.orientation ?? "9:16", mode: "timeline", source: "product_video", editor_version: "timeline", status: null, raw_ai_json: rawJson, updated_at: new Date().toISOString() })
        .eq("id", project.existingProjectId).eq("user_id", project.userId);
      if (error) throw new Error(error.message);
      console.log(`[productPipeline] saved → project ${project.existingProjectId} (finished)`);
      return project.existingProjectId;
    }
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
        raw_ai_json:       rawJson,
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
/**
 * planProductVideo — vision-director plan for the optional "Review script" step.
 * Returns the full plan (brief + scenes + full_script + base_image_prompt) so the user
 * can review/edit the spoken script before the paid pipeline runs. No images, no TTS.
 */
export async function planProductVideo(project) {
  return await generateProductPlan(project.productImageUrl, {
    brandName:          project.brandName,
    productDescription: project.productDescription,
    ctaText:            project.ctaText ?? "Shop Now",
    offerText:          project.offerText,
    website:            project.website,
    goal:               project.goal ?? "promo",
    sceneCount:         project.sceneCount ?? 3,
    visualMode:         project.visualMode ?? "image",
    language:           project.language ?? "en",
  });
}

export async function runProductVideoPipeline(project, onStep) {
  const { userId, productImageUrl, visualMode = "image", existingProjectId = null } = project;
  const canvas = orientationToCanvas(project.orientation ?? "9:16");
  const runId = `pv4-${Date.now()}`;

  // ── Step 1: Director (vision) — full plan from the product photo ───────────
  // Reuse a pre-approved plan from the "Review script" step when provided (skips the
  // vision call); otherwise generate it now.
  onStep?.(0);
  let plan;
  if (project.plan?.scenes?.length) {
    console.log("[productPipeline] step 1 — using approved plan (skipping director)");
    plan = project.plan;
  } else {
    console.log("[productPipeline] step 1 — director (vision plan)");
    plan = await generateProductPlan(productImageUrl, {
      brandName:          project.brandName,
      productDescription: project.productDescription,
      ctaText:            project.ctaText ?? "Shop Now",
      offerText:          project.offerText,
      website:            project.website,
      goal:               project.goal ?? "promo",
      sceneCount:         project.sceneCount ?? 3,
      visualMode:         project.visualMode ?? "image",
      language:           project.language ?? "en",
    });
  }

  const brief       = plan.brief;
  const scenes      = plan.scenes.map(s => ({ ...s }));
  // A user-reviewed/edited spoken script overrides the planned voiceover.
  const full_script = (project.script && project.script.trim()) ? project.script.trim() : plan.full_script;
  const accentColor = project.accentColor ?? brief.accent_color;
  const productMood = brief.product_mood;

  // ── Pre-flight: validate the deterministic plan BEFORE any paid step ───────
  // (the director call already happened — the cheap one; base image / shots / clips /
  // TTS are still ahead). A logic bug here aborts free instead of after Fal/TTS spend.
  try {
    preflightMediaPlan(scenes, visualMode);
  } catch (e) {
    throw new Error(`Pre-flight check failed — aborting before paid steps: ${e.message}`);
  }

  // ── Step 2: Base image — clean studio packshot (canonical reference) ───────
  onStep?.(1);
  // Reuse a base image carried over from a prior incomplete run (Finish-later) so we don't re-pay
  // the image step; otherwise generate it now.
  let baseImageUrl = project.baseImageUrl || null;
  if (!baseImageUrl) {
    console.log("[productPipeline] step 2 — base image");
    baseImageUrl = await generateBaseImage(productImageUrl, {
      userId, runId,
      prompt:       plan.base_image_prompt,
      hasWatermark: brief.has_watermark,
      orientation:  project.orientation ?? "9:16",
    });
  }

  // ── Step 3: Voiceover → per-scene durations (clamped 3–4s; no stretch) ─────
  console.log("[productPipeline] step 3 — voiceover");
  let voiceoverUrl = null, voiceoverDuration = 0;
  try {
    const voiceId = (project.voiceId && project.voiceId.length > 8) ? project.voiceId : null;
    const tts = await generateFullVoiceover(full_script, runId, voiceId);
    voiceoverUrl = tts.audio_url;
    voiceoverDuration = tts.duration_seconds || 0;
    if (tts.wordTimestamps?.length) assignWhisperTimestamps(scenes, tts.wordTimestamps);
  } catch (err) {
    const ve = VoiceoverError.from(err);
    // Voiceover is REQUIRED — never ship a silent video. On a retryable failure, save this as an
    // INCOMPLETE project (plan + base image kept) so the user can Finish it later for free without
    // re-paying the image step; the route refunds the up-front charge.
    if (ve.retryable && userId) {
      try {
        const resumeProject = { ...project, plan, script: full_script, baseImageUrl };
        ve.projectId  = await saveIncompleteProject({ userId, source: "product_video", name: brief?.product_name || project.brandName || "Product Video", orientation: project.orientation ?? "9:16", canvas, ve, existingProjectId, resume: { project: resumeProject } });
        ve.incomplete = !!ve.projectId;
      } catch (saveErr) { console.error("[productPipeline] could not save incomplete project:", saveErr.message); }
    }
    throw ve;
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
  const validShotsEarly = shotUrls.map(u => u ?? baseImageUrl ?? productImageUrl);

  // ── Step 4a-2: Image→video clips for the scenes that call for motion ───────
  // Mode decides the mix (clips are the costly part, so hybrid spends them only where
  // they pay off):
  //   image  → no clips (all stills + Ken Burns)
  //   video  → every scene animated
  //   hybrid → the HOOK is always a clip; for a 5-scene video ALSO the one extra
  //            high-impact scene the director flagged. Cap = 1 clip (≤3 scenes) or 2
  //            clips (≥5). Everything else is a still + Ken Burns.
  // Each clip animates that scene's still shot (product identity preserved); a clip
  // failure falls back to the still.
  const n = scenes.length;
  const clipFlags = selectClipFlags(scenes, visualMode);

  const clipUrls = new Array(n).fill(null);
  const clipCount = clipFlags.filter(Boolean).length;
  if (clipCount > 0) {
    console.log(`[productPipeline] step 4a-2 — ${clipCount} motion clip(s) (mode=${visualMode}, ${n} scenes)`);
    for (let i = 0; i < n; i++) {
      if (!clipFlags[i]) { scenes[i].render = "image"; continue; }
      const clip = await generateSceneClip(validShotsEarly[i], scenes[i].motion_prompt, {
        userId, runId, label: `s${i}-${scenes[i].intent}`,
        durationSeconds: Math.ceil(scenes[i].duration_seconds || 5),
      });
      if (clip) { clipUrls[i] = clip; scenes[i].render = "video"; }
      else      { scenes[i].render = "image"; } // fallback: still + Ken Burns
    }
  } else {
    scenes.forEach(s => { s.render = "image"; });
  }

  // Finalize scene durations: hybrid clip scenes get enough time for the sped-up clip,
  // and the video never ends before the voiceover (see finalizeSceneDurations).
  finalizeSceneDurations(scenes, { visualMode, isClip: (i) => !!clipUrls[i], voiceoverDuration });

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
    const isVideo = scene.render === "video" && !!clipUrls[i];
    const mediaUrl = isVideo ? clipUrls[i] : validShots[i];
    console.log(`[productPipeline] scene ${i} (${scene.intent}) — ${overlay.length} overlay layers, media=${isVideo ? "clip" : (shotUrls[i] ? "shot" : "base-fallback")}`);
    return [...mediaScrimEntries(i, mediaUrl, canvas, isVideo ? "video" : "image"), ...overlay];
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
