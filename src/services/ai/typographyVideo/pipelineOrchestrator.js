import { supabaseAdmin }                       from "../../../server/middleware/shared.js";
import { generateTypographyScript }             from "./scriptGenerator.js";
import { designTypographyScene }               from "./sceneDesigner.js";
import { parseTypographySceneHTML }            from "./htmlParser.js";
import { buildTypographyTimeline }             from "./timelineBuilder.js";
import { generateFullVoiceover }               from "../promoVideo/ttsGenerator.js";

const CANVAS = { width: 1080, height: 1920 };

// ── Sentence timing from ElevenLabs word timestamps ───────────────────────────

function assignSentenceTimings(sentences, wordTimestamps) {
  if (!wordTimestamps?.length) {
    let t = 0;
    return sentences.map(s => {
      const words = (s.voiceover ?? s.text).trim().split(/\s+/).filter(Boolean).length;
      const dur   = Math.max(1.5, parseFloat((words / 2.5).toFixed(3)));
      const start = parseFloat(t.toFixed(4));
      const end   = parseFloat((t + dur).toFixed(4));
      t = end + 0.15;
      return { ...s, start, end, duration_seconds: dur };
    });
  }

  const norm = w => w.toLowerCase().replace(/[^a-z0-9]/g, "");
  let wi = 0;

  return sentences.map(s => {
    const sentWords     = (s.voiceover ?? s.text).trim().split(/\s+/).filter(Boolean);
    const normSentWords = sentWords.map(norm).filter(Boolean);

    if (!normSentWords.length || wi >= wordTimestamps.length) {
      const lastEnd = wordTimestamps[wordTimestamps.length - 1]?.end ?? 0;
      return { ...s, start: lastEnd, end: lastEnd + 1.5, duration_seconds: 1.5 };
    }

    // Find where this sentence starts in the word stream
    let sentStart = wordTimestamps[wi]?.start ?? 0;
    for (let i = wi; i < Math.min(wi + 6, wordTimestamps.length); i++) {
      if (norm(wordTimestamps[i].word) === normSentWords[0]) {
        sentStart = wordTimestamps[i].start;
        wi = i;
        break;
      }
    }

    // Advance pointer by word count
    wi       = Math.min(wi + sentWords.length, wordTimestamps.length);
    const lastIdx = Math.max(0, wi - 1);
    const sentEnd = wordTimestamps[lastIdx]?.end ?? sentStart + 1.5;

    return {
      ...s,
      start:            parseFloat(sentStart.toFixed(4)),
      end:              parseFloat(sentEnd.toFixed(4)),
      duration_seconds: parseFloat(Math.max(0.5, sentEnd - sentStart).toFixed(4)),
    };
  });
}

// ── Save ──────────────────────────────────────────────────────────────────────

async function saveTimeline(timeline, projectName, userId, rawAiJson = null) {
  const { data: row, error } = await supabaseAdmin
    .from("projects")
    .insert({
      user_id:           userId,
      name:              projectName,
      safe_project_json: timeline,
      orientation:       "9:16",
      mode:              "timeline",
      source:            "typography_video",
      editor_version:    "timeline",
      raw_ai_json:       rawAiJson,
    })
    .select("id")
    .single();

  if (error) throw new Error(`DB save failed: ${error.message}`);
  console.log(`[typography] saved → project ${row?.id}`);
  return row?.id ?? null;
}

// ── Main export ───────────────────────────────────────────────────────────────

