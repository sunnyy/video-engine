/**
 * ttsGenerator.js
 * src/services/ai/promoVideo/ttsGenerator.js
 *
 * Server-side TTS generation for the promo video pipeline.
 * Generates OpenAI TTS audio for each scene in the voiceover_queue,
 * uploads to Supabase storage, and returns audio URLs for injection.
 */

import { openai, supabaseAdmin } from "../../../server/middleware/shared.js";

const VALID_VOICES = ["nova", "shimmer", "coral", "alloy", "sage", "ash", "onyx", "echo", "fable", "verse", "marin", "cedar"];
const DEFAULT_VOICE = "nova";
const TTS_MODEL = "tts-1-hd";
const STORAGE_BUCKET = "user-assets";

// Parse MP3 frame header to get exact duration — pure JS, no subprocess.
// Skips ID3v2 tags, reads first valid MPEG frame header to find bitrate,
// then divides file size by bytes-per-second.
function parseMp3Duration(buffer) {
  try {
    let offset = 0;
    // Skip ID3v2 tag if present
    if (buffer[0] === 0x49 && buffer[1] === 0x44 && buffer[2] === 0x33) {
      const id3Size = ((buffer[6] & 0x7F) << 21) | ((buffer[7] & 0x7F) << 14) |
                     ((buffer[8] & 0x7F) << 7)  |  (buffer[9] & 0x7F);
      offset = 10 + id3Size;
    }
    // Find first sync word (0xFF 0xEx or 0xFF 0xFx)
    for (let i = offset; i < Math.min(offset + 4096, buffer.length - 4); i++) {
      if (buffer[i] !== 0xFF || (buffer[i + 1] & 0xE0) !== 0xE0) continue;
      const b1 = buffer[i + 1], b2 = buffer[i + 2];
      const bitrateIdx   = (b2 >> 4) & 0xF;
      const sampleIdx    = (b2 >> 2) & 0x3;
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

/**
 * Generate TTS audio for all scenes in the voiceover_queue.
 * Processes scenes sequentially to avoid hammering the OpenAI API.
 * Per-scene errors are caught and logged — the batch continues.
 *
 * @param {Array<{ scene_id: number|string, script: string, voice: string }>} voiceover_queue
 * @param {string} projectId
 * @returns {Promise<Array<{ scene_id: number|string, audio_url: string }>>}
 */
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

      // Generate TTS audio
      const mp3 = await openai.audio.speech.create({
        model:  TTS_MODEL,
        voice:  resolvedVoice,
        input:  script.trim(),
        speed:  1.0,
      });

      const buffer     = Buffer.from(await mp3.arrayBuffer());
      const duration_seconds = parseMp3Duration(buffer);

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

/**
 * Inject generated voiceover URLs into the assembled timeline.
 * Finds scene timing from existing layers tagged with the scene_id,
 * then adds an audio layer for each resolved voiceover.
 *
 * @param {object} timeline  - Remotion-compatible timeline JSON from assemblyPipeline
 * @param {Array<{ scene_id: number|string, audio_url: string }>} voiceover_results
 * @returns {object} Updated timeline with voiceover audio layers added
 */
export function injectVoiceoversIntoTimeline(timeline, voiceover_results) {
  if (!voiceover_results.length) return timeline;

  // Build a timing map from existing layers: scene_id → { start, end }
  const timingMap = {};
  for (const layer of timeline.layers) {
    const match = layer.id?.match(/^s(\d+)_/);
    if (!match) continue;
    const sid = Number(match[1]);
    if (!timingMap[sid]) {
      timingMap[sid] = { start: layer.start, end: layer.end };
    } else {
      // Widen the window in case layers have slight offsets
      timingMap[sid].start = Math.min(timingMap[sid].start, layer.start);
      timingMap[sid].end   = Math.max(timingMap[sid].end,   layer.end);
    }
  }

  const newLayers = voiceover_results
    .filter(({ scene_id, audio_url }) => {
      if (!audio_url) return false;
      if (!timingMap[scene_id]) {
        console.warn(`[ttsGenerator] injectVoiceovers: no timing found for scene ${scene_id}, skipping`);
        return false;
      }
      return true;
    })
    .map(({ scene_id, audio_url }) => {
      const { start, end } = timingMap[scene_id];
      return {
        id:        `voiceover_s${scene_id}`,
        trackId:   `voiceover_track_${scene_id}`,
        type:      "audio",
        audioType: "voiceover",
        name:      `Voiceover — Scene ${scene_id}`,
        src:       audio_url,
        start,
        end,
        zIndex:    0,
        visible:   true,
        locked:    false,
        trimStart: 0,
        trimEnd:   end - start,
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

  return {
    ...timeline,
    layers: [...timeline.layers, ...newLayers],
  };
}
