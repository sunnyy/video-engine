/**
 * renderOrchestrator.js
 * src/services/ai/promoVideo/renderOrchestrator.js
 *
 * Pipeline order:
 *   1. Generate TTS for all AI-voiceover scenes
 *   2. Estimate TTS duration → update scene.duration_seconds
 *   3. Fetch Pixabay stock images for stock / ai_generated scenes
 *   4. Assemble timeline with corrected durations and injected assets
 *   5. Inject TTS audio layers into timeline
 *   6. Save timeline to projects table for editor access
 *   7. Render with Remotion, upload to storage
 *   8. Mark project rendered / failed
 */

import fs from "fs";
import path from "path";
import { supabaseAdmin, TEMP_DIR, PROJECT_ROOT, uuidv4 } from "../../../server/middleware/shared.js";
import { assemblePromoTimeline } from "./assemblyPipeline.js";
import { generatePromoVoiceovers, injectVoiceoversIntoTimeline } from "./ttsGenerator.js";
import { PROJECT_STATUS, ASSET_SOURCE, ASSET_TYPE } from "./projectSchema.js";
import { pickAutoMood } from "../../../core/registries/musicRegistry.js";

async function getBundle() {
  const prebundleDir = path.join(PROJECT_ROOT, "remotion-bundle");
  if (fs.existsSync(path.join(prebundleDir, "index.html"))) return prebundleDir;
  const { bundle } = await import("@remotion/bundler");
  return bundle({ entryPoint: path.join(PROJECT_ROOT, "src/remotion/Root.jsx") });
}

async function setStatus(projectId, status, extra = {}) {
  await supabaseAdmin
    .from("promo_videos")
    .update({ status, updated_at: new Date().toISOString(), ...extra })
    .eq("id", projectId);
}

// Estimate TTS speaking duration from word count.
function estimateTtsDuration(script) {
  const words = script.trim().split(/\s+/).filter(Boolean).length;
  if (words <= 6)  return parseFloat((2.0 + Math.random() * 0.5).toFixed(1));
  if (words <= 14) return parseFloat((3.0 + (words - 6) / 8).toFixed(1));
  return Math.min(6.0, parseFloat((4.0 + (words - 14) / 10).toFixed(1)));
}

const SKIP_WORDS = new Set(["a","an","the","of","for","with","and","or","in","on","at","to","is","are","be","was","were","that","this","it","as","by","from","into","about","showing","featuring","displaying","dynamic","short","quick","simple","clean","professional","modern","background","scene","shot","image","video","photo","showing"]);

function extractSearchQuery(hint) {
  if (!hint) return "";
  const words = hint.split(/\s+/).filter(w => w.length > 2 && !SKIP_WORDS.has(w.toLowerCase().replace(/[^a-z]/g, "")));
  return words.slice(0, 4).join(" ") || hint.split(/\s+/).slice(0, 3).join(" ");
}

async function fetchPixabayImage(hint) {
  const key = process.env.VITE_PIXABAY_API_KEY;
  if (!key) { console.warn("[renderOrchestrator] VITE_PIXABAY_API_KEY is not set"); return null; }
  if (!hint) return null;
  try {
    const url = `https://pixabay.com/api/?key=${encodeURIComponent(key)}&q=${encodeURIComponent(hint)}&image_type=photo&orientation=vertical&per_page=3&safesearch=true`;
    const res  = await fetch(url);
    const data = await res.json();
    return data.hits?.[0]?.largeImageURL ?? null;
  } catch (e) {
    console.error("[renderOrchestrator] Pixabay fetch error:", e.message);
    return null;
  }
}

