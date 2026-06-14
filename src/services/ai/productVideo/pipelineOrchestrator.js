/**
 * pipelineOrchestrator.js
 * Product Video pipeline v3 — image-first, direct layer construction.
 *
 * Flow:
 *  1.  analyzeProduct (GPT-4.1 vision) + buildVerticalReference — run in parallel
 *  2.  generateProductScript (GPT-4.1 text, uses brief) — script + display_text + shot_directives
 *  3.  TTS (ElevenLabs with-timestamps)
 *  4.  Assign scene durations from word timestamps
 *  5.  Generate product shots (FAL flux-kontext) + design HTML scenes (GPT-5.4) — in parallel
 *  6.  parseSceneHTML → inject shot URLs into product-shot placeholders → buildTimeline
 *  7.  Inject voiceover audio layer
 *  8.  Background music
 *  9.  Logo injection
 * 10.  Save to projects table
 */

import { supabaseAdmin }            from "../../../server/middleware/shared.js";
import { generateFullVoiceover }    from "../promoVideo/ttsGenerator.js";
import { pickAutoMood }             from "../../../core/registries/musicRegistry.js";
import { analyzeProduct }           from "./productAnalyzer.js";
import { generateProductScript, SCENE_BUDGETS } from "./scriptGenerator.js";
import { designProductScene }       from "./sceneDesigner.js";
import { parseSceneHTML }           from "../promoVideo/htmlParser.js";
import { buildTimeline }            from "../promoVideo/timelineBuilder.js";

const CANVAS = { width: 1080, height: 1920 };
const FPS    = 30;
const FAL_KEY = () => process.env.FAL_API_KEY || process.env.FAL_KEY;

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
    scene.vo_end           = parseFloat((endWord?.end ?? scene.vo_start + (scene.duration ?? 3)).toFixed(3));
    scene.duration_seconds = parseFloat(Math.max(1.0, scene.vo_end - scene.vo_start).toFixed(3));
    wordIdx = Math.min(wordIdx + segWords, whisperWords.length);
  }
}

// ── Vertical reference composite ───────────────────────────────────────────────
// Composites the product image onto a 9:16 dark canvas so FAL receives a
// vertical-format reference image regardless of the original product photo shape.

async function buildVerticalReference(productImageUrl, userId, runId) {
  try {
    const { default: sharp } = await import("sharp");
    const imgBuf = Buffer.from(await (await fetch(productImageUrl)).arrayBuffer());
    const meta   = await sharp(imgBuf).metadata();
    const TW = CANVAS.width, TH = CANVAS.height;
    const scale = Math.min((TW * 0.82) / (meta.width || TW), (TH * 0.60) / (meta.height || TH));
    const fitW  = Math.round((meta.width  || TW) * scale);
    const fitH  = Math.round((meta.height || TH) * scale);
    const left  = Math.round((TW - fitW) / 2);
    const top   = Math.round((TH - fitH) / 2);
    const vertBuf = await sharp({ create: { width: TW, height: TH, channels: 3, background: { r: 10, g: 10, b: 16 } } })
      .composite([{ input: await sharp(imgBuf).resize(fitW, fitH).toBuffer(), left, top }])
      .jpeg({ quality: 90 })
      .toBuffer();
    const vKey = `product-videos/${userId}/${runId}/vref-${Date.now()}.jpg`;
    await supabaseAdmin.storage.from("user-assets").upload(vKey, vertBuf, { contentType: "image/jpeg", upsert: false });
    const { data: pub } = supabaseAdmin.storage.from("user-assets").getPublicUrl(vKey);
    console.log("[productPipeline] vertical reference created");
    return pub?.publicUrl ?? productImageUrl;
  } catch (e) {
    console.error("[productPipeline] vertical ref failed, using original:", e.message);
    return productImageUrl;
  }
}

// ── FAL shot generation ────────────────────────────────────────────────────────

// Every shot must leave the bottom 40% of the frame open for text overlay,
// and contain zero typography so the timeline text layers read clearly.
const NO_TEXT_SUFFIX = " Leave the bottom 40% of the frame as an open, uncluttered background surface — no product, no props — so text can overlay cleanly. No text, no words, no letters, no numbers, no UI elements in the image.";

