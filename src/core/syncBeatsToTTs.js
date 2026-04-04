/**
 * syncBeatsToTTS.js
 * src/core/syncBeatsToTTS.js
 *
 * Adjusts beat durations to match TTS audio duration.
 * Distributes time proportionally based on word count per beat.
 */

import { calculateTimeline } from "./calculateTimeline";

function wordCount(text) {
  return (text || "").trim().split(/\s+/).filter(Boolean).length;
}

/**
 * Measure audio duration from a URL in the browser.
 */
export function measureAudioDuration(src) {
  return new Promise((resolve, reject) => {
    const audio = new window.Audio(src);
    audio.addEventListener("loadedmetadata", () => resolve(audio.duration));
    audio.addEventListener("error", reject);
    audio.load();
  });
}

/**
 * Sync beat durations to TTS duration.
 * @param {object[]} beats
 * @param {number}   ttsDuration  — total TTS audio duration in seconds
 * @returns {object[]} updated beats with new duration_sec/start_sec/end_sec
 */
export function syncBeatsToTTS(beats, ttsDuration) {
  if (!beats?.length || !ttsDuration) return beats;

  const totalWords = beats.reduce((sum, b) => sum + wordCount(b.spoken), 0);
  if (!totalWords) return beats;

  // Distribute TTS duration proportionally by word count
  const updatedBeats = beats.map(beat => {
    const words    = wordCount(beat.spoken);
    const fraction = words / totalWords;
    const duration = Number((fraction * ttsDuration).toFixed(1));
    return {
      ...beat,
      duration_sec: Math.max(1.0, duration), // minimum 1s per beat
    };
  });

  // Recalculate timeline with new durations
  const project = { beats: updatedBeats };
  return calculateTimeline(project).beats;
}