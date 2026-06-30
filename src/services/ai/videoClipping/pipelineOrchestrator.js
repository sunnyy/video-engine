/**
 * videoClipping/pipelineOrchestrator.js — Video Clipping (standalone service).
 *
 * Turns ONE long uploaded video (podcast / talk / interview) into several editable, captioned,
 * vertical clips of its best moments. Flow:
 *   download source (once) → extract audio → transcribe (Whisper, word timestamps) → moderate
 *   → CHARGE by source length → GPT-4.1 selects best moments → per clip: ffmpeg-cut the segment,
 *   upload the short clip, build a 9:16 timeline project (captions re-based to clip-relative time)
 *   → DELETE the source (local temp + storage object) → return the clip list.
 *
 * We keep only the short clips, never the big source — that's what keeps storage cost near-zero
 * without any client-side/blob processing. No Remotion at generate-time; clips open in the editor
 * and render on export like every other service. Reuses the Talking Head caption builder + the
 * shared transcription/segmentation heuristics (read-only imports; SaaS/TH pipelines untouched).
 */
import fs from "fs";
import path from "path";
import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "ffmpeg-static";
import { openai, supabaseAdmin, TEMP_DIR, uuidv4 } from "../../../server/middleware/shared.js";
import { segmentWords } from "../talkingHead/transcript.js";
import { moderateInput } from "../shared/moderation.js";
import { selectClips } from "./clipSelector.js";
import { buildClipTimeline } from "./clipTimeline.js";

ffmpeg.setFfmpegPath(ffmpegPath);

export const CLIP_STATUS_STEPS = [
  "Uploading & analyzing your video…",
  "Transcribing every word…",
  "Finding the best moments…",
  "Cutting your clips…",
  "Almost ready…",
];

const MAX_SOURCE_SECONDS = 90 * 60; // 90 min hard cap (MVP)
const MAX_CLIPS = 10;               // bound render/upload work per job
const CUT_CONCURRENCY = 2;          // parallel ffmpeg cuts (worker is sensitive to >2 — see scaling notes)
const WHISPER_MAX_BYTES = 24 * 1024 * 1024; // OpenAI Whisper hard-rejects audio over 25 MB; stay safely under

const probeDuration = (filePath) => new Promise((resolve) => {
  ffmpeg.ffprobe(filePath, (err, data) => resolve(err ? 0 : (data?.format?.duration || 0)));
});

// 32 kbps mono — intelligible for ASR and keeps ~90 min of audio under Whisper's 25 MB ceiling.
const extractAudio = (srcPath, outPath) => new Promise((resolve, reject) => {
  ffmpeg(srcPath).noVideo().audioCodec("libmp3lame").audioBitrate("32k").audioChannels(1)
    .on("end", resolve).on("error", reject).save(outPath);
});

// Cut [start, start+dur] from the source and re-encode (input-seek for speed; re-encode so the cut
// is clean/keyframe-accurate and the clip plays from 0 in the editor).
const cutSegment = (srcPath, outPath, start, dur) => new Promise((resolve, reject) => {
  ffmpeg(srcPath)
    .inputOptions([`-ss ${start.toFixed(3)}`])
    .outputOptions([`-t ${dur.toFixed(3)}`, "-c:v", "libx264", "-preset", "veryfast", "-crf", "23", "-c:a", "aac", "-movflags", "+faststart", "-pix_fmt", "yuv420p"])
    .on("end", resolve).on("error", reject).save(outPath);
});

// Run async tasks with a small concurrency cap (preserves input order in the results array).
async function pool(items, limit, worker) {
  const results = new Array(items.length);
  let next = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      try { results[i] = await worker(items[i], i); }
      catch (e) { console.warn(`[video-clipping] clip ${i} failed:`, e.message); results[i] = null; }
    }
  });
  await Promise.all(runners);
  return results;
}

/**
 * runClippingPipeline(params, onStep, onCharge) →
 *   { clips: [{ projectId, title, start, end, duration }], sourceDuration, clipCount }
 * params: { videoUrl, sourceKey?, userId, captionStyle?, clipLenMin?, clipLenMax?, language? }
 * onCharge(sourceDurationSeconds): async — deducts credits; throws to abort before any cutting.
 */
