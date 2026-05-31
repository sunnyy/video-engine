import fs from "fs";
import path from "path";
import { openai, TEMP_DIR, uuidv4 } from "../../../server/middleware/shared.js";

const PAUSE_GAP       = 0.6;  // raised from 0.4 — catches real sentence boundaries in Hindi/Hinglish
const MAX_SCENE_DUR   = 4.0;  // lowered from 6.0 — forces more cuts, shorter scenes
const MAX_SCENE_WORDS = 10;   // lowered from 14 — breaks long spoken lines earlier
const MIN_SCENE_DUR   = 1.5;  // lowered from 2.0 — allows fast flash cuts

// ── Core: Whisper + segmentation on an already-on-disk file ──────────────────
async function transcribeAndSegment(tmpPath) {
  const transcription = await openai.audio.transcriptions.create({
    model:                   "whisper-1",
    file:                    fs.createReadStream(tmpPath),
    response_format:         "verbose_json",
    timestamp_granularities: ["word"],
  });

  const words = transcription.words || [];
  if (words.length === 0) throw new Error("Whisper returned no word-level timestamps — check audio quality");

  const full_transcript = (transcription.text || words.map(w => w.word).join(" ")).trim();
  const language        = transcription.language || "en";
  const total_duration  = words[words.length - 1]?.end ?? 0;

  console.log(`[talkingHeadProcessor] transcribed ${words.length} words, ${total_duration.toFixed(1)}s`);

  // Log gaps > 3s between consecutive word timestamps so we can see where Whisper
  // detected silence or dropped coverage in the source video.
  for (let i = 1; i < words.length; i++) {
    const gap = words[i].start - words[i - 1].end;
    if (gap > 3) {
      console.log(`[talkingHeadProcessor] gap ${gap.toFixed(2)}s between "${words[i-1].word.trim()}" (end ${words[i-1].end.toFixed(2)}s) → "${words[i].word.trim()}" (start ${words[i].start.toFixed(2)}s)`);
    }
  }

  const scenes = [];
  let bucket   = [];

  function flushBucket() {
    if (bucket.length === 0) return;
    const spoken   = bucket.map(w => w.word.trim()).join(" ").replace(/\s+/g, " ").trim();
    const rawStart = bucket[0].start;
    const rawEnd   = bucket[bucket.length - 1].end;
    const dur      = parseFloat((rawEnd - rawStart).toFixed(2));
    scenes.push({
      scene_id:         scenes.length + 1,
      spoken,
      start:            parseFloat(rawStart.toFixed(3)),
      end:              parseFloat(rawEnd.toFixed(3)),
      duration_seconds: dur,
      word_count:       bucket.length,
      visual_mode:      null,
    });
    bucket = [];
  }

  for (let i = 0; i < words.length; i++) {
    const w    = words[i];
    const prev = words[i - 1];
    if (bucket.length > 0) {
      const curDur     = w.end - bucket[0].start;
      const pauseBreak = prev && (w.start - prev.end) > PAUSE_GAP;
      const durBreak   = curDur > MAX_SCENE_DUR;
      const wordBreak  = bucket.length >= MAX_SCENE_WORDS;
      if (pauseBreak || durBreak || wordBreak) flushBucket();
    }
    bucket.push(w);
  }
  flushBucket();

  // Hard-split any scene that still exceeds MAX_SCENE_DUR (e.g. no pauses detected)
  const finalScenes = [];
  for (const scene of scenes) {
    if (scene.duration_seconds <= MAX_SCENE_DUR) {
      finalScenes.push({ ...scene, scene_id: finalScenes.length + 1 });
      continue;
    }
    // Split words evenly into chunks of MAX_SCENE_WORDS
    const sceneWords = scene.spoken.split(/\s+/);
    const chunkSize  = Math.ceil(sceneWords.length / Math.ceil(scene.duration_seconds / MAX_SCENE_DUR));
    const totalDur   = scene.duration_seconds;
    const perWord    = totalDur / sceneWords.length;
    for (let i = 0; i < sceneWords.length; i += chunkSize) {
      const chunk    = sceneWords.slice(i, i + chunkSize);
      const chunkStart = parseFloat((scene.start + i * perWord).toFixed(3));
      const chunkEnd   = parseFloat((scene.start + Math.min(i + chunkSize, sceneWords.length) * perWord).toFixed(3));
      finalScenes.push({
        scene_id:         finalScenes.length + 1,
        spoken:           chunk.join(" "),
        start:            chunkStart,
        end:              chunkEnd,
        duration_seconds: parseFloat((chunkEnd - chunkStart).toFixed(2)),
        word_count:       chunk.length,
        visual_mode:      null,
      });
    }
  }

  // Merge any scene shorter than MIN_SCENE_DUR with the adjacent scene that
  // produces a total closest to half of MAX_SCENE_DUR (≈2s target).
  let merged = [...finalScenes];
  let changed = true;
  while (changed && merged.length > 1) {
    changed = false;
    for (let i = 0; i < merged.length; i++) {
      if (merged[i].duration_seconds < MIN_SCENE_DUR) {
        const target   = MAX_SCENE_DUR / 2;
        const prevSum  = i > 0                  ? merged[i - 1].duration_seconds + merged[i].duration_seconds : Infinity;
        const nextSum  = i < merged.length - 1  ? merged[i].duration_seconds + merged[i + 1].duration_seconds : Infinity;
        const useNext  = i === 0 || Math.abs(nextSum - target) < Math.abs(prevSum - target);
        const [a, b]   = useNext ? [i, i + 1] : [i - 1, i];
        const ma = merged[a], mb = merged[b];
        merged.splice(a, 2, {
          scene_id:         ma.scene_id,
          spoken:           `${ma.spoken} ${mb.spoken}`.trim(),
          start:            ma.start,
          end:              mb.end,
          duration_seconds: parseFloat((mb.end - ma.start).toFixed(2)),
          word_count:       (ma.word_count || 0) + (mb.word_count || 0),
          visual_mode:      null,
        });
        changed = true;
        break;
      }
    }
  }
  const result = merged.map((s, idx) => ({ ...s, scene_id: idx + 1 }));

  console.log(`[talkingHeadProcessor] ${result.length} scenes after merge (was ${finalScenes.length})`);
  return { scenes: result, full_transcript, total_duration, language };
}

