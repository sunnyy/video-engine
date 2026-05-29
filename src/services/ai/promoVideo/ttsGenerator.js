/**
 * ttsGenerator.js
 * src/services/ai/promoVideo/ttsGenerator.js
 *
 * Server-side TTS generation for the promo video pipeline.
 * Generates OpenAI TTS audio for each scene in the voiceover_queue,
 * uploads to Supabase storage, and returns audio URLs for injection.
 */

import fs from "fs";
import path from "path";
import { openai, supabaseAdmin, TEMP_DIR, uuidv4 } from "../../../server/middleware/shared.js";

const VALID_VOICES = ["nova", "shimmer", "coral", "alloy", "sage", "ash", "onyx", "echo", "fable", "verse", "marin", "cedar"];
const DEFAULT_VOICE = "nova";
const TTS_MODEL = "tts-1-hd";
const STORAGE_BUCKET = "user-assets";

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

      // Measure actual audio duration using Remotion's bundled ffprobe
      let duration_seconds = null;
      const tmpMp3 = path.join(TEMP_DIR, `tts-dur-${uuidv4()}.mp3`);
      try {
        fs.writeFileSync(tmpMp3, buffer);
        const { getVideoMetadata } = await import("@remotion/renderer");
        const meta = await getVideoMetadata(tmpMp3);
        duration_seconds = meta.durationInSeconds ?? null;
      } catch (e) {
        console.warn(`[ttsGenerator] scene ${scene_id}: duration probe failed, will estimate`, e.message);
      } finally {
        try { fs.unlinkSync(tmpMp3); } catch {}
      }

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
