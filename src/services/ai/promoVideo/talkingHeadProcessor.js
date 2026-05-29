import fs from "fs";
import path from "path";
import { openai, TEMP_DIR, uuidv4 } from "../../../server/middleware/shared.js";

const PAUSE_GAP       = 0.4;
const MAX_SCENE_DUR   = 6.0;
const MAX_SCENE_WORDS = 14;
const MIN_SCENE_DUR   = 2.0;

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
    const dur      = Math.max(MIN_SCENE_DUR, parseFloat((rawEnd - rawStart).toFixed(2)));
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

  console.log(`[talkingHeadProcessor] segmented into ${scenes.length} scenes`);
  return { scenes, full_transcript, total_duration, language };
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
