/**
 * pipelineOrchestrator.js
 * src/services/ai/productVideo/v2/pipelineOrchestrator.js
 *
 * Product Video v2 pipeline — HTML/CSS first, product shots injected after.
 *
 * Flow:
 *  1.  Generate script + product analysis (GPT-4.1 vision)
 *  2.  Design scenes as HTML (GPT-5.4, parallel)
 *  3.  Parse HTML → scene graphs
 *  4.  Generate TTS for full script
 *  5.  Whisper transcription → word-level timestamps
 *  6.  Generate product shots (FAL nano-banana, one per scene, parallel)
 *  7.  Build timeline from scene graphs
 *  8.  Inject product shots into image-placeholder layers
 *  9.  For hybrid/video mode: generate video clips for selected shots
 * 10.  Inject voiceover audio layer
 * 11.  Background music
 * 12.  Logo injection
 * 13.  Save timeline to projects table
 */

import { supabaseAdmin }                                    from "../../../server/middleware/shared.js";
import { generateFullVoiceover }  from "../promoVideo/ttsGenerator.js";
import { pickAutoMood }                                     from "../../../core/registries/musicRegistry.js";
import { generateProductScript, SCENE_BUDGETS }             from "./scriptGenerator.js";
import { designProductScene }                               from "./sceneDesigner.js";
import { parseSceneHTML }                                   from "./htmlParser.js";
import { buildTimeline }                                    from "./timelineBuilder.js";

const CANVAS = { width: 1080, height: 1920 };
const FAL_KEY = () => process.env.FAL_API_KEY || process.env.FAL_KEY;

// ── Whisper timestamp assignment ──────────────────────────────────────────────

function assignWhisperTimestamps(scenes, whisperWords) {
  if (!whisperWords?.length) return;
  let wordIdx = 0;
  for (const scene of scenes) {
    const segWords = (scene.script_segment ?? "").trim().split(/\s+/).filter(Boolean).length;
    if (!segWords || wordIdx >= whisperWords.length) continue;
    const startWord = whisperWords[wordIdx];
    const endWord   = whisperWords[Math.min(wordIdx + segWords - 1, whisperWords.length - 1)];
    scene.vo_start        = parseFloat((startWord?.start ?? 0).toFixed(3));
    scene.vo_end          = parseFloat((endWord?.end ?? scene.vo_start + (scene.duration ?? 3)).toFixed(3));
    scene.duration_seconds = parseFloat(Math.max(1.0, scene.vo_end - scene.vo_start).toFixed(3));
    wordIdx = Math.min(wordIdx + segWords, whisperWords.length);
  }
}

// ── Product shot generation (FAL nano-banana) ─────────────────────────────────

const ANCHOR = "Use the uploaded photo as the product reference. Keep the exact same product — same design, colors, materials, textures, branding, proportions, shape, and design details — completely unchanged. Only change the scene, environment, surface, lighting, and advertisement composition as described: ";
const NO_TEXT = "STRICT RULE: This image must contain ZERO text, ZERO words, ZERO letters, ZERO numbers, ZERO UI elements, ZERO buttons, ZERO labels. Absolutely no typography of any kind. Pure photography only.\n";

const INTENT_SHOT_PROMPTS = {
  hook: NO_TEXT + "Create a dramatic, scroll-stopping product advertisement photograph. The product is the hero — cinematic lighting, bold atmosphere, premium commercial photography. Dark moody background with dramatic shadows. Leave generous negative space in the lower third for text overlay. Vertical 9:16 format.",
  hero: NO_TEXT + "Create a clean, premium product hero photograph for a luxury advertisement. The product is centered and beautifully lit — studio quality, elegant and aspirational. Leave clear negative space on one side for headline text. Soft cinematic lighting, realistic reflections, luxury commercial photography quality. Vertical 9:16 format.",
  features: NO_TEXT + "Create a detailed macro product photograph showcasing craftsmanship and material quality. Focus on textures, details, and premium construction. Background is neutral and complementary to the product colors, making product details pop. Leave clear space on the left third for feature text overlay. Vertical 9:16 format.",
  offer: NO_TEXT + "Create a clean, bold product advertisement photograph optimized for promotional text overlay. The product is prominently placed with maximum visual impact. Leave very generous negative space in the upper half for large offer text overlay. Clean background derived from product colors. Vertical 9:16 format.",
  cta: NO_TEXT + "Create a clean, elegant product advertisement photograph for a call-to-action. The product is centered and aspirational. Leave clear negative space in the lower third for CTA button and text overlay. Background is clean, minimal, and brand-appropriate. Vertical 9:16 format.",
};

