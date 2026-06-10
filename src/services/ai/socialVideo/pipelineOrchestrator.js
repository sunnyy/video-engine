/**
 * pipelineOrchestrator.js
 * Social Video pipeline — turns a social media post URL into a timeline.
 *
 * Steps:
 *   1.  Fetch social content (text, image, metrics)
 *   2.  Generate script (GPT-4.1) → scenes, palette, fontPair, musicMood
 *   3.  Design scenes in parallel (GPT-5.4)
 *   4.  Parse HTML → scene graphs
 *   5.  Generate TTS (ElevenLabs with-timestamps)
 *   6.  Assign scene durations from word timestamps
 *   7.  Build timeline
 *   8.  Inject fetched social image into social-image placeholders
 *   9.  Inject background music
 *  10.  Save to projects table (source: "social_video")
 */

import { supabaseAdmin }          from "../../../server/middleware/shared.js";
import { fetchSocialContent }     from "./contentFetcher.js";
import { generateSocialScript }   from "./scriptGenerator.js";
import { designSocialScene }      from "./sceneDesigner.js";
import { parseSceneHTML }         from "../promoVideo/htmlParser.js";
import { buildTimeline }          from "../promoVideo/timelineBuilder.js";
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

// ── Main export ───────────────────────────────────────────────────────────────

export async function runSocialPipeline(params, onStep) {
  const { url, userId, voiceId = null, targetDuration = 25 } = params;

  const step = (msg) => { console.log(`[social] ${msg}`); onStep?.({ step: msg }); };

  // ── Step 1: Fetch social content ─────────────────────────────────────────
  step("Fetching post content…");
  const content = await fetchSocialContent(url);
  console.log(`[social] platform=${content.platform} author="${content.author}" imageUrl=${!!content.imageUrl}`);

  // ── Step 2: Generate script ───────────────────────────────────────────────
  step("Writing script…");
  // Give threads more time — they have more content to cover
  const effectiveDuration = content.isThread
    ? Math.min(targetDuration + content.threadLength * 3, 45)
    : targetDuration;
  const { full_script, scenes: rawScenes, palette, fontPair, musicMood } =
    await generateSocialScript({ content, targetDuration: effectiveDuration });

  const scenes = rawScenes.map(s => ({ ...s }));
  console.log(`[social] ${scenes.length} scenes, musicMood=${musicMood}`);

  const projectContext = {
    palette,
    fontPair,
    musicMood,
    author:      content.author      ?? "",
    authorHandle: content.authorHandle ?? "",
    platform:    content.platform    ?? "twitter",
    canvasWidth:  CANVAS.width,
    canvasHeight: CANVAS.height,
    fps:         FPS,
    voiceId,
  };

  // ── Steps 3+4: Design scenes in parallel ─────────────────────────────────
  step("Designing scenes…");
  const sceneResults = await Promise.all(
    scenes.map(async (scene) => {
      try {
        const html  = await designSocialScene(scene, projectContext);
        const graph = parseSceneHTML(html || "", scene.scene_index, CANVAS);
        console.log(`[social] scene ${scene.scene_index} (${scene.intent}) — ${graph.length} layers`);
        return { graph, html };
      } catch (err) {
        console.error(`[social] scene ${scene.scene_index} design failed:`, err.message);
        return { graph: [], html: null };
      }
    })
  );
  const sceneGraphs = sceneResults.map(r => r.graph);
  const sceneHTMLs  = sceneResults.map(r => r.html);

  // ── Step 5: TTS ───────────────────────────────────────────────────────────
  step("Generating voiceover…");
  let voiceoverUrl      = null;
  let voiceoverDuration = 0;

  const ttsScript = scenes.map(s => s.script_segment).join(" ").trim();
  if (ttsScript) {
    try {
      const ttsResult = await generateFullVoiceover(ttsScript, `social-${userId}-${Date.now()}`, voiceId);
      voiceoverUrl      = ttsResult.audio_url;
      voiceoverDuration = ttsResult.duration_seconds;
      if (ttsResult.wordTimestamps?.length) assignWordTimestamps(scenes, ttsResult.wordTimestamps);
    } catch (err) {
      console.warn("[social] TTS failed (non-fatal):", err.message);
    }
  }

  // Extend last scene to cover full voiceover audio
  if (voiceoverDuration > 0 && scenes.length > 0) {
    const TRAIL = 0.4;
    const sumDur = scenes.reduce((acc, s) => acc + (s.duration_seconds ?? 0), 0);
    const last   = scenes[scenes.length - 1];
    if (voiceoverDuration > sumDur) {
      last.duration_seconds = parseFloat(((last.duration_seconds ?? 0) + voiceoverDuration - sumDur).toFixed(3));
    }
    last.duration_seconds = parseFloat(((last.duration_seconds ?? 0) + TRAIL).toFixed(3));
  }

  // ── Step 6: Build timeline ─────────────────────────────────────────────────
  step("Building timeline…");
  const { timeline } = buildTimeline(sceneGraphs, scenes, projectContext);

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

  // ── Step 8: Inject fetched social image into social-image placeholders ─────
  if (content.imageUrl) {
    let injected = 0;
    for (const layer of finalTimeline.layers) {
      if (layer.type === "image" && layer.assetType === "social-image" && !layer.src) {
        layer.src = content.imageUrl;
        injected++;
      }
    }
    if (injected > 0) console.log(`[social] injected fetched image into ${injected} placeholder(s)`);
  }

  // ── Step 9: Background music ──────────────────────────────────────────────
  try {
    const { data: allTracks } = await supabaseAdmin
      .from("music_tracks")
      .select("public_url, title, mood")
      .eq("is_active", true);

    if (allTracks?.length) {
      const pool  = allTracks.filter(t => t.mood === musicMood).length
        ? allTracks.filter(t => t.mood === musicMood)
        : allTracks;
      const track    = pool[Math.floor(Math.random() * pool.length)];
      const musicDur = finalTimeline.format.duration;
      finalTimeline.layers.push({
        id: "music_global", trackId: "track_music",
        type: "audio", audioType: "music", src: track.public_url,
        start: 0, end: musicDur, zIndex: 0,
        visible: true, locked: false, trimStart: 0, trimEnd: musicDur,
        volume: 0.2, muted: false, fadeIn: 1, fadeOut: 1,
        sfx: null, keyframes: {}, animation: null, transition: null, transform: null,
      });
      console.log(`[social] music injected: "${track.title}" (${musicMood})`);
    }
  } catch (e) {
    console.warn("[social] music injection skipped:", e.message);
  }

  if (full_script) finalTimeline.full_script = full_script;

  // ── Step 10: Save to projects table ──────────────────────────────────────
  step("Saving project…");
  const projectName = content.author
    ? `${content.author} — Social Video`
    : `Social Video — ${new Date().toLocaleDateString()}`;

  let editorProjectId = null;
  try {
    const { data: row } = await supabaseAdmin
      .from("projects")
      .insert({
        user_id:           userId,
        name:              projectName,
        safe_project_json: finalTimeline,
        orientation:       "9:16",
        mode:              "timeline",
        source:            "social_video",
        editor_version:    "timeline",
        raw_ai_json: {
          platform:  content.platform,
          author:    content.author,
          sourceUrl: url,
          scenes:    scenes.map(s => ({
            sceneIndex:    s.scene_index,
            intent:        s.intent,
            archetype:     s.archetype ?? null,
            visual_concept: s.visual_concept,
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