export async function runTypographyPipeline(project, onProgress = () => {}) {
  const { input, inputType = "topic", targetDuration = 40, userId } = project;

  // Step 1: Script generation
  console.log(`[typography] step 1 — generating script (target: ${targetDuration}s)`);
  const script = await generateTypographyScript(input, inputType, targetDuration);
  const { sentences, voiceoverScript, projectName, palette, visualDirection, fontPair, musicMood } = script;

  const bgColor = palette.background;

  console.log(`[typography] script: ${sentences.length} sentence(s), bg=${bgColor}`);
  onProgress({ step: 1 });

  // Step 2: TTS with ElevenLabs + word timestamps
  console.log("[typography] step 2 — TTS");
  let audioUrl        = null;
  let wordTimestamps  = [];
  let audioDuration   = 0;

  if (voiceoverScript) {
    try {
      const tts      = await generateFullVoiceover(voiceoverScript, `typo-${Date.now()}`);
      audioUrl        = tts.audio_url;
      wordTimestamps  = tts.wordTimestamps ?? [];
      audioDuration   = tts.duration_seconds ?? 0;
      console.log(`[typography] TTS: ${audioDuration.toFixed(2)}s, ${wordTimestamps.length} word timestamps`);
    } catch (err) {
      console.warn("[typography] TTS failed, using estimated timings:", err.message);
    }
  }

  // Step 3: Assign per-sentence timing from word timestamps
  const timedSentences = assignSentenceTimings(sentences, wordTimestamps);

  // Step 3.5: Pre-compute appearsAt + shiftUpAt per script layer so GPT-5.4 can design keyframes
  const normWord = w => (w ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
  timedSentences.forEach(sentence => {
    if (!Array.isArray(sentence.layers)) return;
    const sentenceLayers = sentence.layers.map(layer => {
      const firstWord = normWord((layer.text ?? "").split(/\s+/)[0]);
      let appearsAt = 0;
      if (wordTimestamps.length > 0) {
        const wt = wordTimestamps.find(t =>
          normWord(t.word) === firstWord &&
          t.start >= sentence.start - 0.1 &&
          t.start <= sentence.end
        );
        appearsAt = wt ? parseFloat(Math.max(0, wt.start - sentence.start).toFixed(3)) : 0;
      } else {
        const sentWords = (sentence.text ?? "").split(/\s+/).map(normWord).filter(Boolean);
        const idx = sentWords.findIndex(w => w === firstWord);
        const sceneDur = sentence.duration_seconds ?? 2.5;
        appearsAt = idx >= 0 ? parseFloat((idx / Math.max(sentWords.length, 1) * sceneDur * 0.7).toFixed(3)) : 0;
      }
      return { ...layer, appearsAt };
    });

    // Compute shiftUpAt per supporting layer (layer-relative: when hero enters relative to this layer)
    const heroLayers = sentenceLayers.filter(l => l.type === "hero");
    const firstHeroAppearsAt = heroLayers.length > 0 ? Math.min(...heroLayers.map(l => l.appearsAt)) : null;
    sentence.layers = sentenceLayers.map(layer => {
      if (layer.type === "supporting" && firstHeroAppearsAt != null) {
        const shiftUpAt = parseFloat((firstHeroAppearsAt - layer.appearsAt).toFixed(3));
        return { ...layer, shiftUpAt: shiftUpAt > 0 ? shiftUpAt : null };
      }
      return layer;
    });
  });
  console.log("[typography] step 3.5 — layer appearsAt pre-computed");
  onProgress({ step: 2 });

  // Step 4: Design all scenes in parallel (GPT-5.4)
  console.log(`[typography] step 4 — designing ${timedSentences.length} scenes (parallel)`);
  const projectContext = {
    palette, visualDirection, fontPair, totalScenes: timedSentences.length,
  };
  const sceneHTMLs = await Promise.all(
    timedSentences.map((s, i) =>
      designTypographyScene(s.text, {
        ...projectContext,
        sceneIndex:       i,
        voiceoverText:    s.voiceover ?? s.text,
        layoutIntent:     s.layoutIntent     ?? "statement",
        visualIntent:     s.visual_intent    ?? "declaration",
        visualConcept:    s.visual_concept   ?? "",
        textLayers:       s.layers           ?? null,
        sceneDuration:    s.duration_seconds ?? null,
        compositionStyle: s.compositionStyle ?? (i === 0 ? "center-cluster" : null),
      }).catch(err => {
        console.warn(`[typography] scene ${i} design failed:`, err.message);
        return null;
      })
    )
  );

  // Step 5: Parse HTML scenes (GPT designs directly for 1080×1920)
  console.log("[typography] step 5 — parsing HTML scenes");
  const parsedScenes   = sceneHTMLs.map((html, i) =>
    html ? parseTypographySceneHTML(html, i, CANVAS) : { graph: [], keyframesCss: "" }
  );
  const sceneGraphs       = parsedScenes.map(s => s.graph);
  const sceneKeyframesArr = parsedScenes.map(s => s.keyframesCss ?? "");

  // Step 5b: Compute per-entry startOffset from TTS timestamps + per-word timestamps for text animations
  {
    timedSentences.forEach((sentence, si) => {
      const graph       = sceneGraphs[si] ?? [];
      const sceneDur    = sentence.duration_seconds ?? 2.5;
      const scriptLayers = Array.isArray(sentence.layers) ? sentence.layers : [];
      const textEntries  = graph.filter(e => e.type === "text" && e.role !== "background");

      // Scoped TTS search: only within this sentence's global time window (prevents cross-scene leakage)
      const scopedFind = (normW) =>
        wordTimestamps.find(t =>
          normWord(t.word) === normW &&
          t.start >= sentence.start - 0.1 &&
          t.start <= sentence.end
        );

      textEntries.forEach(entry => {
        const words     = (entry.text ?? "").split(/\s+/).filter(Boolean);
        const firstWord = normWord(words[0]);

        // startOffset: primary — reuse appearsAt from the matching script layer (step 3.5 already ran TTS lookup correctly)
        const matchedScriptLayer = scriptLayers.find(l => normWord((l.text ?? "").split(/\s+/)[0]) === firstWord);

        if (matchedScriptLayer?.appearsAt != null) {
          entry.startOffset = parseFloat(matchedScriptLayer.appearsAt.toFixed(3));
        } else if (wordTimestamps.length > 0) {
          // Fallback: scoped TTS search within this sentence's time range
          const wt = scopedFind(firstWord);
          entry.startOffset = wt ? parseFloat(Math.max(0, wt.start - sentence.start).toFixed(3)) : 0;
        } else {
          const sentWords = (sentence.text ?? "").split(/\s+/).map(normWord).filter(Boolean);
          const idx = sentWords.findIndex(w => w === firstWord);
          entry.startOffset = idx >= 0
            ? parseFloat((idx / Math.max(sentWords.length, 1) * sceneDur * 0.7).toFixed(3))
            : 0;
        }

        // Per-word timestamps for word-by-word / fade-words text animations
        if (entry.textAnimation === "word-by-word" || entry.textAnimation === "fade-words") {
          const entryGlobalStart = sentence.start + entry.startOffset;
          entry.wordTimestamps = words.map((word, idx) => {
            const normW = normWord(word);
            if (wordTimestamps.length > 0) {
              // Scope to after this entry appears and within sentence
              const wt = wordTimestamps.find(t =>
                normWord(t.word) === normW &&
                t.start >= entryGlobalStart - 0.1 &&
                t.start <= sentence.end
              );
              return { word, time: wt ? parseFloat(Math.max(0, wt.start - sentence.start - entry.startOffset).toFixed(3)) : null };
            }
            return { word, time: parseFloat((idx * (sceneDur * 0.7 / Math.max(words.length, 1))).toFixed(3)) };
          });
        }
      });

      // Background + non-text entries start at scene start
      graph.filter(e => e.type !== "text" || e.role === "background")
           .forEach(e => { e.startOffset = 0; });
    });
    console.log("[typography] step 5b — per-entry timing computed");
  }

  // Ensure every scene has a background element — use GPT's choice, add fallback only if missing.
  sceneGraphs.forEach((graph, i) => {
    const bgEntry = graph.find(e => e.role === "background");
    if (!bgEntry) {
      graph.unshift({
        id: `s${i}_background`,
        role: "background", layer: "gradient", animation: "none", sceneElement: "background",
        type: "gradient", trackId: "track_background",
        x: 0, y: 0, width: CANVAS.width, height: CANVAS.height, // full 1920 canvas
        rotation: 0, zIndex: 0, opacity: 1,
        borderRadius: 0, borderWidth: 0, borderColor: "#ffffff",
        filter: null, boxShadow: null, mixBlendMode: null, backdropFilter: null,
        background: bgColor, text: null, style: {},
      });
      console.log(`[typography] scene ${i} — background missing, added fallback: ${bgColor}`);
    } else {
      // Stretch GPT's background to fill the full 1920 canvas
      bgEntry.x = 0; bgEntry.y = 0;
      bgEntry.width = CANVAS.width; bgEntry.height = CANVAS.height;
      console.log(`[typography] scene ${i} — background kept: ${bgEntry.background}`);
    }
  });

  onProgress({ step: 3 });

  // Step 6: Build timeline
  console.log("[typography] step 6 — building timeline");
  const { timeline } = buildTypographyTimeline(sceneGraphs, timedSentences, {
    projectName,
    accentColor: palette.accent,
    bgColor,
    audioUrl,
    audioDuration,
    projectId: null,
    sceneKeyframesArr,
  });

  // Step 7: Background music
  console.log(`[typography] step 7 — injecting music (mood: ${musicMood})`);
  try {
    const { data: allTracks } = await supabaseAdmin
      .from("music_tracks")
      .select("public_url, title, mood")
      .eq("is_active", true);

    if (allTracks?.length) {
      const moodTracks = allTracks.filter(t => t.mood === musicMood);
      const pool  = moodTracks.length ? moodTracks : allTracks;
      const track = pool[Math.floor(Math.random() * pool.length)];
      const musicDur = timeline.format.duration;
      timeline.layers.push({
        id: "music_global", trackId: "track_music",
        type: "audio", audioType: "music", src: track.public_url,
        start: 0, end: musicDur, zIndex: 0,
        visible: true, locked: false,
        trimStart: 0, trimEnd: musicDur,
        volume: 0.2, muted: false, fadeIn: 1.5, fadeOut: 2,
        sfx: null, keyframes: {}, animation: null, transition: null, transform: null,
      });
      console.log(`[typography] music: "${track.title}" (${musicMood})`);
    } else {
      console.warn("[typography] no music tracks found");
    }
  } catch (e) {
    console.warn("[typography] music injection skipped:", e.message);
  }

  onProgress({ step: 4 });

  // Step 8: Save to database
  console.log("[typography] step 8 — saving");
  const rawAiJson = {
    script:     { projectName, palette, visualDirection, fontPair, musicMood, sentences: timedSentences },
    sceneHTMLs: sceneHTMLs,
  };
  const projectId = await saveTimeline(timeline, projectName, userId, rawAiJson);

  console.log(`[typography] done — ${timedSentences.length} scenes, ${timeline.format.duration.toFixed(2)}s, project=${projectId}`);
  return { projectId, projectName };
}