async function generateSingleShot(referenceUrl, intent, userId, projectId, attempt = 1) {
  const shotPrompt = INTENT_SHOT_PROMPTS[intent] ?? INTENT_SHOT_PROMPTS.hero;
  try {
    const falRes = await fetch("https://fal.run/fal-ai/nano-banana/edit", {
      method:  "POST",
      headers: { "Authorization": `Key ${FAL_KEY()}`, "Content-Type": "application/json" },
      body:    JSON.stringify({ image_urls: [referenceUrl], prompt: ANCHOR + shotPrompt }),
    });
    const raw = await falRes.text();
    if (!falRes.ok) {
      if (falRes.status === 429 && attempt < 3) {
        await new Promise(r => setTimeout(r, 1500 * attempt));
        return generateSingleShot(referenceUrl, intent, userId, projectId, attempt + 1);
      }
      throw new Error(`fal failed: ${raw.slice(0, 200)}`);
    }
    const data   = JSON.parse(raw);
    const falUrl = data.images?.[0]?.url;
    if (!falUrl) throw new Error("No image URL from fal");

    const imgRes = await fetch(falUrl);
    const buffer = Buffer.from(await imgRes.arrayBuffer());
    const key    = `product-videos/${userId}/${projectId}/v2-shot-${intent}-${Date.now()}.jpg`;
    const { error: upErr } = await supabaseAdmin.storage
      .from("user-assets").upload(key, buffer, { contentType: "image/jpeg", upsert: false });
    if (upErr) return falUrl;
    const { data: pub } = supabaseAdmin.storage.from("user-assets").getPublicUrl(key);
    return pub?.publicUrl ?? falUrl;
  } catch (err) {
    console.error(`[productShots] shot for intent=${intent} failed:`, err.message);
    return null;
  }
}

async function generateAllShots(scenes, vertRefUrl, userId, projectId) {
  return Promise.all(
    scenes.map(scene => generateSingleShot(vertRefUrl, scene.intent, userId, projectId))
  );
}

// ── Vertical reference composite ──────────────────────────────────────────────
// nano-banana mirrors input aspect ratio; compositing onto a vertical canvas fixes this.

async function buildVerticalReference(productImageUrl, userId, projectId) {
  try {
    const { default: sharp } = await import("sharp");
    const imgBuf = Buffer.from(await (await fetch(productImageUrl)).arrayBuffer());
    const meta   = await sharp(imgBuf).metadata();
    const TW = CANVAS.width, TH = CANVAS.height;
    const scale = Math.min((TW * 0.82) / (meta.width || TW), (TH * 0.60) / (meta.height || TH));
    const fitW  = Math.round((meta.width || TW)  * scale);
    const fitH  = Math.round((meta.height || TH) * scale);
    const left  = Math.round((TW - fitW) / 2);
    const top   = Math.round((TH - fitH) / 2);
    const vertBuf = await sharp({ create: { width: TW, height: TH, channels: 3, background: { r: 10, g: 10, b: 16 } } })
      .composite([{ input: await sharp(imgBuf).resize(fitW, fitH).toBuffer(), left, top }])
      .jpeg({ quality: 90 })
      .toBuffer();
    const vKey = `product-videos/${userId}/${projectId}/v2-vref-${Date.now()}.jpg`;
    await supabaseAdmin.storage.from("user-assets").upload(vKey, vertBuf, { contentType: "image/jpeg", upsert: false });
    const { data: pub } = supabaseAdmin.storage.from("user-assets").getPublicUrl(vKey);
    console.log("[productPipeline] vertical reference created");
    return pub?.publicUrl ?? productImageUrl;
  } catch (e) {
    console.error("[productPipeline] vertical ref failed, using original:", e.message);
    return productImageUrl;
  }
}

// ── Shot injection ────────────────────────────────────────────────────────────

