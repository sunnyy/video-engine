import fs   from "fs";
import path from "path";
import { tmpdir } from "os";
import ffmpeg     from "fluent-ffmpeg";
import ffmpegPath from "ffmpeg-static";
import { openai, supabaseAdmin } from "../../../server/middleware/shared.js";
import { VoiceoverError, classifyTtsHttp } from "../shared/voiceoverError.js";
import { track } from "../../../server/services/apiHealth.js";

ffmpeg.setFfmpegPath(ffmpegPath);

function normalizeTtsText(text) {
  return text
    .replace(/₹\s*/g, "rupees ")
    .replace(/€\s*/g, "euros ")
    .replace(/£\s*/g, "pounds ");
}

// "HH:MM:SS.ss" → seconds (ffmpeg codecData duration format).
function hmsToSeconds(s) {
  const m = String(s || "").match(/(\d+):(\d+):(\d+(?:\.\d+)?)/);
  return m ? (+m[1]) * 3600 + (+m[2]) * 60 + parseFloat(m[3]) : null;
}

/* Normalize audio to -9 LUFS — identical filter to tts.js. Resolves { buffer, durationSec },
 * where durationSec is ffmpeg's EXACT decoded length (loudnorm doesn't change length) — far more
 * accurate than byte-math, so the timeline can be sized to fit the whole voiceover with no tail cut. */
function normalizeLoudness(inputBuffer) {
  return new Promise((resolve, reject) => {
    const tag     = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const rawPath = path.join(tmpdir(), `promo-raw-${tag}.mp3`);
    const outPath = path.join(tmpdir(), `promo-norm-${tag}.mp3`);
    fs.writeFileSync(rawPath, inputBuffer);
    let durationSec = null;
    ffmpeg(rawPath)
      .on("codecData", (d) => { durationSec = hmsToSeconds(d.duration); })
      .audioFilters("loudnorm=I=-9:TP=-1:LRA=7")
      .audioCodec("libmp3lame")
      .audioBitrate("192k")
      .output(outPath)
      .on("end", () => {
        const normalized = fs.readFileSync(outPath);
        try { fs.unlinkSync(rawPath); } catch {}
        try { fs.unlinkSync(outPath); } catch {}
        resolve({ buffer: normalized, durationSec });
      })
      .on("error", (err) => {
        try { fs.unlinkSync(rawPath); } catch {}
        try { fs.unlinkSync(outPath); } catch {}
        reject(err);
      })
      .run();
  });
}

// Decode the FINAL audio buffer with ffmpeg and read its EXACT duration from codecData. This is the
// source of truth for how long the voiceover actually plays — independent of whether loudnorm ran or
// the file is CBR/VBR — so the timeline can never be sized short and clip the tail. Resolves null on
// any failure (caller floors with the word-count estimate).
function probeDuration(buffer) {
  return new Promise((resolve) => {
    const p = path.join(tmpdir(), `probe-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.mp3`);
    try { fs.writeFileSync(p, buffer); } catch { return resolve(null); }
    let dur = null;
    ffmpeg(p)
      .on("codecData", (d) => { dur = hmsToSeconds(d.duration); })
      .on("end",   () => { try { fs.unlinkSync(p); } catch {} resolve(dur); })
      .on("error", () => { try { fs.unlinkSync(p); } catch {} resolve(dur); })
      .addOption("-f", "null")
      .save(process.platform === "win32" ? "NUL" : "/dev/null");
  });
}

const STORAGE_BUCKET    = "user-assets";
const TRAILING_BUFFER   = 0.3;
const DEFAULT_VOICE     = "nova";           // OpenAI fallback (kept for injectVoiceoversIntoTimeline)
const TTS_MODEL         = "tts-1-hd";

// ElevenLabs — curated voices for promo videos
const ELEVENLABS_API    = "https://api.elevenlabs.io/v1/text-to-speech";
const DEFAULT_EL_VOICE  = "21m00Tcm4TlvDq8ikWAM"; // Rachel

// Word-count based floor — 160 WPM is conservative for OpenAI TTS at speed 1.0
function estimateScriptDuration(script) {
  const words = script.trim().split(/\s+/).filter(Boolean).length;
  return parseFloat((words / 160 * 60 + 0.2).toFixed(2));
}