export async function orchestratePromoRender(projectId) {
  const jobId = uuidv4();

  const { data: row, error: fetchErr } = await supabaseAdmin
    .from("promo_videos")
    .select("*")
    .eq("id", projectId)
    .single();

  if (fetchErr || !row) throw new Error(`Project not found: ${projectId}`);

  await setStatus(projectId, PROJECT_STATUS.RENDERING);

  const framesDir  = path.join(TEMP_DIR, `promo-frames-${jobId}`);
  const outputPath = path.join(TEMP_DIR, `promo-render-${jobId}.mp4`);

  try {
    const style = (row.style && Object.keys(row.style).length > 0)
      ? row.style
      : {
          caption_style:    row.caption_style    ?? "minimal",
          transition_style: row.transition_style ?? "cut",
          music_mood:       row.music_mood       ?? "upbeat",
          motion_style:     row.motion_style     ?? null,
          color_palette:    row.color_palette    ?? null,
        };

    // Work on cloned scenes so we can mutate durations and asset_urls
    let scenes = (row.scenes || []).map(s => ({ ...s }));
    const isThVideo = row.video_type === "talking_head";

    // ── Step 1: Generate TTS (skip for talking head — audio is the video itself) ──
    const voiceover_queue = isThVideo ? [] : scenes
      .filter(s => s.asset_type === ASSET_TYPE.AI_VOICEOVER && s.script?.trim())
      .map(s => ({ scene_id: s.scene_id, script: s.script, voice: "nova" }));

    let voiceover_results = [];
    if (voiceover_queue.length > 0) {
      console.log(`[renderOrchestrator] generating ${voiceover_queue.length} TTS voiceovers for ${projectId}`);
      voiceover_results = await generatePromoVoiceovers(voiceover_queue, projectId);
    }

    // ── Step 2: Update scene durations from actual TTS audio length ──────────
    if (!isThVideo) {
      const durBySid = {};
      for (const r of voiceover_results) {
        if (r.duration_seconds != null) durBySid[r.scene_id] = r.duration_seconds;
      }
      for (const scene of scenes) {
        if (scene.asset_type === ASSET_TYPE.AI_VOICEOVER && scene.script?.trim()) {
          // Prefer measured duration; fall back to word-count estimate
          const measured = durBySid[scene.scene_id];
          scene.duration_seconds = measured != null
            ? parseFloat((measured + 0.3).toFixed(2))  // 0.3s trailing buffer
            : estimateTtsDuration(scene.script);
        }
      }
    }

    // ── Step 3: Fetch Pixabay images for stock / AI-generated scenes ───────
    const stockScenes = scenes.filter(s =>
      s.asset_source === ASSET_SOURCE.STOCK || s.asset_source === ASSET_SOURCE.AI_GENERATED
    );
    if (stockScenes.length > 0) {
      console.log(`[renderOrchestrator] fetching ${stockScenes.length} Pixabay images`);
      await Promise.all(stockScenes.map(async scene => {
        const query = extractSearchQuery(scene.asset_hint || scene.scene_type);
        const imageUrl = await fetchPixabayImage(query);
        if (imageUrl) scene.asset_url = imageUrl;
      }));
    }

    // ── Step 4: Assemble timeline with corrected durations + stock images ──
    const totalDuration = scenes.reduce((sum, s) => sum + (s.duration_seconds || 0), 0);
    const thUrl = scenes.find(s => s.th_url)?.th_url ?? null;
    const project = { ...row, style, scenes, duration_seconds: totalDuration, talking_head_url: thUrl };

    const { timeline } = assemblePromoTimeline(project);

    // ── Step 5: Inject TTS audio layers ───────────────────────────────────
    const finalTimeline = voiceover_results.length > 0
      ? injectVoiceoversIntoTimeline(timeline, voiceover_results)
      : timeline;

    // ── Step 5c: Inject TH trim timestamps + hidden audio master ─────────
    // Per-scene video clips are muted (visual only). One hidden audio master
    // spans the full duration so audio never stops between scenes.
    // Since each scene's duration = next_th_start - this_th_start, the timeline
    // position of each scene equals its th_start — zero drift by construction.
    if (isThVideo) {
      for (const layer of finalTimeline.layers) {
        if (layer.trackId === "track_talking_head" && layer.type === "video") {
          const match = layer.id.match(/^s(\d+)_th$/);
          if (!match) continue;
          const sid   = Number(match[1]);
          const scene = scenes.find(sc => sc.scene_id === sid);
          if (!scene || scene.th_start === undefined) continue;
          layer.trimStart = scene.th_start;
          layer.trimEnd   = scene.th_start + (layer.end - layer.start);
          layer.muted     = true;
          layer.volume    = 0;
        }
      }

      if (thUrl) {
        // Single continuous audio master — hidden from timeline layer list
        finalTimeline.layers.push({
          id: "th_audio_master", trackId: "track_th_audio",
          type: "audio", audioType: "voiceover", src: thUrl,
          start: 0, end: totalDuration, zIndex: 0,
          visible: true, locked: false, _system: true,
          trimStart: 0, trimEnd: totalDuration,
          volume: 0.5, muted: false, fadeIn: 0, fadeOut: 0,
          sfx: null, keyframes: {}, animation: null, transition: null, transform: null,
        });
        console.log(`[renderOrchestrator] TH audio master + per-scene clips injected`);
      }
    }

    // ── Step 5b: Inject background music ─────────────────────────────────
    try {
      const mood = pickAutoMood(row.video_goal, row.tone);
      const { data: allTracks } = await supabaseAdmin
        .from("music_tracks")
        .select("public_url, title, mood")
        .eq("is_active", true);

      if (allTracks?.length) {
        const moodTracks = allTracks.filter(t => t.mood === mood);
        const pool  = moodTracks.length ? moodTracks : allTracks;
        const track = pool[Math.floor(Math.random() * pool.length)];
        const musicDur = finalTimeline.format.duration; // use post-inject duration
        finalTimeline.layers.push({
          id: "music_global", trackId: "track_music",
          type: "audio", audioType: "music", src: track.public_url,
          start: 0, end: musicDur, zIndex: 0,
          visible: true, locked: false,
          trimStart: 0, trimEnd: musicDur,
          volume: 0.15, muted: false, fadeIn: 1, fadeOut: 1,
          sfx: null, keyframes: {}, animation: null, transition: null, transform: null,
        });
        console.log(`[renderOrchestrator] music injected: "${track.title}" (${mood})`);
      }
    } catch (e) {
      console.warn("[renderOrchestrator] music injection skipped:", e.message);
    }

    // ── Step 6: Save timeline to projects table for editor access ──────────
    let editorProjectId = null;
    try {
      const { data: editorRow } = await supabaseAdmin
        .from("projects")
        .insert({
          user_id:           row.user_id,
          name:              `${row.product_name ?? "Promo Video"} — Promo`,
          safe_project_json: finalTimeline,
          orientation:       "9:16",
          mode:              "timeline",
          source:            "promo_video",
          editor_version:    "timeline",
        })
        .select("id")
        .single();
      editorProjectId = editorRow?.id ?? null;
    } catch (e) {
      console.warn(`[renderOrchestrator] projects insert failed (non-fatal):`, e.message);
    }

    await supabaseAdmin
      .from("promo_videos")
      .update({ timeline: finalTimeline, editor_project_id: editorProjectId, updated_at: new Date().toISOString() })
      .eq("id", projectId);

    // ── TH videos: skip Remotion — timeline JSON is the output ────────────
    // The editor opens the timeline directly. Export to MP4 is user-triggered
    // from the editor, same as any other timeline project.
    if (isThVideo) {
      await setStatus(projectId, PROJECT_STATUS.RENDERED, { editor_project_id: editorProjectId });
      console.log(`[renderOrchestrator] ${projectId} → TH timeline ready, opening editor`);
      return { projectId, video_url: null, editor_project_id: editorProjectId };
    }

    // ── Step 7: Remotion render (faceless only) ────────────────────────────
    // Drop audio/video layers with null src — Remotion's Html5Audio crashes on non-string src
    const renderTimeline = {
      ...finalTimeline,
      layers: finalTimeline.layers.filter(l =>
        l.type !== "audio" && l.type !== "video" ? true : !!l.src
      ),
    };

    const serveUrl = await getBundle();
    const { getCompositions, renderFrames, stitchFramesToVideo } = await import("@remotion/renderer");

    const comps = await getCompositions(serveUrl, { inputProps: { project: renderTimeline } });
    const comp  = comps.find(c => c.id === "TimelineComposition");
    if (!comp) throw new Error("TimelineComposition not found in Remotion bundle");

    fs.mkdirSync(framesDir, { recursive: true });

    const hasVideo = renderTimeline.layers?.some(l => l.type === "video") ?? false;
    const { assetsInfo } = await renderFrames({
      composition:     comp,
      serveUrl,
      inputProps:      { project: renderTimeline },
      outputDir:       framesDir,
      imageFormat:     "jpeg",
      concurrency:     hasVideo ? 4 : 6,
      chromiumOptions: { gl: "angle" },
    });

    await stitchFramesToVideo({
      composition:    comp,
      serveUrl,
      inputProps:     { project: renderTimeline },
      codec:          "h264",
      assetsInfo,
      outputLocation: outputPath,
      fps:            comp.fps,
      width:          comp.width,
      height:         comp.height,
    });

    fs.rmSync(framesDir, { recursive: true, force: true });

    // ── Step 8: Upload to Supabase storage ────────────────────────────────
    const storageKey  = `promo-renders/${projectId}/video.mp4`;
    const videoBuffer = fs.readFileSync(outputPath);

    const { error: storageErr } = await supabaseAdmin.storage
      .from("user-assets")
      .upload(storageKey, videoBuffer, { contentType: "video/mp4", upsert: true });

    if (storageErr) throw new Error(`Storage upload failed: ${storageErr.message}`);
    try { fs.unlinkSync(outputPath); } catch {}

    const { data: { publicUrl } } = supabaseAdmin.storage
      .from("user-assets")
      .getPublicUrl(storageKey);

    await setStatus(projectId, PROJECT_STATUS.RENDERED, { video_url: publicUrl, editor_project_id: editorProjectId });
    console.log(`[renderOrchestrator] ${projectId} → rendered: ${publicUrl}`);
    return { projectId, video_url: publicUrl, editor_project_id: editorProjectId };

  } catch (err) {
    try { fs.rmSync(framesDir, { recursive: true, force: true }); } catch {}
    try { fs.unlinkSync(outputPath); } catch {}

    console.error(`[renderOrchestrator] ${projectId} failed:`, err.message);
    await setStatus(projectId, PROJECT_STATUS.FAILED, { error_message: err.message }).catch(() => {});
    throw err;
  }
}