// Fallback per-intent prompts for the nano-banana fallback path.
const FALLBACK_PROMPTS = {
  hook:     "Create a dramatic editorial product hero photograph — cinematic, scroll-stopping. Product is the star, lit beautifully. Warm aspirational background (marble, linen, natural wood). Product fills 50–70% of the vertical frame. Ultra premium commercial photography. Vertical 9:16.",
  hero:     "Create a premium lifestyle product photograph. Product centered on a beautiful warm surface (marble, fine fabric). Soft directional natural light. Optional tasteful lifestyle props around — not obscuring the product. Luxury editorial photography. Vertical 9:16.",
  features: "Create an editorial flat-lay with natural lifestyle context — ingredients, materials, or complementary objects artfully arranged around the product. Warm tones. Product is the clear focal point. Natural light, editorial quality. Vertical 9:16.",
  offer:    "Create a bold, high-energy product photograph. Product is front and center — large, impactful. Clean, bright, punchy. Editorial commercial photography. Vertical 9:16.",
  cta:      "Create a clean, inviting lifestyle product photograph — aspirational and warm. Product sits elegantly on a premium surface with soft natural light. Minimal styling, maximum elegance. Vertical 9:16.",
  standalone: "Create a dramatic aspirational product photograph — cinematic hero shot. Product fills 50–70% of the vertical frame. Warm, premium background. Commercial photography. Vertical 9:16.",
};

async function uploadShot(falUrl, userId, runId, intent) {
  try {
    const imgRes = await fetch(falUrl);
    const buffer = Buffer.from(await imgRes.arrayBuffer());
    const key    = `product-videos/${userId}/${runId}/shot-${intent}-${Date.now()}.jpg`;
    const { error } = await supabaseAdmin.storage
      .from("user-assets").upload(key, buffer, { contentType: "image/jpeg", upsert: false });
    if (error) return falUrl;
    const { data: pub } = supabaseAdmin.storage.from("user-assets").getPublicUrl(key);
    return pub?.publicUrl ?? falUrl;
  } catch {
    return falUrl;
  }
}

async function generateShotKontext(vertRefUrl, shotDirective) {
  const prompt = shotDirective + NO_TEXT_SUFFIX;
  const falRes = await fetch("https://fal.run/fal-ai/flux-pro/kontext", {
    method:  "POST",
    headers: { "Authorization": `Key ${FAL_KEY()}`, "Content-Type": "application/json" },
    body:    JSON.stringify({
      image_url:   vertRefUrl,
      prompt,
      num_images:  1,
      guidance_scale: 3.5,
    }),
  });
  if (!falRes.ok) throw new Error(`flux-kontext ${falRes.status}: ${(await falRes.text()).slice(0, 200)}`);
  const data = await falRes.json();
  const url  = data.images?.[0]?.url ?? null;
  if (!url) throw new Error("flux-kontext: no image URL in response");
  return url;
}

async function generateShotNanoBanana(vertRefUrl, intent, shotDirective) {
  const prompt = (shotDirective || FALLBACK_PROMPTS[intent] || FALLBACK_PROMPTS.hero) + NO_TEXT_SUFFIX;
  const ANCHOR = "Use the uploaded photo as the product reference. Keep the exact same product — same design, colors, materials, textures, branding, proportions — completely unchanged. Only change the scene, environment, surface, lighting, and advertisement composition as described: ";
  const falRes = await fetch("https://fal.run/fal-ai/nano-banana/edit", {
    method:  "POST",
    headers: { "Authorization": `Key ${FAL_KEY()}`, "Content-Type": "application/json" },
    body:    JSON.stringify({ image_urls: [vertRefUrl], prompt: ANCHOR + prompt }),
  });
  if (!falRes.ok) throw new Error(`nano-banana ${falRes.status}: ${(await falRes.text()).slice(0, 200)}`);
  const data = await falRes.json();
  const url  = data.images?.[0]?.url ?? null;
  if (!url) throw new Error("nano-banana: no image URL in response");
  return url;
}

async function generateSingleShot(vertRefUrl, scene, userId, runId, attempt = 1) {
  const { intent, shot_directive } = scene;
  try {
    // Primary: flux-kontext (better product fidelity via image conditioning)
    const url = await generateShotKontext(vertRefUrl, shot_directive || FALLBACK_PROMPTS[intent] || FALLBACK_PROMPTS.hero);
    return await uploadShot(url, userId, runId, intent);
  } catch (kontextErr) {
    console.warn(`[productShots] scene ${scene.scene_index} kontext failed (${kontextErr.message}), falling back to nano-banana`);
    try {
      // Fallback: nano-banana (proven but weaker product preservation)
      if (attempt <= 2 && kontextErr.message?.includes("429")) {
        await new Promise(r => setTimeout(r, 1500 * attempt));
      }
      const url = await generateShotNanoBanana(vertRefUrl, intent, shot_directive);
      return await uploadShot(url, userId, runId, intent);
    } catch (fallbackErr) {
      console.error(`[productShots] scene ${scene.scene_index} all shot generation failed:`, fallbackErr.message);
      return null;
    }
  }
}