export async function runClippingPipeline(params, onStep, onCharge) {
  const {
    videoUrl, sourceKey = null, userId,
    captionStyle = "wordBlaze", clipLenMin = 20, clipLenMax = 60, language = "en",
  } = params;
  const step = (msg) => { console.log(`[video-clipping] ${msg}`); onStep?.({ step: msg }); };
  if (!videoUrl) throw new Error("no video provided");
  if (!userId) throw new Error("no user");

  const tag = uuidv4();
  const urlExt = videoUrl.split("?")[0].split(".").pop().toLowerCase();
  const ext = ["mp4", "mov", "webm", "mkv", "m4v", "avi"].includes(urlExt) ? urlExt : "mp4";
  const vidPath = path.join(TEMP_DIR, `clip-src-${tag}.${ext}`);
  const audPath = path.join(TEMP_DIR, `clip-src-${tag}.mp3`);
  const clipPaths = [];

  try {
    // ── Download the source ONCE (kept for cutting; deleted in finally) ──
    step(CLIP_STATUS_STEPS[0]);
    const res = await fetch(videoUrl);
    if (!res.ok) throw new Error(`download failed: ${res.status} ${res.statusText}`);
    fs.writeFileSync(vidPath, Buffer.from(await res.arrayBuffer()));

    const sourceDuration = await probeDuration(vidPath);
    if (!sourceDuration || sourceDuration < 20) throw new Error("This video is too short to clip — upload a longer one.");
    if (sourceDuration > MAX_SOURCE_SECONDS) throw new Error("This video is too long — please upload one under 45 minutes.");

    // ── Transcribe (word-level) ──
    step(CLIP_STATUS_STEPS[1]);
    await extractAudio(vidPath, audPath);
    // Guard Whisper's 25 MB ceiling (a very dense/long file can still exceed it at 32 kbps).
    let audSize = 0;
    try { audSize = fs.statSync(audPath).size; } catch {}
    if (audSize > WHISPER_MAX_BYTES) throw new Error("This video is too long to process — please upload a shorter one.");
    const transcription = await openai.audio.transcriptions.create({
      model: "whisper-1", file: fs.createReadStream(audPath),
      response_format: "verbose_json", timestamp_granularities: ["word"],
    });
    const words = (transcription.words || [])
      .map((w) => ({ word: String(w.word ?? "").trim(), start: w.start ?? 0, end: w.end ?? 0 }))
      .filter((w) => w.word);
    if (!words.length) throw new Error("No speech detected — clipping needs a video with spoken audio.");
    const full_transcript = (transcription.text || words.map((w) => w.word).join(" ")).trim();
    const detectedLang = transcription.language || language || "en";

    // Moderate the transcript before any paid work (drives the on-screen captions).
    if (full_transcript) await moderateInput(full_transcript, { label: "video-clipping transcript" });

    // ── Charge by REAL source length (client value is not trusted) ──
    if (onCharge) await onCharge(sourceDuration);

    // ── Select best moments ──
    step(CLIP_STATUS_STEPS[2]);
    const segments = segmentWords(words);
    const picks = await selectClips(segments, { minLen: clipLenMin, maxLen: clipLenMax, maxClips: MAX_CLIPS, language: detectedLang });
    if (!picks.length) throw new Error("Couldn't find strong clip-worthy moments in this video.");

    // ── Cut + upload + build + save each clip (bounded concurrency) ──
    step(CLIP_STATUS_STEPS[3]);
    const saved = await pool(picks, CUT_CONCURRENCY, async (clip, i) => {
      const dur = parseFloat((clip.end - clip.start).toFixed(3));
      if (dur < 3) return null;

      // 1. Cut the segment from the source.
      const outPath = path.join(TEMP_DIR, `clip-${tag}-${i}.mp4`);
      clipPaths.push(outPath);
      await cutSegment(vidPath, outPath, clip.start, dur);

      // 2. Upload the short clip (we keep only this, never the source).
      const key = `clips/${userId}/clip-${tag}-${i}.mp4`;
      const buffer = fs.readFileSync(outPath);
      const { error: upErr } = await supabaseAdmin.storage.from("user-assets").upload(key, buffer, { contentType: "video/mp4", upsert: false });
      if (upErr) throw new Error(`upload failed: ${upErr.message}`);
      const { data: { publicUrl } } = supabaseAdmin.storage.from("user-assets").getPublicUrl(key);

      // 3. Captions: words within this clip's window, re-based to clip-relative time.
      const clipWords = words
        .filter((w) => w.end > clip.start && w.start < clip.end)
        .map((w) => ({ word: w.word, start: Math.max(0, parseFloat((w.start - clip.start).toFixed(3))), end: Math.max(0, parseFloat((w.end - clip.start).toFixed(3))) }));

      // 4. Build the 9:16 timeline + save as an editable project.
      const timeline = buildClipTimeline({ clipUrl: publicUrl, duration: dur, words: clipWords, captionStyle, language: detectedLang });
      const { data: row, error: insErr } = await supabaseAdmin.from("projects").insert({
        user_id: userId, name: clip.title.slice(0, 80), safe_project_json: timeline,
        orientation: "9:16", mode: "timeline", source: "video_clip", editor_version: "timeline",
        raw_ai_json: { pipeline: "video_clipping_v1", clipUrl: publicUrl, storageKey: key, start: clip.start, end: clip.end, reason: clip.reason, language: detectedLang, captionStyle },
      }).select("id").single();
      if (insErr || !row?.id) throw new Error("save failed");

      return { projectId: row.id, title: clip.title, start: clip.start, end: clip.end, duration: dur, clipUrl: publicUrl };
    });

    const clips = saved.filter(Boolean);
    if (!clips.length) throw new Error("We couldn't produce any clips from this video — please try again.");

    step(CLIP_STATUS_STEPS[4]);
    return { clips, sourceDuration: Math.round(sourceDuration), clipCount: clips.length };
  } finally {
    // ── Cleanup: local temp + the uploaded SOURCE (clips are kept) ──
    try { fs.unlinkSync(vidPath); } catch {}
    try { fs.unlinkSync(audPath); } catch {}
    for (const p of clipPaths) { try { fs.unlinkSync(p); } catch {} }
    if (sourceKey) {
      try { await supabaseAdmin.storage.from("user-assets").remove([sourceKey]); }
      catch (e) { console.warn("[video-clipping] source cleanup failed:", e.message); }
    }
  }
}
