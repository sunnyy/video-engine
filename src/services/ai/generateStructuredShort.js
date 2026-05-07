/**
 * generateStructuredShort.js
 *
 * Main orchestrator for AI video generation.
 * New flow: generateScript → DNA → buildBeats → assets → TTS → music
 */

import { buildBeatsFromScript }   from "../../core/buildBeatsFromScript";
import { serverFetch }             from "../serverApi";
import { loadMusicLibrary, pickAutoMood, pickMusicByMood } from "../../core/registries/musicRegistry";
import { getLayoutDef, refreshCache } from "../../core/registries/layoutRegistry";
import { measureAudioDuration, syncBeatsToTTS } from "../../core/syncBeatsToTTs";
import { generateVideoDNA }        from "../../core/videoDNA";
import { autoMatchAssets }         from "../../core/assetAutoMatcher";
import { generateScript }          from "./generateScript";

const ORIENTATION_DIMS = {
  "9:16":  { width: 1080, height: 1920 },
  "16:9":  { width: 1920, height: 1080 },
  "1:1":   { width: 1080, height: 1080 },
  "4:5":   { width: 1080, height: 1350 },
};

export async function generateStructuredShort({
  topic,
  mode             = "faceless",
  orientation      = "9:16",
  generateImages   = false,
  generateTTS      = false,
  ttsVoice         = "female_warm",
  language         = "english",
  videoType        = "viral",
  context          = "",
  brandColor       = null,
  audience         = "general",
  tone             = "bold",
  projectId        = null,
  talkingHead      = null,
  onProgress       = null,
}) {
  const report = (step) => { if (onProgress) onProgress(step); };

  await refreshCache();

  let scriptBeats;
  let detectedNiche = null;
  let pattern       = "viral";
  let rawScript     = null; // raw GPT-4o output, preserved for storage

  /* ── Transcript path (Upload Video) ── */
  if (talkingHead?.type === "upload" && talkingHead.segments?.length) {
    report("transcript");

    const rawSegments = talkingHead.segments;
    const segmentsForPrompt = rawSegments.map(s => ({
      start: s.start,
      end:   s.end,
      text:  s.text?.trim() || "",
    }));

    let aiBeats = null;
    try {
      const beatRes = await serverFetch("/api/process-beats", {
        method: "POST",
        body:   JSON.stringify({ segments: segmentsForPrompt }),
      });
      if (beatRes.ok) {
        const beatData = await beatRes.json();
        if (Array.isArray(beatData.beats) && beatData.beats.length > 0) {
          aiBeats = beatData.beats;
        }
      }
    } catch (e) {
      console.warn("[transcript beats] call failed, using raw segments:", e.message);
    }

    if (!aiBeats) {
      const merged = [];
      let pending  = null;
      for (const seg of rawSegments) {
        if (!pending) {
          pending = { ...seg };
        } else {
          pending.text = (pending.text || "") + " " + (seg.text || "");
          pending.end  = seg.end;
        }
        const dur = (pending.end ?? 0) - (pending.start ?? 0);
        if (dur >= 2.0) { merged.push(pending); pending = null; }
      }
      if (pending) merged.push(pending);

      const total = merged.length;
      aiBeats = merged.map((seg, i) => {
        const pos = total <= 1 ? 0.5 : i / (total - 1);
        let intent, energy;
        if      (i === 0)         { intent = "curiosity"; energy = 0.8; }
        else if (i === total - 1) { intent = "urgency";   energy = 0.75; }
        else if (pos < 0.35)      { intent = "shock";       energy = 0.7; }
        else if (pos < 0.65)      { intent = "explanation"; energy = 0.5; }
        else                      { intent = "reveal";       energy = 0.6; }
        return {
          spoken: seg.text?.trim() || "",
          start_sec: seg.start ?? null,
          end_sec:   seg.end   ?? null,
          intent, energy,
          showAvatar: true,
          asset_hint: null,
        };
      });
    }

    const validIntentsSet = new Set(["shock","curiosity","proof","irony","reveal","empathy","urgency","explanation","contrast","punchline"]);
    scriptBeats = aiBeats
      .filter(b => b.spoken?.trim())
      .map((b, i) => ({
        order:          i,
        type:           "explanation",
        spoken:         b.spoken.trim(),
        intent:         validIntentsSet.has(b.intent) ? b.intent : "explanation",
        energy:         typeof b.energy === "number" ? Math.min(1, Math.max(0, b.energy)) : 0.5,
        display:        null,
        sub:            null,
        entity:         b.showAvatar === false && b.asset_hint?.visual_type === "entity" ? b.asset_hint.search_query : null,
        number:         null,
        stat:           null,
        label:          null,
        image_needed:   b.showAvatar === false,
        asset_prompt:   b.showAvatar === false && b.asset_hint?.prompt ? b.asset_hint.prompt : null,
        showAvatar:     b.showAvatar !== false,
        start_sec:      b.start_sec ?? null,
        end_sec:        b.end_sec   ?? null,
      }));
  } else {
    /* ── Standard path: one GPT-4o call ── */
    report("script");
    const result = await generateScript({ topic, niche: null, language, audience, tone });
    detectedNiche = result.niche || null;
    pattern       = result.pattern || "viral";
    scriptBeats   = result.beats.map((b, i) => ({ ...b, order: i }));
    rawScript     = { niche: result.niche, pattern: result.pattern, beats: result.beats };
    console.log("[pipeline] pattern:", pattern, "niche:", detectedNiche, "beats:", scriptBeats.length);
  }

  const avgEnergy = scriptBeats.length
    ? scriptBeats.reduce((s, b) => s + (b.energy ?? 0.6), 0) / scriptBeats.length
    : 0.7;

  const dna = generateVideoDNA({
    videoType,
    tone,
    niche:      detectedNiche || null,
    energy:     avgEnergy,
    brandColor: brandColor || null,
    language,
  });

  report("building");
  let beats = await buildBeatsFromScript({
    structuredBeats: scriptBeats,
    mode,
    videoType,
    orientation,
    language,
    topic,
    brandColor,
    audience,
    tone,
    assetSource: "none",
    dna,
    patternKey: pattern,
  });

  /* ── Asset generation: entity → search, image_needed → Fal.ai ── */
  if (generateImages) {
    report("images");
    beats = await autoMatchAssets(beats, orientation, {
      assetSource: "ai",
      topic,
      language,
      dna,
    });
  }

  /* ── TTS ── */
  const scriptText = scriptBeats.map(b => b.spoken).filter(Boolean).join(". ");
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

  /* ── Music ── */
  const dbMusicLibrary = await loadMusicLibrary();
  const autoMood       = pickAutoMood(videoType, tone);
  const autoMusic      = pickMusicByMood(autoMood, dbMusicLibrary);

  const dims = ORIENTATION_DIMS[orientation] || ORIENTATION_DIMS["9:16"];

  return {
    beats,
    rawScript,
    meta: {
      fps:         25,
      mode,
      orientation,
      width:       dims.width,
      height:      dims.height,
      name:        topic,
      language,
      audience,
      tone,
      brand:       {},
      brand_color: brandColor,
    },
    audio: {
      tts:   ttsAudio,
      music: autoMusic?.src ? { src: autoMusic.src, volume: 0.12 } : null,
    },
    dna,
    script: { text: scriptText },
    overlays: [],
    workflow: { script_completed: true, beats_initialized: true },
    talkingHead: talkingHead ? { type: talkingHead.type, videoFileName: talkingHead.videoFileName || null } : null,
  };
}
