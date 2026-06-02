/**
 * pipelineOrchestrator.js
 * src/services/ai/promoVideo/v2/pipelineOrchestrator.js
 *
 * V2 pipeline — runs at /create time (not /render).
 * Script → HTML design → parse → build timeline → TTS → music → Pixabay → save.
 */

import { supabaseAdmin }                              from "../../../../server/middleware/shared.js";
import { generatePromoVoiceovers }                    from "../ttsGenerator.js";
import { pickAutoMood }                               from "../../../../core/registries/musicRegistry.js";
import { generateScriptV2 }                           from "./scriptGenerator.js";
import { designAllScenes }                            from "./sceneDesigner.js";
import { parseSceneHTML }                             from "./htmlParser.js";
import { buildTimeline }                              from "./timelineBuilder.js";

// ── Helpers mirrored from renderOrchestrator ──────────────────────────────────

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
  if (!key) return null;
  if (!hint) return null;
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

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * runV2Pipeline(project)
 *
 * Runs the full V2 pipeline for a faceless promo video:
 *   1. Generate structured scene script (gpt-4.1)
 *   2. Design each scene as HTML (gpt-5.5)
 *   3. Parse HTML → scene graphs
 *   4. Build initial timeline (estimated durations)
 *   5. TTS for all spoken scenes
 *   6. Update scene durations from actual audio
 *   7. Rebuild timeline with correct durations
 *   8. Inject voiceover audio layers
 *   9. Inject background music
 *  10. Fetch Pixabay stock images
 *  11. Save timeline to projects table for editor access
 *
 * Returns enriched project object. The /create route handles the final
 * promo_videos upsert.
 */
