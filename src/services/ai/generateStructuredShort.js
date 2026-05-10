/**
 * generateStructuredShort.js
 *
 * New AI pipeline: one GPT-4.1 call generates the complete project JSON.
 * TTS, Fal.ai image generation, and music selection run after.
 */

import { generateVideoJSON }      from "./generateVideoJSON";
import { serverFetch }             from "../serverApi";
import { loadMusicLibrary, pickMusicByMood } from "../../core/registries/musicRegistry";
import { measureAudioDuration, syncBeatsToTTS } from "../../core/syncBeatsToTTs";
import { generateZoneImage }      from "../../server/assets/falService";

const ORIENTATION_DIMS = {
  "9:16": { width: 1080, height: 1920 },
  "16:9": { width: 1920, height: 1080 },
  "1:1":  { width: 1080, height: 1080 },
  "4:5":  { width: 1080, height: 1350 },
};

// Map GPT-4.1 musicMood → DB mood keys used by loadMusicLibrary
const MUSIC_MOOD_MAP = {
  energetic:     "energetic",
  upbeat:        "energetic",
  dramatic:      "dramatic",
  dark:          "dramatic",
  chill:         "calm",
  inspirational: "energetic",
};

export async function generateStructuredShort({
  topic,
  mode           = "faceless",
  orientation    = "9:16",
  generateImages = false,
  generateTTS    = false,
  ttsVoice       = "female_warm",
  language       = "english",
  brandColor     = null,
  audience       = "general",
  tone           = "bold",
  onProgress     = null,
}) {
  const report = (step) => { if (onProgress) onProgress(step); };

  /* ── 1. GPT-4.1: full project JSON ── */
  report("script");
  const { beats: scriptBeats, palette, niche, tone: detectedTone, musicMood } =
    await generateVideoJSON({ topic, orientation, language, audience, tone });

  console.log(`[pipeline] niche=${niche} musicMood=${musicMood} beats=${scriptBeats.length}`);

  let beats = scriptBeats;

  /* ── 2. Fal.ai image generation ── */
  if (generateImages) {
    report("images");
    const imageJobs = beats
      .map((beat, i) => ({ beat, beatIndex: i }))
      .filter(({ beat }) => beat.asset_prompt && beat.zones?.z1);

    const STOP = new Set(["the","a","an","and","or","but","in","on","at","to","for","of","with","is","are","was","were","this","that","you","we","it","its","not","so","just","very","how","what","when","where","who","from","by","as"]);

    await Promise.allSettled(
      imageJobs.map(async ({ beat, beatIndex }) => {
        try {
          const spokenWords = (beat.spoken || topic).toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter(w => w.length > 2 && !STOP.has(w));
          const assetHint = { keywords: [...new Set(spokenWords)].slice(0, 4), visual_type: "abstract", prompt: beat.asset_prompt };
          const result = await generateZoneImage({
            spoken:         beat.spoken || topic,
            intent:         beat.intent || "explanation",
            visual_hint:    "none",
            topic,
            orientation,
            beatIndex,
            zoneIndex:      0,
            promptOverride: beat.asset_prompt,
            assetHint,
            dna:            { niche },
            beat,
          });
          if (result?.url) {
            beats[beatIndex].zones.z1.content.asset.src = result.url;
          }
        } catch (e) {
          console.warn(`[generateStructuredShort] Image failed for beat ${beatIndex}:`, e.message);
        }
      })
    );
  }

  /* ── 3. TTS ── */
  const scriptText = beats.map(b => b.spoken).filter(Boolean).join(". ");
  let ttsAudio = null;

  if (generateTTS && scriptText.trim()) {
    report("voiceover");
    try {
      const ttsRes = await serverFetch("/api/generate-tts", {
        method: "POST",
        body:   JSON.stringify({ script: scriptText, voice: ttsVoice, speed: 1.0 }),
      });
      if (ttsRes.ok) {
        const ttsData  = await ttsRes.json();
        const audioUrl = ttsData.url;
        const duration = await measureAudioDuration(audioUrl);
        beats    = syncBeatsToTTS(beats, duration);
        ttsAudio = { src: audioUrl, volume: 1, generated: true, voice: ttsVoice };
      }
    } catch (e) {
      console.warn("[TTS gen] failed:", e.message);
    }
  }

  /* ── 4. Music ── */
  const dbMusicLibrary = await loadMusicLibrary();
  const dbMood         = MUSIC_MOOD_MAP[musicMood] || "energetic";
  const autoMusic      = pickMusicByMood(dbMood, dbMusicLibrary);

  /* ── 5. Return ── */
  const dims = ORIENTATION_DIMS[orientation] || ORIENTATION_DIMS["9:16"];

  return {
    beats,
    rawScript: { topic, niche, palette, musicMood, beats: scriptBeats },
    meta: {
      fps:         25,
      mode,
      orientation,
      width:       dims.width,
      height:      dims.height,
      name:        topic,
      language,
      audience,
      tone:        detectedTone,
      brand:       {},
      brand_color: brandColor,
      palette,
    },
    audio: {
      tts:   ttsAudio,
      music: autoMusic?.src ? { src: autoMusic.src, volume: 0.12 } : null,
    },
    dna:      null,
    script:   { text: scriptText },
    overlays: [],
    workflow: { script_completed: true, beats_initialized: true },
  };
}