function injectProductShots(timeline, shotUrls, scenes) {
  for (const layer of timeline.layers) {
    if (layer.type !== "image" || layer.assetType !== "product") continue;
    // id format: s{sceneIndex}_...
    const match      = layer.id?.match(/^s(\d+)_/);
    const sceneIndex = match ? parseInt(match[1], 10) : 0;
    const shotUrl    = shotUrls[sceneIndex];
    if (shotUrl) {
      layer.src       = shotUrl;
      layer.objectFit = "cover";
      console.log(`[productPipeline] injected shot for scene ${sceneIndex} → ${layer.id}`);
    }
  }
}

// ── Video clip generation (hybrid/video mode) ─────────────────────────────────

async function generateVideoClips(timeline, shotUrls, scenes, visualMode) {
  const targetIntents = visualMode === "video"
    ? ["hook", "hero", "features", "offer", "cta"]
    : ["hook", "hero"];

  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i];
    if (!targetIntents.includes(scene.intent)) continue;
    const sourceUrl = shotUrls[i];
    if (!sourceUrl) continue;

    const motionPrompt = `Slow cinematic zoom-in on the product. Subtle ambient motion. Premium advertisement quality. No text or graphics.`;
    try {
      const clipRes = await fetch("https://fal.run/fal-ai/kling-video/v1.6/pro/image-to-video", {
        method:  "POST",
        headers: { "Authorization": `Key ${FAL_KEY()}`, "Content-Type": "application/json" },
        body:    JSON.stringify({ image_url: sourceUrl, prompt: motionPrompt, duration: "5", aspect_ratio: "9:16" }),
      });
      if (!clipRes.ok) { console.warn(`[productPipeline] clip gen scene ${i} failed: ${clipRes.status}`); continue; }
      const clipData = await clipRes.json();
      const videoUrl = clipData?.video?.url ?? null;
      if (!videoUrl) continue;

      // Replace the image layer for this scene with a video layer
      for (const layer of timeline.layers) {
        const match = layer.id?.match(/^s(\d+)_/);
        if (!match || parseInt(match[1], 10) !== i) continue;
        if (layer.type === "image" && layer.assetType === "product") {
          layer.type = "video";
          layer.src  = videoUrl;
          console.log(`[productPipeline] video clip injected for scene ${i}`);
          break;
        }
      }
    } catch (err) {
      console.error(`[productPipeline] clip gen scene ${i} error:`, err.message);
    }
  }
}

// ── Logo injection ────────────────────────────────────────────────────────────

function injectLogo(timeline, logoUrl, scenes) {
  if (!logoUrl) return;
  const logoSceneIndices = scenes
    .map((s, i) => ({ intent: s.intent, i }))
    .filter(({ intent }) => intent === "hook" || intent === "cta")
    .map(({ i }) => i);

  // Add logo layers for hook and cta scenes
  let cursor = 0;
  for (let i = 0; i < scenes.length; i++) {
    const dur   = scenes[i].duration_seconds ?? 4;
    const start = parseFloat(cursor.toFixed(4));
    const end   = parseFloat((cursor + dur).toFixed(4));
    cursor = end;
    if (!logoSceneIndices.includes(i)) continue;
    timeline.layers.push({
      id:       `s${i}_logo`,
      trackId:  `s${i}_logo`,
      name:     "Logo",
      type:     "image",
      src:      logoUrl,
      objectFit: "contain",
      start, end,
      zIndex:   20,
      visible:  true,
      locked:   false,
      sfx:      null,
      filter:   null, boxShadow: null, mixBlendMode: null, backdropFilter: null,
      keyframes: { x: [], y: [], scale: [], rotation: [], opacity: [{ time: 0, value: 0 }, { time: 0.4, value: 1 }], blur: [] },
      transition: { in: { type: "fade", duration: 0.4 }, out: { type: "none", duration: 0 } },
      transform: { x: 60, y: 100, width: 200, height: 80, opacity: 0.92, rotation: 0, scale: 1, blur: 0, borderRadius: 0, borderWidth: 0, borderColor: "#ffffff" },
    });
  }
}

// ── Music injection ────────────────────────────────────────────────────────────

