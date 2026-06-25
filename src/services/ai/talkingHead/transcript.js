/**
 * talkingHead/transcript.js
 *
 * Transcribes an uploaded talking-head video to WORD-level timestamps (Whisper), plus probes
 * the source dimensions so the pipeline can keep the speaker's native orientation. Self-contained
 * for the standalone Talking Head service — it does NOT touch the SaaS TH pipeline (the segmentation
 * heuristics here are copied/adapted from saasVideo/talkingHeadProcessor.js by design).
 */
import fs from "fs";
import path from "path";
import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "ffmpeg-static";
import { openai, TEMP_DIR, uuidv4 } from "../../../server/middleware/shared.js";

ffmpeg.setFfmpegPath(ffmpegPath);

// Probe the source video's pixel dimensions (for native-orientation canvas selection).
function probeDimensions(filePath) {
  return new Promise((resolve) => {
    ffmpeg.ffprobe(filePath, (err, data) => {
      if (err) return resolve(null);
      const v = (data?.streams || []).find((s) => s.codec_type === "video");
      if (!v?.width || !v?.height) return resolve(null);
      resolve({ width: v.width, height: v.height });
    });
  });
}

// Extract a small mono mp3 — Whisper only needs audio, and this keeps the upload to Whisper small.
function extractAudio(srcPath, outPath) {
  return new Promise((resolve, reject) => {
    ffmpeg(srcPath)
      .noVideo()
      .audioCodec("libmp3lame")
      .audioBitrate("64k")
      .audioChannels(1)
      .on("end", resolve)
      .on("error", reject)
      .save(outPath);
  });
}

/**
 * transcribeVideo(videoUrl) → { words, full_transcript, language, total_duration, dimensions }
 * words: [{ word, start, end }] with real per-word timing for captions + beat windows.
 */
export async function transcribeVideo(videoUrl) {
  const urlExt  = videoUrl.split("?")[0].split(".").pop().toLowerCase();
  const ext     = ["mp4", "mov", "webm", "mkv", "m4v", "avi"].includes(urlExt) ? urlExt : "mp4";
  const tag     = uuidv4();
  const vidPath = path.join(TEMP_DIR, `th-${tag}.${ext}`);
  const audPath = path.join(TEMP_DIR, `th-${tag}.mp3`);

  try {
    const res = await fetch(videoUrl);
    if (!res.ok) throw new Error(`download failed: ${res.status} ${res.statusText}`);
    fs.writeFileSync(vidPath, Buffer.from(await res.arrayBuffer()));

    const dimensions = await probeDimensions(vidPath);
    await extractAudio(vidPath, audPath);

    const transcription = await openai.audio.transcriptions.create({
      model:                   "whisper-1",
      file:                    fs.createReadStream(audPath),
      response_format:         "verbose_json",
      timestamp_granularities: ["word"],
    });

    const words = (transcription.words || [])
      .map((w) => ({ word: String(w.word ?? "").trim(), start: w.start ?? 0, end: w.end ?? 0 }))
      .filter((w) => w.word);
    if (!words.length) throw new Error("no speech detected (Whisper returned no word timestamps)");

    const full_transcript = (transcription.text || words.map((w) => w.word).join(" ")).trim();
    const language         = transcription.language || "en";
    const total_duration   = words[words.length - 1]?.end ?? 0;

    console.log(`[talkingHead/transcript] ${words.length} words, ${total_duration.toFixed(1)}s, lang=${language}`);
    return { words, full_transcript, language, total_duration, dimensions, videoUrl };
  } finally {
    try { fs.unlinkSync(vidPath); } catch {}
    try { fs.unlinkSync(audPath); } catch {}
  }
}

// ── Word → beat segmentation (adapted from saasVideo/talkingHeadProcessor.js) ───────────────
const PAUSE_GAP       = 0.6;
const MAX_SCENE_DUR   = 4.0;
const MAX_SCENE_WORDS = 10;
const MIN_SCENE_DUR   = 1.2;

/** Group word-timestamps into beats by pause / length, then merge tiny tail beats. */
export function segmentWords(words) {
  const beats = [];
  let bucket = [];

  const flush = () => {
    if (!bucket.length) return;
    beats.push({
      beat_index: beats.length,
      spoken:     bucket.map((w) => w.word).join(" ").replace(/\s+/g, " ").trim(),
      start:      parseFloat(bucket[0].start.toFixed(3)),
      end:        parseFloat(bucket[bucket.length - 1].end.toFixed(3)),
      words:      bucket.map((w) => ({ start: w.start, end: w.end })),
    });
    bucket = [];
  };

  for (let i = 0; i < words.length; i++) {
    const w = words[i], prev = words[i - 1];
    if (bucket.length) {
      const curDur     = w.end - bucket[0].start;
      const pauseBreak = prev && (w.start - prev.end) > PAUSE_GAP;
      if (pauseBreak || curDur > MAX_SCENE_DUR || bucket.length >= MAX_SCENE_WORDS) flush();
    }
    bucket.push(w);
  }
  flush();

  // Merge a too-short beat into its smaller-resulting neighbour so nothing flashes.
  let merged = beats;
  let changed = true;
  while (changed && merged.length > 1) {
    changed = false;
    for (let i = 0; i < merged.length; i++) {
      const dur = merged[i].end - merged[i].start;
      if (dur >= MIN_SCENE_DUR) continue;
      const useNext = i === 0 ||
        (i < merged.length - 1 &&
          (merged[i].end - merged[i].start + merged[i + 1].end - merged[i + 1].start) <
          (merged[i - 1].end - merged[i - 1].start + merged[i].end - merged[i].start));
      const [a, b] = useNext ? [i, i + 1] : [i - 1, i];
      const ma = merged[a], mb = merged[b];
      merged.splice(a, 2, {
        beat_index: ma.beat_index,
        spoken: `${ma.spoken} ${mb.spoken}`.trim(),
        start: ma.start, end: mb.end,
        words: [...ma.words, ...mb.words],
      });
      changed = true;
      break;
    }
  }
  return merged.map((b, i) => ({ ...b, beat_index: i, duration_seconds: parseFloat((b.end - b.start).toFixed(2)) }));
}