async function generateAllShots(scenes, vertRefUrl, userId, runId) {
  return Promise.all(scenes.map(scene => generateSingleShot(vertRefUrl, scene, userId, runId)));
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
    const isHookOrCTA = scenes[i].intent === "hook" || scenes[i].intent === "cta" || scenes[i].intent === "standalone";
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

// ── Music injection ────────────────────────────────────────────────────────────

async function injectMusic(timeline, productMood) {
  try {
    const mood = pickAutoMood(null, productMood ?? "premium");
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
    console.log(`[productPipeline] music: "${track.title}" (${mood})`);
  } catch (e) {
    console.warn("[productPipeline] music injection skipped:", e.message);
  }
}

// Minimum scene durations — ensures animations have room to complete
const MIN_DUR = { hook: 2.8, hero: 3.2, features: 3.5, offer: 2.8, cta: 3.5, standalone: 6.0 };

// ── Save ───────────────────────────────────────────────────────────────────────

async function saveTimeline(timeline, project, scenes, sceneHTMLs = []) {
  try {
    const { data: row } = await supabaseAdmin
      .from("projects")
      .insert({
        user_id:           project.userId,
        name:              timeline.name,
        safe_project_json: timeline,
        orientation:       "9:16",
        mode:              "timeline",
        source:            "product_video",
        editor_version:    "timeline",
        raw_ai_json: {
          brief:      project._brief ?? null,
          sceneHTMLs,
          scenes: scenes.map(s => ({
            intent:         s.intent,
            script_segment: s.script_segment,
            display_text:   s.display_text,
            visual_concept: s.visual_concept,
            shot_directive: s.shot_directive,
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
export async function runProductVideoPipeline(project) {
  const { userId, productImageUrl, visualMode = "image" } = project;
  const runId = `pv3-${Date.now()}`;

  // ── Step 1: Analyze product image + build vertical reference (parallel) ────
  console.log("[productPipeline] step 1 — analyzing product + building reference");
  const [brief, vertRefUrl] = await Promise.all([
    analyzeProduct(productImageUrl),
    buildVerticalReference(productImageUrl, userId, runId),
  ]);

  // User-supplied accent overrides the analyzer
  const accentColor  = project.accentColor ?? brief.accent_color;
  const productMood  = brief.product_mood;
  const productTheme = brief.product_theme;

  // ── Step 2: Generate script (text-only — brief has the visual analysis) ───
  console.log("[productPipeline] step 2 — generating script");
  const scriptResult = await generateProductScript({
    productBrief:       brief,
    brandName:          project.brandName          ?? brief.product_name ?? "",
    productDescription: project.productDescription ?? "",
    ctaText:            project.ctaText            ?? "Shop Now",
    offerText:          project.offerText          ?? "",
    website:            project.website            ?? "",
    sceneCount:         project.sceneCount         ?? 3,
    goal:               project.goal               ?? "promo",
  });

  let scenes        = scriptResult.scenes.map(s => ({ ...s }));
  const full_script = scriptResult.full_script;

  // ── Step 3: TTS ───────────────────────────────────────────────────────────
  console.log("[productPipeline] step 3 — voiceover");
  let voiceoverUrl = null, voiceoverDuration = 0;
  try {
    const voiceId = (project.voiceId && project.voiceId.length > 8) ? project.voiceId : null;
    const tts = await generateFullVoiceover(full_script, runId, voiceId);
    voiceoverUrl      = tts.audio_url;
    voiceoverDuration = tts.duration_seconds;
    if (tts.wordTimestamps?.length) {
      assignWhisperTimestamps(scenes, tts.wordTimestamps);
      console.log(`[productPipeline] step 4 — ${tts.wordTimestamps.length} word timestamps`);
    }
  } catch (err) {
    console.error("[productPipeline] TTS failed (non-fatal):", err.message);
  }

  // Extend last scene to cover full voiceover
  if (voiceoverDuration > 0 && scenes.length > 0) {
    const sumDur = scenes.reduce((a, s) => a + (s.duration_seconds ?? 0), 0);
    const last   = scenes[scenes.length - 1];
    if (voiceoverDuration > sumDur) {
      last.duration_seconds = parseFloat(((last.duration_seconds ?? 0) + (voiceoverDuration - sumDur)).toFixed(3));
    }
    last.duration_seconds = parseFloat(((last.duration_seconds ?? 0) + 0.4).toFixed(3));
  }

  // Apply minimum durations before scene design / timeline build
  for (const scene of scenes) {
    const raw = scene.duration_seconds ?? (SCENE_BUDGETS[scene.intent]?.duration ?? 3.5);
    scene.duration_seconds = Math.max(raw, MIN_DUR[scene.intent] ?? 2.8);
  }

  const projectContext = {
    brandName:       project.brandName ?? brief.product_name ?? "Brand",
    ctaText:         project.ctaText   ?? "Shop Now",
    offerText:       project.offerText ?? "",
    website:         project.website   ?? "",
    accentColor,
    theme:           productTheme,
    productMood,
    productTheme,
    productCategory: scriptResult.product_category || brief.product_category || brief.product_name || "Product",
    canvasWidth:     CANVAS.width,
    canvasHeight:    CANVAS.height,
    fps:             FPS,
    musicMood:       productMood ?? "premium",
    productName:     project.brandName ?? brief.product_name ?? "Product",
  };

  // ── Steps 5+6: Generate product shots AND design HTML scenes — in parallel ─
  console.log(`[productPipeline] steps 5+6 — generating ${scenes.length} shots + scene HTML in parallel`);
  const sceneResults = await Promise.all(
    scenes.map(async (scene) => {
      try {
        const [shotUrl, html] = await Promise.all([
          generateSingleShot(vertRefUrl, scene, userId, runId),
          designProductScene(scene, brief, projectContext),
        ]);

        const resolvedUrl = shotUrl ?? productImageUrl;
        const graph = parseSceneHTML(html || "", scene.scene_index, CANVAS);

        // Inject the product shot URL into the product-shot placeholder
        for (const entry of graph) {
          if (entry.assetType === "product-shot") {
            entry.src = resolvedUrl;
          }
        }

        console.log(`[productPipeline] scene ${scene.scene_index} (${scene.intent}) — ${graph.length} layers, shot=${resolvedUrl ? "ok" : "fallback"}`);
        return { graph, html, shotUrl: resolvedUrl };
      } catch (err) {
        console.error(`[productPipeline] scene ${scene.scene_index} failed:`, err.message);
        return { graph: [], html: null, shotUrl: productImageUrl };
      }
    })
  );

  const sceneGraphs = sceneResults.map(r => r.graph);
  const sceneHTMLs  = sceneResults.map(r => r.html);
  const validShots  = sceneResults.map(r => r.shotUrl);

  // ── Step 7a: Build timeline via shared builder ─────────────────────────────
  console.log("[productPipeline] building timeline");
  const { timeline: rawTimeline } = buildTimeline(sceneGraphs, scenes, projectContext);
  const timeline = {
    ...rawTimeline,
    name: `${project.brandName || brief.product_name || "Product"} — Product Ad`,
    meta: { ...rawTimeline.meta, source: "product_video", scene_format: "v4" },
  };

  // ── Step 7b: Inject voiceover ─────────────────────────────────────────────
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

  // ── Step 8: Music ─────────────────────────────────────────────────────────
  await injectMusic(timeline, productMood);

  // ── Step 9: Logo ──────────────────────────────────────────────────────────
  if (project.logoUrl) {
    injectLogo(timeline, project.logoUrl, scenes);
  }

  // ── Step 10: Save ─────────────────────────────────────────────────────────
  const editorProjectId = await saveTimeline(timeline, { ...project, _brief: brief }, scenes, sceneHTMLs);

  const totalDuration = parseFloat(timeline.format.duration.toFixed(2));
  console.log(`[productPipeline] done — ${scenes.length} scenes, ${totalDuration}s, project=${editorProjectId}`);

  return {
    editor_project_id: editorProjectId,
    total_duration:    totalDuration,
    shots:             validShots.map((url, i) => ({ url, intent: scenes[i]?.intent ?? "scene" })),
    full_script,
    scenes,
  };
}