async function injectMusic(timeline, project) {
  try {
    const mood = pickAutoMood(null, project.productMood ?? "premium");
    const { data: allTracks } = await supabaseAdmin
      .from("music_tracks").select("public_url, title, mood").eq("is_active", true);
    if (!allTracks?.length) return;
    const moodTracks = allTracks.filter(t => t.mood === mood);
    const pool  = moodTracks.length ? moodTracks : allTracks;
    const track = pool[Math.floor(Math.random() * pool.length)];
    const dur   = timeline.format.duration;
    timeline.layers.push({
      id: "music_global", trackId: "track_music",
      type: "audio", audioType: "music", src: track.public_url,
      start: 0, end: dur, zIndex: 0,
      visible: true, locked: false, trimStart: 0, trimEnd: dur,
      volume: 0.25, muted: false, fadeIn: 1, fadeOut: 1,
      sfx: null, keyframes: {}, animation: null, transition: null, transform: null,
    });
    console.log(`[productPipeline] music injected: "${track.title}" (${mood})`);
  } catch (e) {
    console.warn("[productPipeline] music injection skipped:", e.message);
  }
}

// ── Save timeline ──────────────────────────────────────────────────────────────

async function saveTimeline(timeline, project) {
  try {
    const { data: row } = await supabaseAdmin
      .from("projects")
      .insert({
        user_id:           project.userId,
        name:              `${project.brandName ?? "Product"} — Product Ad`,
        safe_project_json: timeline,
        orientation:       "9:16",
        mode:              "timeline",
        source:            "product_video_v2",
        editor_version:    "timeline",
        raw_ai_json:       {
          script:     project._scriptMeta ?? null,
          scenes:     project._scenes?.map(s => ({ intent: s.intent, archetype: s.archetype ?? null, visual_concept: s.visual_concept, script_segment: s.script_segment })) ?? null,
          sceneHTMLs: project._sceneHTMLs ?? null,
        },
      })
      .select("id")
      .single();
    console.log(`[productPipeline] timeline saved → editor project ${row?.id}`);
    return row?.id ?? null;
  } catch (e) {
    console.warn("[productPipeline] timeline save failed (non-fatal):", e.message);
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
 *   tone, voiceId
 * @returns {{ editor_project_id, total_duration, shots }}
 */
export async function runProductVideoPipeline(project) {
  const { userId, productImageUrl, visualMode = "image" } = project;

  // ── Step 1: Script + product analysis ────────────────────────────────────
  console.log("[productPipeline] step 1 — generating script");
  const scriptResult = await generateProductScript({
    productImageUrl,
    brandName:          project.brandName          ?? "",
    productDescription: project.productDescription ?? "",
    ctaText:            project.ctaText            ?? "Shop Now",
    offerText:          project.offerText          ?? "",
    website:            project.website            ?? "",
    sceneCount:         project.sceneCount         ?? 3,
  });

  let scenes        = scriptResult.scenes.map(s => ({ ...s }));
  const full_script = scriptResult.full_script;
  const accentColor  = project.accentColor ?? scriptResult.accent_color ?? "#7c5cfc";
  const productMood  = scriptResult.product_mood  ?? "premium";
  const productTheme = scriptResult.product_theme ?? "dark";

  // ── Build project context for scene designer ──────────────────────────────
  const projectContext = {
    brandName:    project.brandName    ?? "Brand",
    ctaText:      project.ctaText      ?? "Shop Now",
    offerText:    project.offerText    ?? "",
    website:      project.website      ?? "",
    accentColor,
    theme:        productTheme,
    canvasWidth:  CANVAS.width,
    canvasHeight: CANVAS.height,
    formatRatio:  "9:16",
    productMood,
  };

  // ── Step 2: Design all scenes in parallel (HTML/CSS) ─────────────────────
  console.log(`[productPipeline] step 2 — designing ${scenes.length} scenes`);
  const sceneResults = await Promise.all(
    scenes.map(async (scene) => {
      try {
        const html  = await designProductScene(scene, projectContext);
        const graph = parseSceneHTML(html || "", scene.scene_index, CANVAS);
        console.log(`[productPipeline] scene ${scene.scene_index} (${scene.intent}) → ${graph.length} layers`);
        return { graph, html };
      } catch (err) {
        console.error(`[productPipeline] scene ${scene.scene_index} design failed:`, err.message);
        return { graph: [], html: null };
      }
    })
  );
  const sceneGraphs = sceneResults.map(r => r.graph);
  const sceneHTMLs  = sceneResults.map(r => r.html);

  // ── Step 3: TTS ───────────────────────────────────────────────────────────
  console.log("[productPipeline] step 3 — generating voiceover");
  let voiceoverAudioUrl = null, voiceoverDuration = 0, voiceoverBuffer = null;
  try {
    const voiceId = (project.voiceId && project.voiceId.length > 8) ? project.voiceId : null;
    const tts = await generateFullVoiceover(full_script, `pv2-${Date.now()}`, voiceId);
    voiceoverAudioUrl = tts.audio_url;
    voiceoverDuration = tts.duration_seconds;
    voiceoverBuffer   = tts.buffer;
    if (tts.wordTimestamps?.length) {
      assignWhisperTimestamps(scenes, tts.wordTimestamps);
      console.log(`[productPipeline] step 4 — ${tts.wordTimestamps.length} word timestamps from ElevenLabs`);
    } else {
      console.warn("[productPipeline] step 4 — no timestamps, using intent budgets");
    }
  } catch (err) {
    console.error("[productPipeline] TTS failed (non-fatal):", err.message);
  }

  // Extend last scene to cover full voiceover audio
  if (voiceoverDuration > 0 && scenes.length > 0) {
    const sumDur = scenes.reduce((a, s) => a + (s.duration_seconds ?? 0), 0);
    const last   = scenes[scenes.length - 1];
    if (voiceoverDuration > sumDur) {
      last.duration_seconds = parseFloat(((last.duration_seconds ?? 0) + (voiceoverDuration - sumDur)).toFixed(3));
    }
    last.duration_seconds = parseFloat(((last.duration_seconds ?? 0) + 0.4).toFixed(3));
  }

  // ── Step 5: Build vertical reference for FAL ──────────────────────────────
  console.log("[productPipeline] step 5 — building vertical reference");
  const vertRefUrl = await buildVerticalReference(productImageUrl, userId, `pv2-${Date.now()}`);

  // ── Step 6: Generate product shots (parallel) ─────────────────────────────
  console.log(`[productPipeline] step 6 — generating ${scenes.length} product shots`);
  const shotUrls = await generateAllShots(scenes, vertRefUrl, userId, `pv2-${Date.now()}`);
  const validShots = shotUrls.map((url, i) => url ?? productImageUrl);

  // ── Step 7: Build timeline ────────────────────────────────────────────────
  console.log("[productPipeline] step 7 — building timeline");
  const { timeline } = buildTimeline(sceneGraphs, scenes, {
    ...projectContext,
    projectId:  null,
    musicMood:  productMood,
  });

  // ── Step 8: Inject product shots ──────────────────────────────────────────
  injectProductShots(timeline, validShots, scenes);

  // ── Step 9: Video clips for hybrid/video mode ─────────────────────────────
  if (visualMode === "hybrid" || visualMode === "video") {
    console.log(`[productPipeline] step 9 — generating video clips (${visualMode})`);
    await generateVideoClips(timeline, validShots, scenes, visualMode);
  }

  // ── Step 10: Inject voiceover ─────────────────────────────────────────────
  if (voiceoverAudioUrl) {
    const totalDur = timeline.format.duration;
    timeline.layers.push({
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
    });
  }

  // ── Step 11: Music ────────────────────────────────────────────────────────
  await injectMusic(timeline, { productMood });

  // ── Step 12: Logo ─────────────────────────────────────────────────────────
  if (project.logoUrl) {
    injectLogo(timeline, project.logoUrl, scenes);
  }

  // ── Step 13: Save ─────────────────────────────────────────────────────────
  const projectWithMeta = {
    ...project,
    productMood,
    _scenes:     scenes,
    _sceneHTMLs: sceneHTMLs,
    _scriptMeta: {
      accent_color:     accentColor,
      product_mood:     productMood,
      product_theme:    productTheme,
      product_category: scriptResult.product_category ?? null,
    },
  };
  const editorProjectId = await saveTimeline(timeline, projectWithMeta);

  const totalDuration = parseFloat(timeline.format.duration.toFixed(2));
  console.log(`[productPipeline] done — ${scenes.length} scenes, ${totalDuration}s, editor=${editorProjectId}`);

  return {
    editor_project_id: editorProjectId,
    total_duration:    totalDuration,
    shots:             validShots.map((url, i) => ({ url, intent: scenes[i]?.intent ?? "scene" })),
    full_script,
    scenes,
  };
}
