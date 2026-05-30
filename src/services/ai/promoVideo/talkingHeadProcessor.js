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

  console.log(`[talkingHeadProcessor] segmented into ${finalScenes.length} scenes (${scenes.length} before hard-split)`);
  for (const sc of finalScenes) {
    console.log(`[talkingHeadProcessor] scene ${sc.scene_id}: start=${sc.start} end=${sc.end} dur=${sc.duration_seconds} words=${sc.word_count} spoken="${sc.spoken}"`);
  }
  return { scenes: finalScenes, full_transcript, total_duration, language };
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