// Parse MP3 frame header to get duration estimate.
// Uses file-size / (bitrate/8) which is accurate for CBR but can underestimate
// for VBR — estimateScriptDuration is used as a floor to guard against this.
function parseMp3Duration(buffer) {
  try {
    let offset = 0;
    if (buffer[0] === 0x49 && buffer[1] === 0x44 && buffer[2] === 0x33) {
      const id3Size = ((buffer[6] & 0x7F) << 21) | ((buffer[7] & 0x7F) << 14) |
                     ((buffer[8] & 0x7F) << 7)  |  (buffer[9] & 0x7F);
      offset = 10 + id3Size;
    }
    for (let i = offset; i < Math.min(offset + 4096, buffer.length - 4); i++) {
      if (buffer[i] !== 0xFF || (buffer[i + 1] & 0xE0) !== 0xE0) continue;
      const b2 = buffer[i + 2];
      const bitrateIdx  = (b2 >> 4) & 0xF;
      const sampleIdx   = (b2 >> 2) & 0x3;
      const bitrateTable = [0,32,40,48,56,64,80,96,112,128,160,192,224,256,320,0];
      const sampleTable  = [44100,48000,32000,0];
      const bitrate      = bitrateTable[bitrateIdx] * 1000;
      const sampleRate   = sampleTable[sampleIdx];
      if (bitrate > 0 && sampleRate > 0) {
        return parseFloat((buffer.length / (bitrate / 8)).toFixed(2));
      }
    }
  } catch {}
  return null;
}

export async function generatePromoVoiceovers(voiceover_queue, projectId) {
  const results = [];

  for (const item of voiceover_queue) {
    const { scene_id, script, voice } = item;

    if (!script?.trim()) {
      console.warn(`[ttsGenerator] scene ${scene_id}: empty script, skipping`);
      continue;
    }

    try {
      const resolvedVoice = VALID_VOICES.includes(voice) ? voice : DEFAULT_VOICE;

      const mp3 = await openai.audio.speech.create({
        model: TTS_MODEL,
        voice: resolvedVoice,
        input: normalizeTtsText(script.trim()),
        speed: 1.0,
      });

      const buffer    = Buffer.from(await mp3.arrayBuffer());
      const parsed    = parseMp3Duration(buffer);
      const estimated = estimateScriptDuration(script.trim());
      // Use the larger of measured vs word-count estimate — parseMp3 can underestimate VBR audio
      const duration_seconds = parsed != null ? Math.max(parsed, estimated) : estimated;

      const storageKey = `promo-voiceovers/${projectId}/${scene_id}.mp3`;

      const { error: uploadErr } = await supabaseAdmin.storage
        .from(STORAGE_BUCKET)
        .upload(storageKey, buffer, { contentType: "audio/mpeg", upsert: true });

      if (uploadErr) throw new Error(`Storage upload failed: ${uploadErr.message}`);

      const { data: { publicUrl } } = supabaseAdmin.storage
        .from(STORAGE_BUCKET)
        .getPublicUrl(storageKey);

      results.push({ scene_id, audio_url: publicUrl, duration_seconds });
    } catch (err) {
      console.error(`[ttsGenerator] scene ${scene_id} failed:`, err.message);
    }
  }

  return results;
}

function charAlignmentToWords(alignment) {
  const chars  = alignment.characters                    ?? [];
  const starts = alignment.character_start_times_seconds ?? [];
  const ends   = alignment.character_end_times_seconds   ?? [];
  const words  = [];
  let word = "", wordStart = 0;
  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];
    if (ch === " " || ch === "\n" || ch === "\r" || ch === "\t") {
      if (word) {
        words.push({ word, start: wordStart, end: ends[i - 1] ?? wordStart });
        word = "";
      }
    } else {
      if (!word) wordStart = starts[i] ?? 0;
      word += ch;
    }
  }
  if (word) words.push({ word, start: wordStart, end: ends[ends.length - 1] ?? wordStart });
  return words;
}

/**
 * generateFullVoiceover(script, projectId, voiceId?)
 * Generates a single ElevenLabs MP3 for the entire video script.
 * Uses /with-timestamps endpoint to get character alignment — no Whisper needed.
 * Returns { audio_url, duration_seconds, buffer, wordTimestamps }
 */