export async function runV2Pipeline(project) {
  const projectId = project.id;

  // ── Build projectContext (V2 design system) ────────────────────────────────
  const projectContext = {
    projectId,
    productName: project.product_name ?? "Product",
    niche:       project.style?.niche            ?? "saas",
    accentColor: project.style?.color_palette    ?? "#f5c518",
    logoUrl:     project.logo_url                ?? null,
    fps:         30,
    mood:        project.style?.music_mood       ?? null,
    musicMood:   project.style?.music_mood       ?? "upbeat",
  };

  // ── Step 1: Generate scene script ─────────────────────────────────────────
  console.log(`[v2/pipeline] ${projectId} — generating script`);
  const scriptResult = await generateScriptV2(project);
  let scenes = scriptResult.scenes.map(s => ({ ...s }));

  // ── Step 2: Design all scenes as HTML ─────────────────────────────────────
  console.log(`[v2/pipeline] ${projectId} — designing ${scenes.length} scenes`);
  const designResults = await designAllScenes(scenes, projectContext);

  // ── Step 3: Parse HTML → scene graphs ─────────────────────────────────────
  const sceneGraphs = designResults.map((result, i) => {
    if (result.error || !result.html) {
      console.warn(`[v2/pipeline] scene ${i} design failed: ${result.error}`);
      return [];
    }
    const graph = parseSceneHTML(result.html, i);
    console.log(`[v2/pipeline] scene ${i} graph: ${graph.length} layers${graph.length > 0 ? ` — first: ${JSON.stringify(graph[0]).slice(0, 120)}` : " — EMPTY"}`);
    return graph;
  });

  // ── Step 4: Initial timeline build (estimated durations) ──────────────────
  const { voiceover_queue, asset_queue } = buildTimeline(sceneGraphs, scenes, projectContext);

  // ── Step 5: TTS ───────────────────────────────────────────────────────────
  let voiceover_results = [];
  if (voiceover_queue.length > 0) {
    console.log(`[v2/pipeline] ${projectId} — generating ${voiceover_queue.length} TTS voiceovers`);
    voiceover_results = await generatePromoVoiceovers(voiceover_queue, projectId);
  }

  // ── Step 6: Update scene durations from actual TTS audio lengths ──────────
  // voiceover_queue uses scene_id = i + 1 (1-based scene index)
  const durBySid = {};
  for (const r of voiceover_results) {
    if (r.duration_seconds != null) durBySid[r.scene_id] = r.duration_seconds;
  }
  for (let i = 0; i < scenes.length; i++) {
    if (scenes[i].spoken?.trim()) {
      const measured = durBySid[i + 1];
      scenes[i].duration_seconds = measured != null
        ? parseFloat((measured + 0.3).toFixed(2))
        : estimateTtsDuration(scenes[i].spoken);
    }
  }

  // ── Step 7: Rebuild timeline with correct durations ────────────────────────
  const { timeline } = buildTimeline(sceneGraphs, scenes, projectContext);

  // ── Step 8: Inject voiceover audio layers ─────────────────────────────────
  // Reconstruct scene start times from updated durations (same pattern as DSL path)
  let finalTimeline = timeline;
  if (voiceover_results.length > 0) {
    let cur = 0;
    const sceneStartBySid = {};
    for (let i = 0; i < scenes.length; i++) {
      sceneStartBySid[i + 1] = parseFloat(cur.toFixed(4));
      cur = parseFloat((cur + parseFloat(Math.max(3.0, scenes[i].duration_seconds || 3).toFixed(4))).toFixed(4));
    }

    const voiceoverLayers = voiceover_results
      .filter(r => r.audio_url && sceneStartBySid[r.scene_id] != null)
      .map(({ scene_id, audio_url, duration_seconds }) => {
        const start    = sceneStartBySid[scene_id];
        const audioLen = duration_seconds ?? 3;
        return {
          id:        `voiceover_s${scene_id}`,
          trackId:   `voiceover_track_${scene_id}`,
          type:      "audio", audioType: "voiceover",
          src:       audio_url,
          start,
          end:       parseFloat((start + audioLen + 0.3).toFixed(4)),
          zIndex:    0, visible: true, locked: false,
          trimStart: 0, trimEnd: audioLen,
          volume:    1.0, muted: false, fadeIn: 0.1, fadeOut: 0.2,
          sfx:       null, keyframes: {}, animation: null, transition: null, transform: null,
        };
      });

    const mergedLayers   = [...timeline.layers, ...voiceoverLayers];
    const actualDuration = parseFloat(mergedLayers.reduce((max, l) => Math.max(max, l.end ?? 0), 0).toFixed(4));
    finalTimeline = { ...timeline, layers: mergedLayers, format: { ...timeline.format, duration: actualDuration } };
  }

  // ── Step 9: Inject background music ───────────────────────────────────────
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
        volume: 0.15, muted: false, fadeIn: 1, fadeOut: 1,
        sfx: null, keyframes: {}, animation: null, transition: null, transform: null,
      });
      console.log(`[v2/pipeline] music injected: "${track.title}" (${mood})`);
    }
  } catch (e) {
    console.warn("[v2/pipeline] music injection skipped:", e.message);
  }

  // ── Step 10: Pixabay stock images for image-requirement scenes ─────────────
  const imageScenes = scenes.filter(s => s.asset_requirement === "image");
  if (imageScenes.length > 0) {
    await Promise.all(imageScenes.map(async (scene, idx) => {
      const query    = extractSearchQuery(scene.asset_hint || project.product_name || "");
      const imageUrl = await fetchPixabayImage(query);
      if (imageUrl) {
        scenes[idx].asset_url = imageUrl;
        // Inject into timeline layers that are image placeholders for this scene
        const sceneIdx = scene.scene_index ?? idx;
        for (const layer of finalTimeline.layers) {
          if (layer.type === "image" && layer.id?.startsWith(`s${sceneIdx}_`) && !layer.src) {
            layer.src = imageUrl;
          }
        }
      }
    }));
  }

  // ── Step 11: Save timeline to projects table for editor access ─────────────
  let editorProjectId = null;
  try {
    const { data: editorRow } = await supabaseAdmin
      .from("projects")
      .insert({
        user_id:           project.user_id,
        name:              `${project.product_name ?? "Promo Video"} — Promo`,
        safe_project_json: finalTimeline,
        orientation:       "9:16",
        mode:              "timeline",
        source:            "promo_video_v2",
        editor_version:    "timeline",
        raw_ai_json:       { scenes_html: designResults.map(r => ({ sceneIndex: r.sceneIndex, html: r.html, error: r.error })) },
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
    scene_format:       "v2",
    pipeline_version:   "v2",
    status:             "script_generated",
    duration_seconds:   totalDuration,
    editor_project_id:  editorProjectId,
    _timeline:          finalTimeline,   // private — used by /create for upsert
    _asset_queue:       asset_queue,
    updated_at:         new Date().toISOString(),
  };
}