// ── Public: accepts a file already on disk (caller owns cleanup) ──────────────
export async function processTalkingHeadFromPath(tmpPath) {
  try {
    return await transcribeAndSegment(tmpPath);
  } catch (err) {
    throw new Error(`[talkingHeadProcessor] ${err.message}`);
  }
}

// ── Public: download from URL, then transcribe (original path) ───────────────
export async function processTalkingHeadVideo(talkingHeadUrl, projectId) {
  const urlExt  = talkingHeadUrl.split("?")[0].split(".").pop().toLowerCase();
  const ext     = ["mp4","mov","webm","mpeg","mpga","m4a","mp3","wav","ogg","oga","flac"].includes(urlExt) ? urlExt : "mp4";
  const tmpPath = path.join(TEMP_DIR, `th-${projectId}-${uuidv4()}.${ext}`);
  try {
    const dlRes = await fetch(talkingHeadUrl);
    if (!dlRes.ok) throw new Error(`Failed to download talking head video: ${dlRes.status} ${dlRes.statusText}`);
    const buffer = Buffer.from(await dlRes.arrayBuffer());
    fs.writeFileSync(tmpPath, buffer);
    console.log(`[talkingHeadProcessor] downloaded ${buffer.length} bytes for ${projectId}`);
    return await transcribeAndSegment(tmpPath);
  } catch (err) {
    throw new Error(`[talkingHeadProcessor] ${err.message}`);
  } finally {
    try { fs.unlinkSync(tmpPath); } catch {}
  }
}