export async function generateFullVoiceover(script, projectId, voiceId, speed = 1.0) {
  if (!script?.trim()) return { audio_url: null, duration_seconds: 0, buffer: null, wordTimestamps: [] };
  // Report voiceover-provider health (Phase-1 detection). A bad_request (user input) doesn't count
  // toward tripping the breaker; everything else (quota/5xx/network/storage) does.
  return track("voiceover",
    () => _generateFullVoiceover(script, projectId, voiceId, speed),
    (err) => (err?.isVoiceoverError ? err.internal : true));
}

async function _generateFullVoiceover(script, projectId, voiceId, speed = 1.0) {
  const vid = voiceId || DEFAULT_EL_VOICE;
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) throw new VoiceoverError("ELEVENLABS_API_KEY not set", { cause: "config", retryable: false, internal: true });

  let response;
  try {
    response = await fetch(`${ELEVENLABS_API}/${vid}/with-timestamps`, {
      method:  "POST",
      headers: {
        "xi-api-key":   apiKey,
        "Content-Type": "application/json",
        "Accept":       "application/json",
      },
      body: JSON.stringify({
        text:           normalizeTtsText(script.trim()),
        model_id:       "eleven_multilingual_v2",
        voice_settings: { stability: 0.4, similarity_boost: 0.75, speed },
      }),
    });
  } catch (netErr) {
    throw new VoiceoverError(`TTS network error: ${netErr.message}`, { cause: "network", retryable: true, internal: true });
  }

  if (!response.ok) {
    const errText = await response.text().catch(() => "");
    throw classifyTtsHttp(response.status, errText);
  }

  const json         = await response.json();
  const wordTimestamps = charAlignmentToWords(json.alignment ?? {});
  const rawBuffer    = Buffer.from(json.audio_base64, "base64");

  // Normalize loudness to -9 LUFS — matches tts.js and typographyVideo.js pipelines
  let buffer = rawBuffer;
  let probedDur = null; // ffmpeg's exact decoded length (most accurate)
  try {
    const normalized = await normalizeLoudness(rawBuffer);
    if (normalized?.buffer && normalized.buffer.length > 1024) {
      buffer    = normalized.buffer;
      probedDur = normalized.durationSec;
    } else {
      console.warn("[ttsGenerator] loudnorm produced empty/tiny buffer, using raw audio");
    }
  } catch (normErr) {
    console.warn("[ttsGenerator] loudnorm failed, uploading raw audio:", normErr.message);
  }

  if (!buffer || buffer.length === 0) throw new Error("Audio buffer is empty after TTS generation");

  // Measure the ACTUAL final audio three ways and take the MAX so the timeline can never be sized
  // short: (1) probe the final buffer directly with ffmpeg (works CBR/VBR, loudnorm or not — the
  // real length), (2) loudnorm's codecData if present, (3) byte-math, floored by the word estimate.
  const finalProbe       = await probeDuration(buffer);
  const parsed           = parseMp3Duration(buffer);
  const estimated        = estimateScriptDuration(script.trim());
  const duration_seconds = parseFloat(
    Math.max(finalProbe ?? 0, probedDur ?? 0, parsed ?? 0, estimated ?? 0).toFixed(2)
  ) || estimated;

  const storageKey = `promo-voiceovers/${projectId}/full.mp3`;
  const { error: uploadErr } = await supabaseAdmin.storage
    .from(STORAGE_BUCKET)
    .upload(storageKey, buffer, { contentType: "audio/mpeg", upsert: true });
  if (uploadErr) throw new Error(`Storage upload failed: ${uploadErr.message} (buffer: ${buffer.length} bytes)`);

  const { data: { publicUrl } } = supabaseAdmin.storage
    .from(STORAGE_BUCKET)
    .getPublicUrl(storageKey);

  console.log(`[ttsGenerator] ElevenLabs voiceover (${vid}): ${duration_seconds.toFixed(2)}s, ${wordTimestamps.length} words → ${storageKey}`);
  return { audio_url: publicUrl, duration_seconds, buffer, wordTimestamps };
}

