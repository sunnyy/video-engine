import { supabaseAdmin }               from "../../../server/middleware/shared.js";
import { generateTypographyScript }     from "./scriptGenerator.js";
import { buildTypographyTimelineDirect } from "./timelineBuilderDirect.js";
import { generateFullVoiceover }         from "../promoVideo/ttsGenerator.js";
import { pickMoodForNiche, pickMusicByMood } from "../../../core/registries/musicRegistry.js";
import { moderateInput }                     from "../shared/moderation.js";

// ── Beat timing: two-level match (scene → timestamps, beat → scene timestamps) ──

function assignBeatTimings(scenes, globalWordTimestamps) {
  const norm = w => (w ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
  let gWi = 0; // global word index into ElevenLabs timestamps
  const timedBeats = [];

  for (const scene of scenes) {
    const voiceoverWords = scene.voiceover.trim().split(/\s+/).filter(Boolean);

    // Level 1: find where this scene's voiceover starts in global timestamps
    let sceneStartIdx = gWi;
    if (globalWordTimestamps.length > 0) {
      for (let i = gWi; i < Math.min(gWi + 12, globalWordTimestamps.length); i++) {
        if (norm(globalWordTimestamps[i].word) === norm(voiceoverWords[0])) {
          sceneStartIdx = i;
          gWi = i;
          break;
        }
      }
    }

    // Slice timestamps for this scene (length = voiceover word count)
    const sceneEndIdx  = Math.min(gWi + voiceoverWords.length, globalWordTimestamps.length);
    const sceneTs      = globalWordTimestamps.slice(sceneStartIdx, sceneEndIdx);
    gWi = sceneEndIdx; // advance past this scene

    // Level 2: match each beat within the scene's timestamps
    let lWi = 0; // local index within sceneTs

    for (const beat of scene.beats) {
      const beatWords = beat.text.trim().split(/\s+/).filter(Boolean);

      // Find first word of beat in remaining scene timestamps
      let beatStartLocal = lWi;
      if (sceneTs.length > 0) {
        for (let i = lWi; i < Math.min(lWi + sceneTs.length, sceneTs.length); i++) {
          if (norm(sceneTs[i].word) === norm(beatWords[0])) {
            beatStartLocal = i;
            lWi = i;
            break;
          }
        }
      }

      // Advance local index past beat words
      lWi = Math.min(lWi + beatWords.length, sceneTs.length);
      const beatEndLocal = Math.max(0, lWi - 1);

      const beatStart = sceneTs[beatStartLocal]?.start ?? (timedBeats[timedBeats.length - 1]?.end ?? 0) + 0.1;
      const beatEnd   = sceneTs[beatEndLocal]?.end   ?? beatStart + 0.8;

      timedBeats.push({
        ...beat,
        start:            parseFloat(beatStart.toFixed(4)),
        end:              parseFloat(beatEnd.toFixed(4)),
        duration_seconds: parseFloat(Math.max(0.2, beatEnd - beatStart).toFixed(4)),
      });
    }
  }

  return timedBeats;
}

// ── Fallback timing when no TTS word timestamps are available ─────────────────

function assignBeatTimingsFallback(scenes) {
  let t = 0;
  return scenes.flatMap(scene =>
    scene.beats.map(beat => {
      const words = beat.text.trim().split(/\s+/).filter(Boolean).length;
      const dur   = parseFloat(Math.max(0.4, (words / 2.8)).toFixed(3));
      const start = parseFloat(t.toFixed(4));
      const end   = parseFloat((t + dur).toFixed(4));
      t = end + 0.08;
      return { ...beat, start, end, duration_seconds: dur };
    })
  );
}

// ── Save ──────────────────────────────────────────────────────────────────────

// Map the chosen orientation to canvas dimensions — drives the typographic timeline + saved format.
function orientationToCanvas(orientation) {
  switch (orientation) {
    case "16:9": return { width: 1920, height: 1080 };
    case "1:1":  return { width: 1080, height: 1080 };
    case "4:5":  return { width: 1080, height: 1350 };
    default:     return { width: 1080, height: 1920 }; // 9:16
  }
}

async function saveTimeline(timeline, projectName, userId, orientation = "9:16") {
  const { data: row, error } = await supabaseAdmin
    .from("projects")
    .insert({
      user_id:           userId,
      name:              projectName,
      safe_project_json: timeline,
      orientation:       orientation,
      mode:              "timeline",
      source:            "typography_video",
      editor_version:    "timeline",
    })
    .select("id")
    .single();

  if (error) throw new Error(`DB save failed: ${error.message}`);
  console.log(`[typography] saved → project ${row?.id}`);
  return row?.id ?? null;
}

// ── Phase 1: PLAN (free) — script only, returned for confirmation/editing ──────

export async function planTypography(project) {
  const { input, inputType = "topic", targetDuration = 40, language = "en", styleId = "auto" } = project;

  await moderateInput(input, { label: "typography input" });

  console.log(`[typography] plan — generating script (target: ${targetDuration}s)`);
  const script = await generateTypographyScript(input, inputType, targetDuration, language, styleId);
  const { scenes, voiceoverScript, projectName, palette, fontPair, musicMood, niche } = script;
  const totalBeats = scenes.reduce((n, sc) => n + sc.beats.length, 0);
  console.log(`[typography] plan: ${scenes.length} scenes, ${totalBeats} beats`);

  return { scenes, voiceoverScript, projectName, palette, fontPair, musicMood, niche };
}

// ── Phase 2: PRODUCE (charges) — TTS → timing → build → music → save ───────────
// scenes may carry the user's edited voiceover text; narration is rebuilt from them.

export async function produceTypography(plan, params, onProgress = () => {}) {
  const { userId, voiceId = null, orientation = "9:16" } = params;
  const canvas = orientationToCanvas(orientation);
  const scenes = (plan.scenes ?? []).map(s => ({ ...s }));
  const { projectName, palette, fontPair, musicMood, niche } = plan;
  const voiceoverScript = scenes.map(sc => (sc.voiceover ?? "").trim()).filter(Boolean).join(" ");

  onProgress({ step: 1 });

  // Step 2: TTS — join all scene voiceovers into one continuous narration
  console.log("[typography] step 2 — TTS");
  let audioUrl       = null;
  let wordTimestamps = [];
  let audioDuration  = 0;

  const ttsScript = scenes.map(sc => sc.voiceover.trim()).join(" ");

  if (ttsScript) {
    try {
      const tts  = await generateFullVoiceover(ttsScript, `typo-${Date.now()}`, voiceId, 1.1);
      audioUrl      = tts.audio_url;
      wordTimestamps = tts.wordTimestamps ?? [];
      audioDuration  = tts.duration_seconds ?? 0;
      console.log(`[typography] TTS: ${audioDuration.toFixed(2)}s, ${wordTimestamps.length} word timestamps`);
    } catch (err) {
      console.warn("[typography] TTS failed, using estimated timings:", err.message);
    }
  }

  onProgress({ step: 2 });

  // Step 3: Assign per-beat timing from word timestamps
  const timedBeats = wordTimestamps.length
    ? assignBeatTimings(scenes, wordTimestamps)
    : assignBeatTimingsFallback(scenes);
  console.log(`[typography] step 3 — beat timing: ${timedBeats.length} beats`);

  // Step 4: Build timeline
  console.log("[typography] step 4 — building timeline");
  const { timeline } = buildTypographyTimelineDirect(timedBeats, {
    projectName,
    palette,
    fontPair,
    audioUrl,
    audioDuration,
    globalWordTimestamps: wordTimestamps,
    canvas,
  });
  onProgress({ step: 3 });

  // Attach full script to meta for later retrieval
  timeline.meta.script = { voiceoverScript, scenes };
  timeline.full_script = voiceoverScript;   // for easy access in safe_project_json

  // Step 5: Background music
  const resolvedMood = niche ? pickMoodForNiche(niche) : musicMood;
  console.log(`[typography] step 5 — injecting music (niche: ${niche ?? "—"}, mood: ${resolvedMood})`);
  try {
    const { data: allTracks } = await supabaseAdmin
      .from("music_tracks")
      .select("public_url, title, mood")
      .eq("is_active", true);

    if (allTracks?.length) {
      // Build library map grouped by mood, same shape pickMusicByMood expects
      const library = allTracks.reduce((acc, t) => {
        if (!acc[t.mood]) acc[t.mood] = [];
        acc[t.mood].push(t);
        return acc;
      }, {});
      const picked = pickMusicByMood(resolvedMood, library);
      if (picked) {
        const musicDur = timeline.format.duration;
        timeline.layers.push({
          id: "music_global", trackId: "track_music",
          type: "audio", audioType: "music", src: picked.src,
          start: 0, end: musicDur, zIndex: 0,
          visible: true, locked: false,
          trimStart: 0, trimEnd: musicDur,
          volume: 0.18, muted: false, fadeIn: 1.5, fadeOut: 2,
          sfx: null, keyframes: {}, animation: null, transition: null, transform: null,
        });
        console.log(`[typography] music: "${picked.label}" (${resolvedMood})`);
      }
    }
  } catch (e) {
    console.warn("[typography] music injection skipped:", e.message);
  }

  onProgress({ step: 4 });

  // Step 6: Save
  console.log("[typography] step 6 — saving");
  const projectId = await saveTimeline(timeline, projectName, userId, orientation);

  console.log(`[typography] done — ${timedBeats.length} beats, ${timeline.format.duration.toFixed(2)}s, project=${projectId}`);
  return { projectId, projectName };
}

// ── Combined (no confirmation) — used by the legacy /generate route ────────────

export async function runTypographyPipeline(project, onProgress = () => {}) {
  const plan = await planTypography(project);
  return produceTypography(
    plan,
    { userId: project.userId, voiceId: project.voiceId ?? null, language: project.language ?? "en" },
    onProgress,
  );
}