export function injectVoiceoversIntoTimeline(timeline, voiceover_results) {
  if (!voiceover_results.length) return timeline;

  // Map scene_id → actual audio duration
  const audioDurBySid = {};
  for (const r of voiceover_results) {
    if (r.audio_url && r.duration_seconds != null) {
      audioDurBySid[r.scene_id] = r.duration_seconds;
    }
  }

  // Build timing map: scene_id → { start, end }
  const timingMap = {};
  for (const layer of timeline.layers) {
    const match = layer.id?.match(/^s(\d+)_/);
    if (!match) continue;
    const sid = Number(match[1]);
    if (!timingMap[sid]) {
      timingMap[sid] = { start: layer.start, end: layer.end };
    } else {
      timingMap[sid].start = Math.min(timingMap[sid].start, layer.start);
      timingMap[sid].end   = Math.max(timingMap[sid].end,   layer.end);
    }
  }

  // Sort scenes by start time, compute per-scene extension and cumulative shift
  const orderedSids = Object.keys(timingMap)
    .map(Number)
    .sort((a, b) => timingMap[a].start - timingMap[b].start);

  let cumulativeShift = 0;
  const shiftMap  = {}; // sid → how much this scene's start is shifted (from prior scenes expanding)
  const extendMap = {}; // sid → how much this scene itself expands

  for (const sid of orderedSids) {
    shiftMap[sid] = cumulativeShift;
    const currentDur = timingMap[sid].end - timingMap[sid].start;
    const audioDur   = audioDurBySid[sid];
    if (audioDur != null) {
      const needed = audioDur + TRAILING_BUFFER;
      const diff   = parseFloat(Math.max(0, needed - currentDur).toFixed(4));
      extendMap[sid]   = diff;
      cumulativeShift  = parseFloat((cumulativeShift + diff).toFixed(4));
    } else {
      extendMap[sid] = 0;
    }
  }

  // Rebuild layers with corrected timings
  const updatedLayers = timeline.layers.map(layer => {
    const match = layer.id?.match(/^s(\d+)_/);
    if (!match) return layer;

    const sid    = Number(match[1]);
    const shift  = shiftMap[sid]  ?? 0;
    const extend = extendMap[sid] ?? 0;

    const newStart = parseFloat((layer.start + shift).toFixed(4));
    const newEnd   = parseFloat((layer.end   + shift + extend).toFixed(4));

    // Adjust background scale keyframes whose last stop is pinned to the old layer end
    let keyframes = layer.keyframes;
    if (extend > 0 && keyframes?.scale?.length > 1) {
      const oldDur = parseFloat((layer.end - layer.start).toFixed(4));
      const newDur = parseFloat((newEnd - newStart).toFixed(4));
      keyframes = {
        ...keyframes,
        scale: keyframes.scale.map(kf =>
          Math.abs(kf.time - oldDur) < 0.05 ? { ...kf, time: newDur } : kf
        ),
      };
    }

    return { ...layer, start: newStart, end: newEnd, keyframes };
  });

  // Add voiceover audio layers with correct trimEnd = actual audio length
  const voiceoverLayers = voiceover_results
    .filter(({ scene_id, audio_url }) => {
      if (!audio_url) return false;
      if (!timingMap[scene_id]) {
        console.warn(`[ttsGenerator] injectVoiceovers: no timing found for scene ${scene_id}, skipping`);
        return false;
      }
      return true;
    })
    .map(({ scene_id, audio_url, duration_seconds }) => {
      const { start, end } = timingMap[scene_id];
      const shift    = shiftMap[scene_id]  ?? 0;
      const extend   = extendMap[scene_id] ?? 0;
      const audioLen = duration_seconds ?? (end - start + extend);
      const newStart = parseFloat((start + shift).toFixed(4));
      const newEnd   = parseFloat((newStart + audioLen + TRAILING_BUFFER).toFixed(4));

      return {
        id:        `voiceover_s${scene_id}`,
        trackId:   `voiceover_track_${scene_id}`,
        type:      "audio",
        audioType: "voiceover",
        name:      `Voiceover — Scene ${scene_id}`,
        src:       audio_url,
        start:     newStart,
        end:       newEnd,
        zIndex:    0,
        visible:   true,
        locked:    false,
        trimStart: 0,
        trimEnd:   audioLen, // actual audio file length, not padded
        volume:    1.0,
        muted:     false,
        fadeIn:    0.1,
        fadeOut:   0.2,
        sfx:       null,
        keyframes: {},
        animation:  null,
        transition: null,
        transform:  null,
      };
    });

  const newTotalDuration = parseFloat((timeline.format.duration + cumulativeShift).toFixed(4));

  if (cumulativeShift > 0) {
    console.log(`[ttsGenerator] timeline stretched +${cumulativeShift.toFixed(2)}s to fit actual TTS durations`);
  }

  return {
    ...timeline,
    format: { ...timeline.format, duration: newTotalDuration },
    layers: [...updatedLayers, ...voiceoverLayers],
  };
}
